#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const REPOSITORY = 'linancn/tiangong-lca-next';
const MANIFEST_PATH = 'contracts/supabase-consumer-manifest.v3.json';
const SCHEMA_PATH = 'contracts/supabase-consumer-manifest.v3.schema.json';
const SCHEMA_SHA256 = '005ee441bd44085c7f3c1c5d36134523bebb97fb6239d5b11db6fde144e2aabe';
const SOURCE_PATTERNS = [
  'config/**/*.{cjs,js,jsx,json,mjs,ts,tsx}',
  'electron/**/*.{cjs,js,jsx,json,mjs,ts,tsx}',
  'src/**/*.{cjs,js,jsx,json,mjs,ts,tsx}',
];
const AUDIT_TOOL_ALLOWLIST = [
  'scripts/supabase-consumer-manifest.cjs',
  'scripts/supabase-consumer-manifest.test.cjs',
];
const SOURCE_ROOTS = ['config', 'electron', 'src'];
const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.json', '.mjs', '.ts', '.tsx']);
const CORE_PUBLIC_RELATIONS = new Set([
  'contacts',
  'flowproperties',
  'flows',
  'ilcd',
  'lciamethods',
  'lifecyclemodels',
  'processes',
  'sources',
  'unitgroups',
]);
const LEGACY_PUBLIC_RELATIONS = new Set(['comments', 'reviews', 'roles', 'teams', 'users']);
const AUTH_METHODS = new Set([
  'exchangeCodeForSession',
  'getClaims',
  'getSession',
  'getUser',
  'reauthenticate',
  'refreshSession',
  'resetPasswordForEmail',
  'setSession',
  'signInWithOtp',
  'signInWithPassword',
  'signOut',
  'signUp',
  'updateUser',
]);
const STORAGE_METHODS = new Set([
  'copy',
  'createSignedUrl',
  'createSignedUrls',
  'download',
  'list',
  'move',
  'remove',
  'update',
  'upload',
]);
const REALTIME_METHODS = new Set([
  'channel',
  'on',
  'removeAllChannels',
  'removeChannel',
  'subscribe',
]);
const DATA_OPERATIONS = new Set(['delete', 'insert', 'select', 'update', 'upsert']);
const PLATFORM_PATH_RE = /\/(?:auth|functions|realtime|rest|storage)\/v1(?:\/|$)/;
const SUPABASE_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co(?:\/|$)/;
const ALLOWED_LITERAL_SUPABASE_ORIGINS = new Set(['qgzvkongdjqiiamzbbts.supabase.co']);

class ManifestError extends Error {}

