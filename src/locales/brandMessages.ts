import { brandProfile, type BrandProfile } from '../../config/brandProfile';
import { DEFAULT_SERVICE_APP_LOCALE, normalizeSupportedAppLocale, type SupportedAppLocale } from '../services/general/localeRegistry';

// This presentation boundary deliberately excludes operator/legal copy, data
// source names, dashboard statistics, protocol identifiers and TIDAS attribution.
// Overrides are final plain text for these argument-free messages only.
const BRAND_MESSAGE_IDS = new Set(['pages.name', 'pages.login.title', 'pages.welcome', 'pages.card.description.3', 'pages.welcome.overview.intro', 'pages.welcome.overview.sections.internationalMethodology.title', 'pages.welcome.overview.sections.internationalMethodology.description', 'pages.welcome.overview.sections.ecosystemInteroperability.title', 'pages.welcome.overview.sections.ecosystemInteroperability.description', 'pages.welcome.overview.sections.architectureExtensibility.title', 'pages.welcome.overview.sections.architectureExtensibility.description', 'pages.welcome.overview.sections.modelingTraceability.title', 'pages.welcome.overview.sections.modelingTraceability.description', 'pages.welcome.overview.dataEcosystemSubtitle', 'pages.account.profile.fallbackName', 'pages.oauth.consent.return', 'pages.oauth.consent.description', 'pages.oauth.consent.scope.openid', 'pages.validationIssues.report.generated', 'pages.review.members.addError.notRegistered']);

const APPLICATION_NAME_SPANS: Record<SupportedAppLocale, string> = {
  'zh-CN': '天工LCA数据平台',
  'en-US': 'TianGong LCA Data Platform',
  'de-DE': 'TianGong LCA Data Platform',
  'fr-FR': 'TianGong LCA Data Platform',
};

const CARD_NAME_SPANS: Record<SupportedAppLocale, string> = {
  'zh-CN': '天工生命周期数据平台',
  'en-US': 'Tiangong LCA Data Platform',
  'de-DE': 'TianGong LCA-Datenplattform',
  'fr-FR': 'TianGong LCA Data Platform',
};

const IDENTITY_MESSAGE_IDS = new Set(['pages.account.profile.fallbackName', 'pages.oauth.consent.return', 'pages.oauth.consent.description', 'pages.oauth.consent.scope.openid', 'pages.validationIssues.report.generated', 'pages.review.members.addError.notRegistered']);

/** Resolve only reviewed application identity spans in localized presentation. */
export function resolveBrandMessage(locale: string | undefined, messageId: string, translatedText: string, profile: BrandProfile = brandProfile): string {
  if (!BRAND_MESSAGE_IDS.has(messageId)) {
    return translatedText;
  }
  const appLocale = normalizeSupportedAppLocale(locale) ?? DEFAULT_SERVICE_APP_LOCALE;
  if (messageId === 'pages.name' || messageId === 'pages.login.title') {
    return profile.title[appLocale];
  }
  if (messageId === 'pages.welcome') {
    return profile.slogan[appLocale];
  }
  const override = profile.messages[appLocale]?.[messageId];
  if (override !== undefined) {
    return override;
  }
  // Preserve the accepted TianGong catalogs byte-for-byte, including their
  // existing spacing/capitalization, rather than normalizing old copy.
  if (profile.id === 'tiangong') {
    return translatedText;
  }
  if (messageId === 'pages.welcome.overview.intro') {
    // Only the first application-name span changes; the later full TIDAS
    // specification name remains "TianGong LCA Data System (TIDAS)".
    return translatedText.replace(APPLICATION_NAME_SPANS[appLocale], profile.title[appLocale]);
  }
  if (messageId === 'pages.card.description.3') {
    return translatedText.replace(CARD_NAME_SPANS[appLocale], profile.title[appLocale]);
  }
  if (IDENTITY_MESSAGE_IDS.has(messageId)) {
    const originalName = appLocale === 'zh-CN' ? '天工' : 'TianGong';
    return translatedText.replace(originalName, profile.localizedName[appLocale]);
  }
  return translatedText;
}
