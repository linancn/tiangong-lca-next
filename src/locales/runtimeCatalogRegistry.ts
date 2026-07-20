import deTeamMessages from '@/locales/de-DE/pages_teams';
import deValidatorMessages from '@/locales/de-DE/validator';
import enTeamMessages from '@/locales/en-US/pages_teams';
import enValidatorMessages from '@/locales/en-US/validator';
import frTeamMessages from '@/locales/fr-FR/pages_teams';
import frValidatorMessages from '@/locales/fr-FR/validator';
import zhTeamMessages from '@/locales/zh-CN/pages_teams';
import zhValidatorMessages from '@/locales/zh-CN/validator';
import { CANONICAL_SOURCE_APP_LOCALE, type SupportedAppLocale } from '@/services/general/localeRegistry';

type RuntimeMessageCatalog = Record<string, string>;

// Locale literals belong only in this catalog-composition layer. Business
// consumers resolve the typed registry and never branch on a language.
const TEAM_CATALOGS = {
  'zh-CN': zhTeamMessages,
  'en-US': enTeamMessages,
  'de-DE': deTeamMessages,
  'fr-FR': frTeamMessages,
} as const satisfies Record<SupportedAppLocale, RuntimeMessageCatalog>;

const VALIDATOR_CATALOGS = {
  'zh-CN': zhValidatorMessages,
  'en-US': enValidatorMessages,
  'de-DE': deValidatorMessages,
  'fr-FR': frValidatorMessages,
} as const satisfies Record<SupportedAppLocale, RuntimeMessageCatalog>;

const snapshotRuntimeCatalogs = (catalogs: Record<SupportedAppLocale, RuntimeMessageCatalog>): Record<SupportedAppLocale, RuntimeMessageCatalog> => Object.fromEntries(Object.entries(catalogs).map(([locale, catalog]) => [locale, Object.freeze({ ...catalog })])) as Record<SupportedAppLocale, RuntimeMessageCatalog>;

// Preserve the reviewed native catalog as the runtime fallback. This avoids a
// silent cross-language fallback if a mutable catalog object is damaged after
// startup, while a message absent from the reviewed catalog still fails closed.
const REVIEWED_TEAM_CATALOGS = snapshotRuntimeCatalogs(TEAM_CATALOGS);
const REVIEWED_VALIDATOR_CATALOGS = snapshotRuntimeCatalogs(VALIDATOR_CATALOGS);

export const getTeamMessageCatalog = (locale: SupportedAppLocale): RuntimeMessageCatalog => TEAM_CATALOGS[locale] ?? TEAM_CATALOGS[CANONICAL_SOURCE_APP_LOCALE];

export const getValidatorMessageCatalog = (locale: SupportedAppLocale): RuntimeMessageCatalog => VALIDATOR_CATALOGS[locale] ?? VALIDATOR_CATALOGS[CANONICAL_SOURCE_APP_LOCALE];

const getRuntimeMessage = (catalogs: Record<SupportedAppLocale, RuntimeMessageCatalog>, reviewedCatalogs: Record<SupportedAppLocale, RuntimeMessageCatalog>, locale: SupportedAppLocale, messageId: string, catalogName: 'team' | 'validator'): string => {
  const catalog = catalogs[locale] ?? catalogs[CANONICAL_SOURCE_APP_LOCALE];
  const reviewedCatalog = reviewedCatalogs[locale] ?? reviewedCatalogs[CANONICAL_SOURCE_APP_LOCALE];
  const message = catalog[messageId] ?? reviewedCatalog[messageId];
  if (!message) {
    throw new Error(`Missing required ${catalogName} runtime message: ${messageId}`);
  }
  return message;
};

export const getTeamMessage = (locale: SupportedAppLocale, messageId: string): string => getRuntimeMessage(TEAM_CATALOGS, REVIEWED_TEAM_CATALOGS, locale, messageId, 'team');

export const getValidatorMessage = (locale: SupportedAppLocale, messageId: string): string => {
  return getRuntimeMessage(VALIDATOR_CATALOGS, REVIEWED_VALIDATOR_CATALOGS, locale, messageId, 'validator');
};
