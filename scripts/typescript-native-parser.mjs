import { createRequire } from 'node:module';
import path from 'node:path';
import { createVirtualFileSystem } from 'typescript/unstable/fs';
import { API } from 'typescript/unstable/sync';
import * as nativeAst from 'typescript/unstable/ast';

const VIRTUAL_ROOT = '/__tiangong_typescript_native_parser__';
const requireFromWorkingDirectory = createRequire(path.resolve(process.cwd(), 'package.json'));
const requireFromTypescriptPackage = createRequire(
  requireFromWorkingDirectory.resolve('typescript/package.json'),
);

let parserRuntime;
let apiStartCount = 0;
let parseCount = 0;

function createParserRuntime() {
  const fileSystem = createVirtualFileSystem({});
  const platformPackage = `@typescript/typescript-${process.platform}-${process.arch}`;
  const platformPackageJson = requireFromTypescriptPackage.resolve(
    `${platformPackage}/package.json`,
  );
  const executableName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
  const tsserverPath = path.join(path.dirname(platformPackageJson), 'lib', executableName);
  apiStartCount += 1;
  return {
    api: new API({ cwd: '/', fs: fileSystem, tsserverPath }),
    fileSystem,
    previousVirtualPath: undefined,
    sequence: 0,
  };
}

function getParserRuntime() {
  parserRuntime ??= createParserRuntime();
  return parserRuntime;
}

function extensionFor(fileName, scriptKind) {
  switch (scriptKind) {
    case nativeAst.ScriptKind.JSX:
      return '.jsx';
    case nativeAst.ScriptKind.TSX:
      return '.tsx';
    case nativeAst.ScriptKind.JSON:
      return '.json';
    case nativeAst.ScriptKind.JS:
      if (fileName.endsWith('.mjs')) return '.mjs';
      if (fileName.endsWith('.cjs')) return '.cjs';
      return '.js';
    case nativeAst.ScriptKind.TS:
      if (fileName.endsWith('.mts')) return '.mts';
      if (fileName.endsWith('.cts')) return '.cts';
      return '.ts';
    default: {
      const match = /(?:\.d)?\.(?:[cm]?[jt]sx?|json)$/u.exec(fileName);
      return match?.[0] ?? '.ts';
    }
  }
}

function materializeTree(node) {
  node.forEachChild(materializeTree);
}

function diagnosticMessage(diagnostic) {
  if (!diagnostic.messageChain?.length) return diagnostic.text;
  return {
    messageText: diagnostic.text,
    next: diagnostic.messageChain.map(diagnosticMessage),
  };
}

function normalizeDiagnostics(sourceFile, diagnostics) {
  return diagnostics.map((diagnostic) => ({
    category: diagnostic.category,
    code: diagnostic.code,
    file: sourceFile,
    length: Math.max(0, diagnostic.end - diagnostic.pos),
    messageText: diagnosticMessage(diagnostic),
    start: diagnostic.pos,
  }));
}

function parseWithNativeCompiler(fileName, sourceText, scriptKind) {
  const runtime = getParserRuntime();
  const virtualPath = `${VIRTUAL_ROOT}/source-${runtime.sequence}${extensionFor(
    fileName,
    scriptKind,
  )}`;
  runtime.sequence += 1;
  runtime.fileSystem.writeFile?.(virtualPath, sourceText);

  const previousVirtualPath = runtime.previousVirtualPath;
  if (previousVirtualPath) runtime.fileSystem.removeFile?.(previousVirtualPath);

  const snapshot = runtime.api.updateSnapshot({
    closeFiles: previousVirtualPath ? [previousVirtualPath] : undefined,
    fileChanges: {
      created: [virtualPath],
      deleted: previousVirtualPath ? [previousVirtualPath] : undefined,
    },
    openFiles: [virtualPath],
  });
  runtime.previousVirtualPath = virtualPath;

  try {
    const project = snapshot.getDefaultProjectForFile(virtualPath);
    const sourceFile = project?.program.getSourceFile(virtualPath);
    if (!project || !sourceFile) {
      throw new Error(`TypeScript 7 native parser did not create a source file for ${fileName}.`);
    }

    materializeTree(sourceFile);
    const parseDiagnostics = normalizeDiagnostics(
      sourceFile,
      project.program.getSyntacticDiagnostics(virtualPath),
    );
    Object.defineProperties(sourceFile, {
      fileName: { configurable: true, enumerable: true, value: fileName },
      parseDiagnostics: {
        configurable: true,
        enumerable: true,
        value: Object.freeze(parseDiagnostics),
      },
    });
    parseCount += 1;
    return sourceFile;
  } finally {
    snapshot.dispose();
  }
}

export function createSourceFile(
  fileName,
  sourceText,
  _languageVersion = nativeAst.ScriptTarget.Latest,
  _setParentNodes = true,
  scriptKind,
) {
  return parseWithNativeCompiler(fileName, sourceText, scriptKind);
}

export function parseJsonText(fileName, sourceText) {
  return parseWithNativeCompiler(fileName, sourceText, nativeAst.ScriptKind.JSON);
}

export function forEachChild(node, visitor, visitArray) {
  return node.forEachChild(visitor, visitArray);
}

export function flattenDiagnosticMessageText(messageText, newLine, indentation = 0) {
  if (typeof messageText === 'string') return messageText;
  if (!messageText || typeof messageText !== 'object') return String(messageText ?? '');

  const text =
    typeof messageText.messageText === 'string'
      ? messageText.messageText
      : typeof messageText.text === 'string'
        ? messageText.text
        : String(messageText.messageText ?? messageText.text ?? '');
  const next = Array.isArray(messageText.next)
    ? messageText.next
    : Array.isArray(messageText.messageChain)
      ? messageText.messageChain
      : [];
  if (next.length === 0) return text;

  const childIndentation = indentation + 2;
  const prefix = `${newLine}${' '.repeat(childIndentation)}`;
  return `${text}${next
    .map((child) => `${prefix}${flattenDiagnosticMessageText(child, newLine, childIndentation)}`)
    .join('')}`;
}

export function nativeParserStats() {
  return Object.freeze({ apiStartCount, parseCount });
}

const ts = Object.freeze({
  ...nativeAst,
  createSourceFile,
  flattenDiagnosticMessageText,
  forEachChild,
  isParameter: nativeAst.isParameterDeclaration,
  isStringLiteralLike: nativeAst.isStringLiteralLikeNode,
  isTypeAssertionExpression: nativeAst.isTypeAssertion,
  parseJsonText,
});

export default ts;