function git(...args) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const result = spawnSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8',
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new ManifestError(`git ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }
  return result.stdout;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function canonicalBytes(value) {
  return `${canonical(value)}\n`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertFullCommit(commit, field = 'sourceTreeCommit') {
  if (!/^[0-9a-f]{40}$/.test(commit))
    throw new ManifestError(`${field} must be a lowercase full SHA`);
  const resolved = git('rev-parse', '--verify', `${commit}^{commit}`).trim();
  if (resolved !== commit) throw new ManifestError(`${field} is not an exact commit: ${commit}`);
}

function listTree(commit) {
  assertFullCommit(commit);
  const output = Buffer.from(git('ls-tree', '-r', '-z', commit), 'utf8');
  const entries = [];
  for (const record of output.toString('utf8').split('\0')) {
    if (!record) continue;
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/.exec(record);
    if (!match) throw new ManifestError(`invalid git tree record: ${record}`);
    const [, mode, type, blobOid, file] = match;
    if (!SOURCE_ROOTS.some((root) => file === root || file.startsWith(`${root}/`))) continue;
    if (!SOURCE_EXTENSIONS.has(path.posix.extname(file))) continue;
    if (!['100644', '100755'].includes(mode) || type !== 'blob') {
      throw new ManifestError(
        `governed source must be a regular blob: ${file} mode=${mode} type=${type}`,
      );
    }
    entries.push({ file, mode, type, blobOid });
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file));
}

function treeDigest(entries) {
  return sha256(
    canonicalBytes(entries.map(({ file, mode, type, blobOid }) => ({ file, mode, type, blobOid }))),
  );
}

function blob(commit, entry) {
  return git('cat-file', 'blob', entry.blobOid);
}

function exactDeliveryGuard(sourceTreeCommit, expectedDigest) {
  const deliveryHead = git('rev-parse', '--verify', 'HEAD^{commit}').trim();
  assertFullCommit(deliveryHead, 'deliveryHead');
  const ancestor = spawnSync(
    'git',
    ['-C', ROOT, 'merge-base', '--is-ancestor', sourceTreeCommit, deliveryHead],
    {
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
      ),
    },
  );
  if (ancestor.status !== 0)
    throw new ManifestError('sourceTreeCommit is not an ancestor of delivery HEAD');
  const source = listTree(sourceTreeCommit);
  const delivery = listTree(deliveryHead);
  const sourceDigest = treeDigest(source);
  const deliveryDigest = treeDigest(delivery);
  if (sourceDigest !== expectedDigest)
    throw new ManifestError('source governed-tree digest mismatch');
  if (deliveryDigest !== expectedDigest)
    throw new ManifestError('delivery governed-tree digest mismatch');
  if (canonical(source) !== canonical(delivery)) {
    const sourceMap = new Map(source.map((entry) => [entry.file, entry]));
    const deliveryMap = new Map(delivery.map((entry) => [entry.file, entry]));
    const added = delivery.filter(({ file }) => !sourceMap.has(file)).map(({ file }) => file);
    const deleted = source.filter(({ file }) => !deliveryMap.has(file)).map(({ file }) => file);
    const changed = source
      .filter(
        (entry) =>
          deliveryMap.has(entry.file) &&
          canonical(entry) !== canonical(deliveryMap.get(entry.file)),
      )
      .map(({ file }) => file);
    throw new ManifestError(
      `governed source drift: ${JSON.stringify({ added, deleted, changed })}`,
    );
  }
  return deliveryHead;
}

function scriptKind(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'))
    return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function propertyName(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text;
  }
  return null;
}

function receiver(expression) {
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression))
    return expression.expression;
  return null;
}

function normalizedText(node, sourceFile) {
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function literalValue(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function span(node, sourceFile) {
  const startOffset = node.getStart(sourceFile);
  const endOffset = node.getEnd();
  const start = sourceFile.getLineAndCharacterOfPosition(startOffset);
  const end = sourceFile.getLineAndCharacterOfPosition(endOffset);
  return {
    start: { line: start.line + 1, column: start.character + 1, offset: startOffset },
    end: { line: end.line + 1, column: end.character + 1, offset: endOffset },
  };
}

function chainText(node, sourceFile) {
  let cursor = node;
  while (
    cursor &&
    (ts.isCallExpression(cursor) ||
      ts.isPropertyAccessExpression(cursor) ||
      ts.isElementAccessExpression(cursor))
  ) {
    if (ts.isCallExpression(cursor)) cursor = cursor.expression;
    else cursor = cursor.expression;
  }
  return normalizedText(node, sourceFile);
}

function enclosingChainMethods(node) {
  const methods = [];
  let cursor = node;
  while (
    cursor.parent &&
    (ts.isPropertyAccessExpression(cursor.parent) ||
      ts.isElementAccessExpression(cursor.parent) ||
      ts.isCallExpression(cursor.parent))
  ) {
    cursor = cursor.parent;
    if (ts.isCallExpression(cursor)) {
      const name = propertyName(cursor.expression);
      if (name) methods.push(name);
    }
  }
  return methods;
}

function objectDescriptor(argument, sourceFile) {
  const literal = literalValue(argument);
  if (literal !== null) return { object: literal, expression: null, dynamic: false };
  if (!argument) return { object: '<none>', expression: null, dynamic: true };
  const expression = normalizedText(argument, sourceFile);
  return { object: `<dynamic:${expression}>`, expression, dynamic: true };
}

function profileFor(transport) {
  if (transport === 'raw-signed-fetch') return 'browser-signed-url-no-cookie';
  if (transport === 'supabase-auth') return 'browser-publishable-session-manager';
  if (transport === 'supabase-client') return 'browser-publishable-persisted-session';
  return 'browser-publishable-session';
}

function credentialFor(transport) {
  if (transport === 'raw-signed-fetch') return 'signed-url';
  if (transport === 'supabase-client') return 'publishable-key';
  return 'publishable-key+optional-user-session';
}

function aclFor({ schema, object, transport, operation }) {
  if (transport === 'supabase-auth')
    return {
      expectedRoles: ['anon', 'authenticated'],
      basis: 'supabase-auth-platform-contract',
      verified: false,
    };
  if (transport === 'storage' || transport === 'raw-signed-fetch')
    return {
      expectedRoles: ['authenticated'],
      basis: 'storage-policy-or-signed-url-pending-external-verification',
      verified: false,
    };
  if (transport === 'edge-function')
    return {
      expectedRoles: ['anon', 'authenticated'],
      basis: 'edge-runtime-authz-pending-joint-test',
      verified: false,
    };
  if (schema === 'public' && CORE_PUBLIC_RELATIONS.has(object))
    return {
      expectedRoles: ['anon', 'authenticated'],
      basis: 'core-public-read-contract-pending-external-verification',
      verified: false,
    };
  if (schema === 'public' && LEGACY_PUBLIC_RELATIONS.has(object))
    return {
      expectedRoles: ['authenticated'],
      basis: 'legacy-public-residue-pending-migration',
      verified: false,
    };
  if (operation === 'select')
    return {
      expectedRoles: ['anon', 'authenticated'],
      basis: 'consumer-observation-only',
      verified: false,
    };
  return { expectedRoles: ['authenticated'], basis: 'consumer-observation-only', verified: false };
}

function upstreamFor({ schema, object, transport, dynamic }) {
  if (transport === 'supabase-auth')
    return { owner: 'Supabase Auth', issue: null, status: 'platform-contract-pending-joint-test' };
  if (transport === 'storage' || transport === 'raw-signed-fetch')
    return {
      owner: 'Supabase Storage',
      issue: 'tiangong-lca/workspace#484',
      status: 'platform-contract-pending-joint-test',
    };
  if (transport === 'edge-function')
    return {
      owner: 'linancn/tiangong-lca-edge-functions',
      issue: 'linancn/tiangong-lca-edge-functions#250',
      status: 'pending-exact-edge-contract',
    };
  if (transport === 'supabase-client')
    return {
      owner: REPOSITORY,
      issue: 'linancn/tiangong-lca-next#753',
      status: 'candidate-client-profile',
    };
  if (dynamic)
    return {
      owner: 'tiangong-lca/database-engine',
      issue: 'tiangong-lca/database-engine#357',
      status: 'pending-dynamic-resolution',
    };
  if (schema === 'public' && CORE_PUBLIC_RELATIONS.has(object))
    return {
      owner: 'tiangong-lca/database-engine',
      issue: 'tiangong-lca/workspace#484',
      status: 'retained-public-core',
    };
  if (schema === 'public')
    return {
      owner: 'tiangong-lca/database-engine',
      issue: 'tiangong-lca/database-engine#357',
      status: 'public-residue-pending-consumer-cutover',
    };
  return {
    owner: 'tiangong-lca/database-engine',
    issue: 'tiangong-lca/database-engine#357',
    status: 'pending-exact-api-contract',
  };
}

function occurrence({
  file,
  node,
  sourceFile,
  operation,
  transport,
  schema,
  descriptor,
  signature,
  semantics,
}) {
  const location = span(node, sourceFile);
  const credential = credentialFor(transport);
  const executionProfile = profileFor(transport);
  const value = {
    file,
    span: location,
    operation,
    transport,
    credential,
    executionProfile,
    schema,
    object: descriptor.object,
    signature,
    acl: aclFor({ schema, object: descriptor.object, transport, operation }),
    semantics,
    upstream: upstreamFor({
      schema,
      object: descriptor.object,
      transport,
      dynamic: descriptor.dynamic,
    }),
  };
  value.id = `occ-${sha256(canonicalBytes(value)).slice(0, 24)}`;
  return value;
}

function schemaFromReceiver(text) {
  const matches = [...text.matchAll(/\.schema\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g)];
  if (matches.length) return matches[matches.length - 1][1];
  const dynamic = /\.schema\(\s*([^)]{1,160})\s*\)/.exec(text);
  return dynamic ? `<dynamic-schema:${dynamic[1].trim()}>` : 'public';
}

function operationForFrom(call) {
  const methods = enclosingChainMethods(call);
  return methods.find((method) => DATA_OPERATIONS.has(method)) || 'relation';
}

function verifyNoDetachedBypass(node, sourceFile, file) {
  if (!ts.isVariableDeclaration(node) || !node.initializer) return;
  const init = normalizedText(node.initializer, sourceFile);
  if (!/\bsupabase\b/.test(init)) return;
  if (ts.isObjectBindingPattern(node.name)) {
    const names = node.name.elements.map((element) =>
      element.propertyName
        ? element.propertyName.getText(sourceFile)
        : element.name.getText(sourceFile),
    );
    if (
      names.some((name) =>
        ['auth', 'channel', 'from', 'functions', 'rpc', 'schema', 'storage'].includes(name),
      )
    ) {
      throw new ManifestError(
        `detached/destructured Supabase capability is forbidden: ${file}:${span(node, sourceFile).start.line}`,
      );
    }
  }
  const directInitializer =
    ts.isPropertyAccessExpression(node.initializer) ||
    ts.isElementAccessExpression(node.initializer);
  const boundInitializer =
    ts.isCallExpression(node.initializer) && propertyName(node.initializer.expression) === 'bind';
  if (
    ts.isIdentifier(node.name) &&
    (directInitializer || boundInitializer) &&
    /\.(?:auth|channel|from|functions|rpc|schema|storage)(?:\b|\[)/.test(init)
  ) {
    throw new ManifestError(
      `detached Supabase helper is forbidden: ${file}:${span(node, sourceFile).start.line}`,
    );
  }
}

function deriveTypeScript(file, text) {
  if (/\b(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|service_role_key|serviceRoleKey)\b/.test(text)) {
    throw new ManifestError(
      `service-role credential reference is forbidden in governed browser source: ${file}`,
    );
  }
  for (const match of text.matchAll(/https:\/\/([a-z0-9-]+\.supabase\.co)(?:\/[^'"`\s]*)?/g)) {
    if (!ALLOWED_LITERAL_SUPABASE_ORIGINS.has(match[1]))
      throw new ManifestError(`unapproved literal Supabase origin host: ${match[1]}`);
  }
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const occurrences = [];
  const seenSpans = new Set();

  function add(item) {
    const key = `${item.file}:${item.span.start.offset}:${item.span.end.offset}`;
    if (seenSpans.has(key))
      throw new ManifestError(`one source span mapped more than once: ${key}`);
    seenSpans.add(key);
    occurrences.push(item);
  }

  function visit(node) {
    verifyNoDetachedBypass(node, sourceFile, file);
    if (ts.isCallExpression(node)) {
      const method = propertyName(node.expression);
      const recv = receiver(node.expression);
      const recvText = recv ? normalizedText(recv, sourceFile) : '';
      const fullText = chainText(node, sourceFile);
      const descriptor = objectDescriptor(node.arguments[0], sourceFile);

      if (ts.isIdentifier(node.expression) && node.expression.text === 'createClient') {
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: 'create-client',
            transport: 'supabase-client',
            schema: 'platform',
            descriptor: { object: 'supabase-js-browser-client', dynamic: false },
            signature: 'createClient(url,publishable-key,persisted-session-options)',
            semantics: 'browser client bootstrap; no service-role or server credential',
          }),
        );
      } else if (method === 'from' && /(?:\bsupabase\b|\.schema\()/.test(recvText)) {
        const isStorage = /\.storage\b/.test(recvText);
        const transport = isStorage ? 'storage' : 'postgrest';
        const schema = isStorage ? 'storage' : schemaFromReceiver(recvText);
        const operation = isStorage ? 'select-bucket' : operationForFrom(node);
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation,
            transport,
            schema,
            descriptor,
            signature: `${transport}:${schema}.${descriptor.object}:${operation}`,
            semantics: descriptor.dynamic
              ? 'dynamic surface retained as pending; exact expression is provenance-bound'
              : `${operation} ${schema}.${descriptor.object}`,
          }),
        );
      } else if (method === 'rpc' && /\bsupabase\b/.test(recvText)) {
        const schema = schemaFromReceiver(recvText);
        const argumentsShape = node.arguments[1]
          ? normalizedText(node.arguments[1], sourceFile)
          : '<no-arguments>';
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: 'call',
            transport: 'postgrest-rpc',
            schema,
            descriptor,
            signature: `routine:${schema}.${descriptor.object}(${argumentsShape})`,
            semantics: descriptor.dynamic
              ? 'dynamic routine retained as pending; exact expression is provenance-bound'
              : `call ${schema}.${descriptor.object}; consumer argument shape is source-bound`,
          }),
        );
      } else if (method === 'schema' && /\bsupabase\b/.test(recvText)) {
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: 'select-schema-profile',
            transport: 'postgrest-profile',
            schema: descriptor.object,
            descriptor,
            signature: `postgrest-profile:${descriptor.object}`,
            semantics: 'explicit PostgREST schema profile selection',
          }),
        );
      } else if (method === 'invoke' && /\.functions\b/.test(recvText)) {
        const optionsShape = node.arguments[1]
          ? normalizedText(node.arguments[1], sourceFile)
          : '<no-options>';
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: 'invoke',
            transport: 'edge-function',
            schema: 'functions',
            descriptor,
            signature: `edge-function:${descriptor.object}(${optionsShape})`,
            semantics: descriptor.dynamic
              ? 'dynamic Edge function retained as pending; exact expression is provenance-bound'
              : `invoke Edge function ${descriptor.object}; request options are source-bound`,
          }),
        );
      } else if (method && AUTH_METHODS.has(method) && /\.auth\b/.test(recvText)) {
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: method,
            transport: 'supabase-auth',
            schema: 'auth',
            descriptor: { object: method, dynamic: false },
            signature: `auth:${method}`,
            semantics: `Supabase Auth ${method}`,
          }),
        );
      } else if (method && STORAGE_METHODS.has(method) && /\.storage\b/.test(fullText)) {
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: method,
            transport: 'storage',
            schema: 'storage',
            descriptor,
            signature: `storage-object:${method}:${descriptor.object}`,
            semantics: `${method} object path; bucket selection is a separate exact occurrence`,
          }),
        );
      } else if (
        method &&
        REALTIME_METHODS.has(method) &&
        /\bsupabase\b|\.channel\(/.test(fullText)
      ) {
        add(
          occurrence({
            file,
            node,
            sourceFile,
            operation: method,
            transport: 'realtime',
            schema: 'realtime',
            descriptor,
            signature: `realtime:${method}:${descriptor.object}`,
            semantics: `${method} Realtime channel/publication consumer`,
          }),
        );
      } else if (ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
        const argumentText = descriptor.expression || descriptor.object;
        const literal = literalValue(node.arguments[0]);
        const isSigned = /signed|artifact|packageUrl|download\.signed/i.test(argumentText);
        const isPlatform =
          literal && (SUPABASE_ORIGIN_RE.test(literal) || PLATFORM_PATH_RE.test(literal));
        if (isSigned || isPlatform) {
          add(
            occurrence({
              file,
              node,
              sourceFile,
              operation: 'fetch',
              transport: 'raw-signed-fetch',
              schema: 'storage',
              descriptor,
              signature: `raw-fetch:${descriptor.object}`,
              semantics:
                'raw fetch of signed/backend-provided object URL; browser cookies omitted or URL capability-bound',
            }),
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return occurrences;
}

function deriveJson(file, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return [];
  }
  const occurrences = [];
  function visit(node, pointer = '') {
    if (
      typeof node === 'string' &&
      (SUPABASE_ORIGIN_RE.test(node) || PLATFORM_PATH_RE.test(node))
    ) {
      if (SUPABASE_ORIGIN_RE.test(node)) {
        const host = new URL(node).host;
        if (!ALLOWED_LITERAL_SUPABASE_ORIGINS.has(host))
          throw new ManifestError(`unapproved literal Supabase origin host: ${host}`);
      }
      const descriptor = { object: node, expression: null, dynamic: false };
      const pseudoSource = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.JSON,
        true,
        ts.ScriptKind.JSON,
      );
      const offset = text.indexOf(JSON.stringify(node));
      const fakeNode = {
        getStart: () => offset,
        getEnd: () => offset + JSON.stringify(node).length,
      };
      occurrences.push(
        occurrence({
          file,
          node: fakeNode,
          sourceFile: pseudoSource,
          operation: 'configure-origin-path',
          transport: 'supabase-platform-config',
          schema: 'platform',
          descriptor,
          signature: `platform-config:${pointer}:${node}`,
          semantics: 'configuration-only Supabase platform origin/path allowlist',
        }),
      );
    } else if (Array.isArray(node))
      node.forEach((item, index) => visit(item, `${pointer}/${index}`));
    else if (node && typeof node === 'object')
      Object.entries(node).forEach(([key, item]) => visit(item, `${pointer}/${key}`));
  }
  visit(value);
  return occurrences;
}

function derive(commit) {
  const entries = listTree(commit);
  const occurrences = [];
  for (const entry of entries) {
    const text = blob(commit, entry);
    if (entry.file.endsWith('.json')) occurrences.push(...deriveJson(entry.file, text));
    else occurrences.push(...deriveTypeScript(entry.file, text));
  }
  occurrences.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.span.start.offset - b.span.start.offset ||
      a.id.localeCompare(b.id),
  );
  const ids = new Set();
  const spans = new Set();
  for (const item of occurrences) {
    if (ids.has(item.id)) throw new ManifestError(`duplicate occurrence id: ${item.id}`);
    ids.add(item.id);
    const spanKey = `${item.file}:${item.span.start.offset}:${item.span.end.offset}`;
    if (spans.has(spanKey))
      throw new ManifestError(`global occurrence span is not exactly-once: ${spanKey}`);
    spans.add(spanKey);
  }
  return { entries, occurrences };
}

