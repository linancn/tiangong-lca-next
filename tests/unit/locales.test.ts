import deDE from '@/locales/de-DE';
import enUS from '@/locales/en-US';
import frFR from '@/locales/fr-FR';
import zhCN from '@/locales/zh-CN';
import {
  CANONICAL_SOURCE_APP_LOCALE,
  SUPPORTED_APP_LOCALES,
  type SupportedAppLocale,
} from '@/services/general/localeRegistry';
import { execFileSync } from 'child_process';
import fs from 'fs';
import {
  findDuplicateOwners,
  findUnmergedLeafMessages,
  type LeafLocaleModule,
  loadLeafLocaleModules,
  type LocaleMessages,
  readTopLevelDirectMessageKeys,
  serializeIcuArgumentSignature,
} from '../helpers/i18n/localeAudit';

type ActiveLocale = SupportedAppLocale;

const LOCALES: Record<ActiveLocale, LocaleMessages> = {
  'zh-CN': zhCN as LocaleMessages,
  'en-US': enUS as LocaleMessages,
  'de-DE': deDE as LocaleMessages,
  'fr-FR': frFR as LocaleMessages,
};
const LOCALE_NAMES = [...SUPPORTED_APP_LOCALES];
const LOCALE_ENTRIES = LOCALE_NAMES.map((locale) => [locale, LOCALES[locale]] as const);

const EMPTY_MESSAGE_ALLOWLIST = ['pages.layouts.userLayout.title'];

type DynamicRegistry = {
  callsites: Array<{ family: string }>;
  families: Record<
    string,
    {
      keys: string[];
      unknownHandling:
        | { kind: 'closedWorld'; proof: string }
        | {
            keys: string[];
            kind: 'localizedRuntimeFallback';
            proof: string;
            status: string;
            strategy: string;
          };
    }
  >;
  schemaVersion: string;
};

type AuditSummary = {
  activeDynamicKeyCount: number;
  activeStaticKeyCount: number;
  canonicalCandidateKeyCount: number;
  reservedKeyCount: number;
  violationCount: number;
  violationCounts: { localeModuleDrift: number };
};

type AuditManifest = {
  localeTopology: Record<ActiveLocale, { moduleOrder: string[]; spreadOrderAligned: boolean }>;
  messages: Array<{
    category: 'active-dynamic' | 'active-static' | 'reserved';
    dynamicFamilies?: string[];
    id: string;
  }>;
};

type AuditResult = {
  staleManifest: boolean;
  summary: AuditSummary;
};

const DYNAMIC_REGISTRY_PATH = 'docs/plans/i18n-de-DE/dynamic-families.json';

const runAudit = (...args: string[]): AuditResult =>
  JSON.parse(
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/i18n/audit-locales.mjs', ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }),
  ) as AuditResult;

const sortedKeys = (messages: LocaleMessages): string[] => Object.keys(messages).sort();

const keyParityDiagnostics = (
  leftName: ActiveLocale,
  left: LocaleMessages,
  rightName: ActiveLocale,
  right: LocaleMessages,
): string[] => {
  const leftKeys = new Set(Object.keys(left));
  const rightKeys = new Set(Object.keys(right));
  return [
    ...[...leftKeys]
      .filter((key) => !rightKeys.has(key))
      .map((key) => `${key}: only in ${leftName}`),
    ...[...rightKeys]
      .filter((key) => !leftKeys.has(key))
      .map((key) => `${key}: only in ${rightName}`),
  ].sort();
};

