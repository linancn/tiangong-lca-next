import enUS from '@/locales/en-US';
import zhCN from '@/locales/zh-CN';
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
  type SupportedBaselineLocale,
} from '../helpers/i18n/localeAudit';

const LOCALES: Record<SupportedBaselineLocale, LocaleMessages> = {
  'en-US': enUS as LocaleMessages,
  'zh-CN': zhCN as LocaleMessages,
};
const LOCALE_ENTRIES = Object.entries(LOCALES) as Array<[SupportedBaselineLocale, LocaleMessages]>;
const LOCALE_NAMES = Object.keys(LOCALES) as SupportedBaselineLocale[];

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
  localeTopology: Record<
    SupportedBaselineLocale,
    { moduleOrder: string[]; spreadOrderAligned: boolean }
  >;
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
    execFileSync(process.execPath, ['scripts/i18n/audit-locales.mjs', ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }),
  ) as AuditResult;

const sortedKeys = (messages: LocaleMessages): string[] => Object.keys(messages).sort();

const keyParityDiagnostics = (
  leftName: SupportedBaselineLocale,
  left: LocaleMessages,
  rightName: SupportedBaselineLocale,
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
    'en-US': loadLeafLocaleModules('en-US'),
    'zh-CN': loadLeafLocaleModules('zh-CN'),
  } satisfies Record<SupportedBaselineLocale, LeafLocaleModule[]>;
  const topLevelDirectKeys = {
    'en-US': readTopLevelDirectMessageKeys('en-US'),
    'zh-CN': readTopLevelDirectMessageKeys('zh-CN'),
  } satisfies Record<SupportedBaselineLocale, string[]>;

  it('keeps identical leaf topology and merges every leaf into each top-level bundle', () => {
    expect(leafModules['en-US'].map(({ fileName }) => fileName)).toEqual(
      leafModules['zh-CN'].map(({ fileName }) => fileName),
    );

    LOCALE_ENTRIES.forEach(([locale, bundle]) => {
      expect(findUnmergedLeafMessages(bundle, leafModules[locale])).toEqual([]);
      const declaredKeys = new Set([
        ...topLevelDirectKeys[locale],
        ...leafModules[locale].flatMap(({ messages }) => Object.keys(messages)),
      ]);
      expect(sortedKeys(bundle)).toEqual([...declaredKeys].sort());
    });
  });

  it('keeps exact key parity between the canonical source locales', () => {
    expect(keyParityDiagnostics('en-US', enUS, 'zh-CN', zhCN)).toEqual([]);
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
    const enMessages = LOCALES['en-US'];
    const zhMessages = LOCALES['zh-CN'];
    const mismatches = sortedKeys(enMessages)
      .filter(
        (key) =>
          serializeIcuArgumentSignature(enMessages[key]) !==
          serializeIcuArgumentSignature(zhMessages[key]),
      )
      .map(
        (key) =>
          `${key}: en-US [${serializeIcuArgumentSignature(enMessages[key])}] != zh-CN [${serializeIcuArgumentSignature(zhMessages[key])}]`,
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

describe('inactive German candidate leaf catalog', () => {
  const candidateLeafModules = loadLeafLocaleModules('de-DE');
  const canonicalLeafModules = loadLeafLocaleModules('en-US');

  it('loads every canonical leaf module without activating a runtime bundle', () => {
    expect(candidateLeafModules.map(({ fileName }) => fileName)).toEqual(
      canonicalLeafModules.map(({ fileName }) => fileName),
    );
    expect(fs.existsSync('src/locales/de-DE.ts')).toBe(false);
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
