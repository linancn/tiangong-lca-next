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

export const getTeamMessageCatalog = (locale: SupportedAppLocale): RuntimeMessageCatalog => TEAM_CATALOGS[locale] ?? TEAM_CATALOGS[CANONICAL_SOURCE_APP_LOCALE];

export const getValidatorMessageCatalog = (locale: SupportedAppLocale): RuntimeMessageCatalog => VALIDATOR_CATALOGS[locale] ?? VALIDATOR_CATALOGS[CANONICAL_SOURCE_APP_LOCALE];

export const getTeamMessage = (locale: SupportedAppLocale, messageId: string): string => {
  const message = getTeamMessageCatalog(locale)[messageId] ?? getTeamMessageCatalog(CANONICAL_SOURCE_APP_LOCALE)[messageId];
  if (!message) {
    throw new Error(`Missing required team runtime message: ${messageId}`);
  }
  return message;
};

export const getValidatorMessage = (locale: SupportedAppLocale, messageId: string): string => {
  const message = getValidatorMessageCatalog(locale)[messageId] ?? getValidatorMessageCatalog(CANONICAL_SOURCE_APP_LOCALE)[messageId];
  if (!message) {
    throw new Error(`Missing required validator runtime message: ${messageId}`);
  }
  return message;
};