describe('locale bundle baseline', () => {
  const leafModules = {
    'zh-CN': loadLeafLocaleModules('zh-CN'),
    'en-US': loadLeafLocaleModules('en-US'),
    'de-DE': loadLeafLocaleModules('de-DE'),
    'fr-FR': loadLeafLocaleModules('fr-FR'),
  } satisfies Record<ActiveLocale, LeafLocaleModule[]>;
  const topLevelDirectKeys = {
    'zh-CN': readTopLevelDirectMessageKeys('zh-CN'),
    'en-US': readTopLevelDirectMessageKeys('en-US'),
    'de-DE': readTopLevelDirectMessageKeys('de-DE'),
    'fr-FR': readTopLevelDirectMessageKeys('fr-FR'),
  } satisfies Record<ActiveLocale, string[]>;

  it('keeps identical leaf topology and merges every leaf into each top-level bundle', () => {
    const canonicalTopology = leafModules[CANONICAL_SOURCE_APP_LOCALE].map(
      ({ fileName }) => fileName,
    );
    LOCALE_NAMES.forEach((locale) => {
      expect(leafModules[locale].map(({ fileName }) => fileName)).toEqual(canonicalTopology);
    });

    LOCALE_ENTRIES.forEach(([locale, bundle]) => {
      expect(findUnmergedLeafMessages(bundle, leafModules[locale])).toEqual([]);
      const declaredKeys = new Set([
        ...topLevelDirectKeys[locale],
        ...leafModules[locale].flatMap(({ messages }) => Object.keys(messages)),
      ]);
      expect(sortedKeys(bundle)).toEqual([...declaredKeys].sort());
    });
  });

  it('keeps exact key parity between all active locales', () => {
    LOCALE_NAMES.filter((locale) => locale !== CANONICAL_SOURCE_APP_LOCALE).forEach((locale) => {
      expect(
        keyParityDiagnostics(
          CANONICAL_SOURCE_APP_LOCALE,
          LOCALES[CANONICAL_SOURCE_APP_LOCALE],
          locale,
          LOCALES[locale],
        ),
      ).toEqual([]);
    });
  });

  it('exports only strings and limits empty messages to the explicit allowlist', () => {
    LOCALE_ENTRIES.forEach(([locale, bundle]) => {
      const nonStrings = Object.entries(bundle)
        .filter(([, value]) => typeof value !== 'string')
        .map(([key, value]) => `${locale}:${key} is ${typeof value}`);
      const emptyKeys = Object.entries(bundle)
        .filter(([, value]) => value === '')
        .map(([key]) => key)
        .sort();

      expect(nonStrings).toEqual([]);
      expect(emptyKeys).toEqual(EMPTY_MESSAGE_ALLOWLIST);
    });
  });

  it('has one owner for every message key', () => {
    LOCALE_NAMES.forEach((locale) => {
      expect(findDuplicateOwners(leafModules[locale], topLevelDirectKeys[locale])).toEqual([]);
    });
  });

  it('keeps ICU argument names and types aligned', () => {
    const enMessages = LOCALES[CANONICAL_SOURCE_APP_LOCALE];
    const mismatches = LOCALE_NAMES.filter(
      (locale) => locale !== CANONICAL_SOURCE_APP_LOCALE,
    ).flatMap((locale) =>
      sortedKeys(enMessages)
        .filter(
          (key) =>
            serializeIcuArgumentSignature(enMessages[key]) !==
            serializeIcuArgumentSignature(LOCALES[locale][key]),
        )
        .map(
          (key) =>
            `${key}: en-US [${serializeIcuArgumentSignature(enMessages[key])}] != ${locale} [${serializeIcuArgumentSignature(LOCALES[locale][key])}]`,
        ),
    );
    expect(mismatches).toEqual([]);
  });

  it('keeps spread order aligned and partitions every candidate key exactly once', () => {
    const { summary } = runAudit('--mode', 'report');

    expect(summary.violationCounts.localeModuleDrift).toBe(0);
    expect(
      summary.activeStaticKeyCount + summary.activeDynamicKeyCount + summary.reservedKeyCount,
    ).toBe(summary.canonicalCandidateKeyCount);
  });

  it('enforces the checked-in authoritative message and dynamic-family inventory', () => {
    const registry = JSON.parse(fs.readFileSync(DYNAMIC_REGISTRY_PATH, 'utf8')) as DynamicRegistry;
    const familyNames = new Set(Object.keys(registry.families));

    expect(registry.schemaVersion).toBe('tiangong.i18n-dynamic-families.v1');
    expect(registry.callsites.length).toBeGreaterThan(0);
    expect(registry.callsites.every(({ family }) => familyNames.has(family))).toBe(true);
    expect(
      Object.values(registry.families).every(
        ({ unknownHandling }) =>
          (unknownHandling.kind === 'closedWorld' && unknownHandling.proof.length > 20) ||
          (unknownHandling.kind === 'localizedRuntimeFallback' &&
            unknownHandling.keys.length > 0 &&
            ['implemented', 'reserved-for-followup'].includes(unknownHandling.status) &&
            unknownHandling.strategy.length > 0 &&
            unknownHandling.proof.length > 20),
      ),
    ).toBe(true);

    const audit = runAudit('--mode', 'enforce', '--check');

    expect(audit.staleManifest).toBe(false);
    expect(audit.summary.violationCount).toBe(0);

    const manifest = JSON.parse(
      fs.readFileSync('docs/plans/i18n-de-DE/manifest.json', 'utf8'),
    ) as AuditManifest;
    expect(manifest.localeTopology['zh-CN'].moduleOrder).toEqual(
      manifest.localeTopology['en-US'].moduleOrder,
    );
    expect(manifest.localeTopology['de-DE'].moduleOrder).toEqual(
      manifest.localeTopology['en-US'].moduleOrder,
    );
    expect(manifest.localeTopology['fr-FR'].moduleOrder).toEqual(
      manifest.localeTopology['en-US'].moduleOrder,
    );
    expect(
      Object.values(manifest.localeTopology).every(({ spreadOrderAligned }) => spreadOrderAligned),
    ).toBe(true);

    const manifestCategoryCounts = manifest.messages.reduce(
      (counts, message) => {
        counts[message.category] += 1;
        return counts;
      },
      { 'active-static': 0, 'active-dynamic': 0, reserved: 0 },
    );
    expect(manifestCategoryCounts).toEqual({
      'active-static': audit.summary.activeStaticKeyCount,
      'active-dynamic': audit.summary.activeDynamicKeyCount,
      reserved: audit.summary.reservedKeyCount,
    });

    const messagesById = new Map(manifest.messages.map((message) => [message.id, message]));
    Object.entries(registry.families).forEach(([familyName, family]) => {
      family.keys.forEach((messageId) => {
        expect(messagesById.get(messageId)).toEqual(
          expect.objectContaining({
            category: 'active-dynamic',
            dynamicFamilies: expect.arrayContaining([familyName]),
          }),
        );
      });
    });
  });
});

describe.each(['de-DE', 'fr-FR'] as const)('active %s runtime catalog', (locale) => {
  const candidateLeafModules = loadLeafLocaleModules(locale);
  const canonicalLeafModules = loadLeafLocaleModules('en-US');

  it('loads every canonical leaf module through the single active runtime bundle', () => {
    expect(candidateLeafModules.map(({ fileName }) => fileName)).toEqual(
      canonicalLeafModules.map(({ fileName }) => fileName),
    );
    expect(fs.existsSync(`src/locales/${locale}.ts`)).toBe(true);
  });

  it('keeps complete string-key parity with the canonical English leaf catalog', () => {
    const candidateMessages = Object.assign(
      {},
      ...candidateLeafModules.map(({ messages }) => messages),
    ) as LocaleMessages;
    const canonicalLeafMessages = Object.assign(
      {},
      ...canonicalLeafModules.map(({ messages }) => messages),
    ) as LocaleMessages;

    expect(findDuplicateOwners(candidateLeafModules)).toEqual([]);
    expect(sortedKeys(candidateMessages)).toEqual(sortedKeys(canonicalLeafMessages));
    expect(Object.values(candidateMessages).every((message) => typeof message === 'string')).toBe(
      true,
    );
  });
});