function counts(items, field) {
  return Object.fromEntries(
    [
      ...items
        .reduce((map, item) => map.set(item[field], (map.get(item[field]) || 0) + 1), new Map())
        .entries(),
    ].sort(([a], [b]) => a.localeCompare(b)),
  );
}

function buildManifest(sourceTreeCommit) {
  const { entries, occurrences } = derive(sourceTreeCommit);
  const publicResidue = occurrences
    .filter((item) => item.schema === 'public' && !CORE_PUBLIC_RELATIONS.has(item.object))
    .map((item) => item.id);
  const pendingConsumers = occurrences
    .filter(
      (item) =>
        item.upstream.status.startsWith('pending-') || item.upstream.status.includes('residue'),
    )
    .map((item) => item.id);
  return {
    $schema: './supabase-consumer-manifest.v3.schema.json',
    schema: 'tiangong.supabase-consumer-manifest.v3',
    version: 3,
    repository: REPOSITORY,
    baseCommit: sourceTreeCommit,
    sourceTreeCommit,
    authority: {
      status: 'candidate',
      authorizesConsumerZero: false,
      authorizesDatabaseFreeze: false,
      authorizesHostedMutation: false,
    },
    source: {
      derivation: 'typescript-ast-plus-json-git-tree-v3',
      pathPatterns: SOURCE_PATTERNS,
      deliveryGuard: 'exact-filtered-tree-entries-equal',
      auditToolPathAllowlist: AUDIT_TOOL_ALLOWLIST,
      governedSourceTreeSha256: treeDigest(entries),
      symlinkPolicy: 'reject',
      nonRegularFilePolicy: 'reject',
      setEquality: 'bidirectional-exact-global-exactly-once',
      manifestSelfReference: 'excluded-by-governed-source-roots',
      schemaPath: SCHEMA_PATH,
      schemaSha256: SCHEMA_SHA256,
    },
    executionProfiles: [
      {
        name: 'browser',
        credential: 'publishable-key+optional-user-session',
        status: 'observed-candidate',
      },
      { name: 'ssr', credential: 'none-observed', status: 'pending-external-confirmation' },
      {
        name: 'service-role',
        credential: 'forbidden-in-shipped-browser-source',
        status: 'candidate-static-assertion',
      },
    ],
    residue: {
      consumerZero: false,
      publicResidue,
      pendingConsumers,
      statement:
        'Candidate inventory only; public residue and pending consumers remain and no authorization is granted.',
    },
    summary: {
      occurrences: occurrences.length,
      byTransport: counts(occurrences, 'transport'),
      byCredential: counts(occurrences, 'credential'),
      bySchema: counts(occurrences, 'schema'),
    },
    occurrences,
  };
}

