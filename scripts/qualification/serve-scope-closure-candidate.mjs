#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const port = Number(process.env.QUALIFICATION_APP_PORT);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('qualification candidate server requires a valid port');
}

const root = path.resolve('dist');
const attachmentNames = new Map([
  ['/qualification-download/closure_issue_manifest', 'scope-closure-manifest.json'],
  ['/qualification-download/closure_report_xlsx', 'scope-closure.xlsx'],
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const attachmentName = attachmentNames.get(pathname);
  if (attachmentName) {
    response.writeHead(200, {
      'content-disposition': `attachment; filename="${attachmentName}"`,
      'content-type': 'application/octet-stream',
    });
    response.end('qualification-download-bytes');
    return;
  }

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);
  if (
    !candidate.startsWith(`${root}${path.sep}`) ||
    !existsSync(candidate) ||
    !statSync(candidate).isFile()
  ) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200);
  createReadStream(candidate).pipe(response);
});

server.listen(port, '127.0.0.1');
