import { event, LANG_CHANGE_EVENT, setIntl } from '@@/plugin-locale/localeExports';
import { normalizeRuntimeLocale, rememberManualRuntimeLocale } from './runtimeLocale';

/**
 * Umi 4.7.9's public setLocale touches the localStorage getter even when its
 * persistence is disabled. This browser-only adapter uses the same provider
 * event and intl instance, without that unsafe storage boundary. Its private
 * generated exports are guarded by the installed-template compatibility test.
 */
export function selectBrowserRuntimeLocale(value: string): void {
  const locale = normalizeRuntimeLocale(value);
  if (!locale) return;
  rememberManualRuntimeLocale(locale);
  setIntl(locale);
  event.emit(LANG_CHANGE_EVENT, locale);
  window.dispatchEvent(new Event('languagechange'));
}
