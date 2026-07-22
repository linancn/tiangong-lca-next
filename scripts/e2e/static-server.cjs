#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function bundleDigest(root) {
  const digest = crypto.createHash('sha256');
  const visit = (directory, relativeDirectory = '') => {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        digest.update(`file\0${relativePath}\0`);
        digest.update(fs.readFileSync(absolutePath));
      } else {
        throw new Error(`Unsupported static bundle entry: ${relativePath}`);
      }
    }
  };
  visit(root);
  return digest.digest('hex');
}

function safeAssetPath(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = decoded.replace(/^\/+/, '');
  const resolvedRoot = fs.realpathSync(root);
  const candidate = path.resolve(resolvedRoot, relative || 'index.html');
  const boundary = `${resolvedRoot}${path.sep}`;
  if (candidate !== path.join(resolvedRoot, 'index.html') && !candidate.startsWith(boundary)) {
    return undefined;
  }
  if (fs.existsSync(candidate)) {
    const realCandidate = fs.realpathSync(candidate);
    if (
      realCandidate !== path.join(resolvedRoot, 'index.html') &&
      !realCandidate.startsWith(boundary)
    ) {
      return undefined;
    }
    return realCandidate;
  }
  return candidate;
}

function createStaticCandidateServer(options) {
  const root = path.resolve(options.root);
  const manifest = options.manifest;
  if (!fs.statSync(root).isDirectory() || !fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error(`Static candidate root is missing index.html: ${root}`);
  }
  const identity = {
    schemaVersion: 1,
    status: 'ready',
    candidateCommit: manifest.candidate.commit,
    candidateTree: manifest.candidate.tree,
    packageVersion: manifest.candidate.packageVersion,
    bundleSha256: bundleDigest(root),
    manifestSha256: sha256(options.manifestText || `${JSON.stringify(manifest)}\n`),
  };

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/__tiangong_e2e__/ready') {
      const body = `${JSON.stringify(identity)}\n`;
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
      return;
    }

    const requestedAsset = safeAssetPath(root, requestUrl.pathname);
    if (!requestedAsset) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Invalid path\n');
      return;
    }
    const asset =
      fs.existsSync(requestedAsset) && fs.statSync(requestedAsset).isFile()
        ? requestedAsset
        : path.join(root, 'index.html');
    const body = fs.readFileSync(asset);
    response.writeHead(200, {
      'cache-control': asset.endsWith('index.html')
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
      'content-length': body.length,
      'content-type':
        MIME_TYPES.get(path.extname(asset).toLowerCase()) || 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  return { identity, server };
}

async function main() {
  const root = path.resolve(process.env.E2E_STATIC_ROOT || path.join(process.cwd(), 'dist'));
  const manifestPath = path.resolve(
    process.env.E2E_CANDIDATE_MANIFEST_PATH || '/opt/tiangong-e2e/candidate-manifest.json',
  );
  const host = process.env.E2E_STATIC_HOST || '127.0.0.1';
  const port = Number(process.env.E2E_STATIC_PORT || '8000');
  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  const { identity, server } = createStaticCandidateServer({ manifest, manifestText, root });

  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.on('error', (error) => {
    process.stderr.write(`Static candidate server failed: ${error.message}\n`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    process.stderr.write(
      `Static candidate ready at http://${host}:${port} (${identity.bundleSha256.slice(0, 12)})\n`,
    );
  });
}

module.exports = { bundleDigest, createStaticCandidateServer, safeAssetPath, sha256 };

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Static candidate server failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
