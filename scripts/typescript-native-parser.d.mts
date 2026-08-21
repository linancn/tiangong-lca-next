import type {
  Node,
  NodeArray,
  ScriptKind,
  ScriptTarget,
  SourceFile,
} from 'typescript/unstable/ast';
import * as nativeAst from 'typescript/unstable/ast';

export type { Expression, PropertyName } from 'typescript/unstable/ast';

export interface NativeDiagnosticMessageChain {
  readonly messageText: string;
  readonly next?: readonly NativeDiagnosticMessageChain[];
}

export interface NativeParseDiagnostic {
  readonly category: number;
  readonly code: number;
  readonly file: ParsedSourceFile;
  readonly length: number;
  readonly messageText: string | NativeDiagnosticMessageChain;
  readonly start: number;
}

export type ParsedSourceFile = SourceFile & {
  readonly parseDiagnostics: readonly NativeParseDiagnostic[];
};

export declare function createSourceFile(
  fileName: string,
  sourceText: string,
  languageVersion?: ScriptTarget,
  setParentNodes?: boolean,
  scriptKind?: ScriptKind,
): ParsedSourceFile;

export declare function parseJsonText(fileName: string, sourceText: string): ParsedSourceFile;

export declare function forEachChild<T>(
  node: Node,
  visitor: (node: Node) => T,
  visitArray?: (nodes: NodeArray<Node>) => T,
): T | undefined;

export declare function flattenDiagnosticMessageText(
  messageText: string | NativeDiagnosticMessageChain,
  newLine: string,
  indentation?: number,
): string;

export declare function nativeParserStats(): Readonly<{
  apiStartCount: number;
  parseCount: number;
}>;

declare const ts: typeof nativeAst & {
  readonly createSourceFile: typeof createSourceFile;
  readonly flattenDiagnosticMessageText: typeof flattenDiagnosticMessageText;
  readonly forEachChild: typeof forEachChild;
  readonly isParameter: typeof nativeAst.isParameterDeclaration;
  readonly isStringLiteralLike: typeof nativeAst.isStringLiteralLikeNode;
  readonly isTypeAssertionExpression: typeof nativeAst.isTypeAssertion;
  readonly parseJsonText: typeof parseJsonText;
};

export default ts;