function readRegularFile(relativePath) {
  const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
  const stats = fs.lstatSync(fullPath);
  if (stats.isSymbolicLink() || !stats.isFile())
    throw new ManifestError(`${relativePath} must be a no-follow regular file`);
  return fs.readFileSync(fullPath, 'utf8');
}

function validateSchema(manifest) {
  const Ajv2020 = require('ajv/dist/2020').default;
  const schema = JSON.parse(readRegularFile(SCHEMA_PATH));
  if (sha256(readRegularFile(SCHEMA_PATH)) !== SCHEMA_SHA256)
    throw new ManifestError('canonical JSON Schema bytes drifted');
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (!validate(manifest))
    throw new ManifestError(`JSON Schema validation failed: ${ajv.errorsText(validate.errors)}`);
}

function verify(manifest) {
  if (
    manifest.repository !== REPOSITORY ||
    manifest.schema !== 'tiangong.supabase-consumer-manifest.v3' ||
    manifest.version !== 3
  ) {
    throw new ManifestError('manifest repository/schema/version mismatch');
  }
  if (manifest.baseCommit !== manifest.sourceTreeCommit)
    throw new ManifestError('baseCommit/sourceTreeCommit mismatch');
  if (
    canonical(manifest.authority) !==
    canonical({
      status: 'candidate',
      authorizesConsumerZero: false,
      authorizesDatabaseFreeze: false,
      authorizesHostedMutation: false,
    })
  ) {
    throw new ManifestError('manifest authority must remain non-authorizing candidate');
  }
  validateSchema(manifest);
  const expected = buildManifest(manifest.sourceTreeCommit);
  if (canonical(manifest.occurrences) !== canonical(expected.occurrences))
    throw new ManifestError(
      'occurrence set mismatch (missing, extra, duplicate, swapped, or forged occurrence)',
    );
  if (canonical(manifest.summary) !== canonical(expected.summary))
    throw new ManifestError('summary mismatch');
  if (canonical(manifest.residue) !== canonical(expected.residue))
    throw new ManifestError('residue/pending-consumer mismatch');
  if (canonical(manifest.source) !== canonical(expected.source))
    throw new ManifestError('source provenance mismatch');
  const deliveryHead = exactDeliveryGuard(
    manifest.sourceTreeCommit,
    manifest.source.governedSourceTreeSha256,
  );
  return deliveryHead;
}

