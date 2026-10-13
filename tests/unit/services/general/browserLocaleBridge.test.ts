import fs from 'node:fs';
import path from 'node:path';

const mockEmit = jest.fn();
const mockSetIntl = jest.fn();
jest.mock('@@/plugin-locale/localeExports', () => ({
  event: { emit: (...args: unknown[]) => mockEmit(...args) },
  LANG_CHANGE_EVENT: 'language-change',
  setIntl: (...args: unknown[]) => mockSetIntl(...args),
}));
jest.mock('umi', () => ({ __esModule: true }));

import { selectBrowserRuntimeLocale } from '@/services/general/browserLocaleBridge';
import {
  MANUAL_LOCALE_STORAGE_KEY,
  resolveBrowserRuntimeLocale,
  UMI_LOCALE_STORAGE_KEY,
} from '@/services/general/runtimeLocale';

afterEach(() => {
  jest.restoreAllMocks();
  mockEmit.mockClear();
  mockSetIntl.mockClear();
  window.localStorage.clear();
});

it('guards the private bridge against the real installed Umi provider contract', () => {
  const maxPackage = require.resolve('@umijs/max/package.json');
  const pluginPackage = require.resolve('@umijs/plugins/package.json', {
    paths: [path.dirname(maxPackage)],
  });
  expect(JSON.parse(fs.readFileSync(pluginPackage, 'utf8')).version).toBe(
    JSON.parse(fs.readFileSync(maxPackage, 'utf8')).version,
  );
  const templateDirectory = path.join(path.dirname(pluginPackage), 'templates/locale');
  const exports = fs.readFileSync(path.join(templateDirectory, 'localeExports.tpl'), 'utf8');
  const provider = fs.readFileSync(path.join(templateDirectory, 'locale.tpl'), 'utf8');
  expect(exports).toContain('export const event = new EventEmitter()');
  expect(exports).toContain("export const LANG_CHANGE_EVENT = Symbol('LANG_CHANGE')");
  expect(exports).toContain('export const setIntl = (locale: string) => {');
  expect(exports).toContain('g_intl = getIntl(locale, true)');
  expect(provider).toContain('event.on(LANG_CHANGE_EVENT, handleLangChange)');
  expect(provider).toContain('setContainerIntl(getIntl(locale))');
});

it('rejects an unsupported choice without changing the provider or storing it', () => {
  selectBrowserRuntimeLocale('es-ES');
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockSetIntl).not.toHaveBeenCalled();
  expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBeNull();
});

it('updates the current document and supersedes a legacy choice before provider notification', () => {
  window.localStorage.setItem(UMI_LOCALE_STORAGE_KEY, 'zh-CN');
  const changed = jest.fn();
  window.addEventListener('languagechange', changed);
  mockEmit.mockImplementationOnce(() => {
    expect(resolveBrowserRuntimeLocale()).toBe('de-DE');
  });
  try {
    selectBrowserRuntimeLocale('de-AT');
    expect(mockSetIntl).toHaveBeenCalledWith('de-DE');
    expect(mockEmit).toHaveBeenCalledWith('language-change', 'de-DE');
    expect(window.localStorage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBe('de-DE');
    expect(window.localStorage.getItem(UMI_LOCALE_STORAGE_KEY)).toBe('zh-CN');
    expect(changed).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('languagechange', changed);
  }
});

it('changes locale safely when the localStorage getter itself throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('Storage denied', 'SecurityError');
    },
  });
  try {
    expect(() => selectBrowserRuntimeLocale('fr-CA')).not.toThrow();
    expect(mockSetIntl).toHaveBeenCalledWith('fr-FR');
    expect(mockEmit).toHaveBeenCalledWith('language-change', 'fr-FR');
    expect(resolveBrowserRuntimeLocale()).toBe('fr-FR');
  } finally {
    Object.defineProperty(window, 'localStorage', descriptor);
  }
});
