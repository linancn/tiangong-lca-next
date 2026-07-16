import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export type IcuArgumentType = 'number' | 'plural' | 'select' | 'simple';

export type IcuArgument = {
  name: string;
  type: IcuArgumentType;
};

export type IcuMessageAnalysis = {
  argumentSignature: IcuArgument[];
  arguments: IcuArgument[];
  ast: unknown[];
  placeholders: string[];
};

type IcuMessageParser = {
  analyzeIcuMessage: (message: string) => IcuMessageAnalysis;
  formatIcuMessage: (message: string, values?: Record<string, unknown>, locale?: string) => string;
  serializeIcuArgumentSignature: (message: string) => string;
};

// Keep audit tests on the exact parser used by the production audit command.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharedIcuParser = require('../../../scripts/i18n/icu-message-parser.cjs') as IcuMessageParser;

export type SupportedBaselineLocale = 'en-US' | 'zh-CN';
export type SupportedLeafLocale = SupportedBaselineLocale | 'de-DE';

export type LocaleMessages = Record<string, string>;

export type LeafLocaleModule = {
  fileName: string;
  messages: LocaleMessages;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertLocaleMessages = (value: unknown, source: string): LocaleMessages => {
  if (!isRecord(value)) {
    throw new Error(`${source} must export a message object`);
  }

  return value as LocaleMessages;
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }

  return expression;
};

const objectPropertyName = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return name.text;
  }

  return undefined;
};

export const loadLeafLocaleModules = (locale: SupportedLeafLocale): LeafLocaleModule[] => {
  const localeDir = path.join(process.cwd(), 'src', 'locales', locale);

  return fs
    .readdirSync(localeDir)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort()
    .map((fileName) => ({
      fileName,
      messages: assertLocaleMessages(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(path.join(localeDir, fileName)).default,
        `${locale}/${fileName}`,
      ),
    }));
};

export const readTopLevelDirectMessageKeys = (locale: SupportedBaselineLocale): string[] => {
  const filePath = path.join(process.cwd(), 'src', 'locales', `${locale}.ts`);
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const keys: string[] = [];

  sourceFile.forEachChild((node) => {
    if (!ts.isExportAssignment(node)) {
      return;
    }

    const expression = unwrapExpression(node.expression);
    if (!ts.isObjectLiteralExpression(expression)) {
      return;
    }

    expression.properties.forEach((property) => {
      if (!ts.isPropertyAssignment(property)) {
        return;
      }

      const key = objectPropertyName(property.name);
      if (key !== undefined) {
        keys.push(key);
      }
    });
  });

  return keys.sort();
};

export const listMessageOwners = (leafModules: LeafLocaleModule[]): Map<string, string[]> => {
  const owners = new Map<string, string[]>();

  leafModules.forEach(({ fileName, messages }) => {
    Object.keys(messages).forEach((key) => {
      owners.set(key, [...(owners.get(key) ?? []), fileName]);
    });
  });

  return owners;
};

export const findDuplicateOwners = (
  leafModules: LeafLocaleModule[],
  topLevelDirectKeys: string[] = [],
): string[] => {
  const owners = listMessageOwners(leafModules);
  topLevelDirectKeys.forEach((key) => {
    owners.set(key, [...(owners.get(key) ?? []), '<top-level>']);
  });

  return [...owners]
    .filter(([, owners]) => owners.length > 1)
    .map(([key, owners]) => `${key}: ${owners.join(', ')}`)
    .sort();
};

export const findUnmergedLeafMessages = (
  bundle: LocaleMessages,
  leafModules: LeafLocaleModule[],
): string[] =>
  leafModules
    .flatMap(({ fileName, messages }) =>
      Object.entries(messages)
        .filter(([key, value]) => bundle[key] !== value)
        .map(
          ([key, value]) =>
            `${fileName}: ${key} expected ${JSON.stringify(value)}, received ${JSON.stringify(bundle[key])}`,
        ),
    )
    .sort();

export const analyzeIcuMessage = (message: string): IcuMessageAnalysis =>
  sharedIcuParser.analyzeIcuMessage(message);

export const formatIcuMessage = (
  message: string,
  values: Record<string, unknown> = {},
  locale = 'en-US',
): string => sharedIcuParser.formatIcuMessage(message, values, locale);

export const serializeIcuArgumentSignature = (message: string): string =>
  sharedIcuParser.serializeIcuArgumentSignature(message);

/**
 * Returns raw occurrence counts while validating the complete supported ICU
 * grammar. Signature comparisons intentionally use unique name/type pairs so
 * translations may reorder arguments or repeat them in language-specific
 * branches without creating a false mismatch.
 */
export const extractPlaceholderCounts = (message: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { name } of analyzeIcuMessage(message).arguments) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
};

export const serializePlaceholderCounts = (message: string): string =>
  serializeIcuArgumentSignature(message);