function parseArgs(argv) {
  const options = { write: false, sourceCommit: null, manifest: MANIFEST_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--write') options.write = true;
    else if (value === '--source-commit') options.sourceCommit = argv[++index];
    else if (value === '--manifest') options.manifest = argv[++index];
    else throw new ManifestError(`unknown argument: ${value}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.write) {
    const commit = options.sourceCommit || git('rev-parse', '--verify', 'HEAD^{commit}').trim();
    assertFullCommit(commit);
    const manifest = buildManifest(commit);
    validateSchema(manifest);
    const outputPath = path.isAbsolute(options.manifest)
      ? options.manifest
      : path.join(ROOT, options.manifest);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(
      `${JSON.stringify({ action: 'write', manifest: options.manifest, sourceTreeCommit: commit, manifestSha256: sha256(`${JSON.stringify(manifest, null, 2)}\n`), governedSourceTreeSha256: manifest.source.governedSourceTreeSha256, summary: manifest.summary }, null, 2)}\n`,
    );
    return;
  }
  const manifest = JSON.parse(readRegularFile(options.manifest));
  const deliveryHead = verify(manifest);
  process.stdout.write(
    `${JSON.stringify({ action: 'verify', manifest: options.manifest, manifestSha256: sha256(readRegularFile(options.manifest)), sourceTreeCommit: manifest.sourceTreeCommit, deliveryHead, governedSourceTreeSha256: manifest.source.governedSourceTreeSha256, summary: manifest.summary, residue: { consumerZero: manifest.residue.consumerZero, publicResidue: manifest.residue.publicResidue.length, pendingConsumers: manifest.residue.pendingConsumers.length } }, null, 2)}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `supabase-consumer-manifest: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
