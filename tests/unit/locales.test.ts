// @ts-nocheck

import enUS from '@/locales/en-US';
import zhCN from '@/locales/zh-CN';
import fs from 'fs';
import path from 'path';

const loadLeafLocaleModules = (locale: 'en-US' | 'zh-CN') => {
  const localeDir = path.join(process.cwd(), 'src', 'locales', locale);

  return fs
    .readdirSync(localeDir)
    .filter((fileName) => fileName.endsWith('.ts'))
    .map((fileName) => ({
      fileName,
      messages: require(path.join(localeDir, fileName)).default,
    }));
};

describe('locale bundles', () => {
  it('merges every English leaf locale module into the top-level bundle', () => {
    const englishLeafModules = loadLeafLocaleModules('en-US');

    englishLeafModules.forEach(({ fileName, messages }) => {
      expect(Object.keys(messages).length).toBeGreaterThan(0);
      expect(enUS).toMatchObject(messages);
      expect(enUS).toEqual(expect.objectContaining(messages));
      expect(fileName).toMatch(/\.ts$/);
    });

    expect(enUS['navBar.lang']).toBe('Languages');
    expect(enUS['app.pwa.offline']).toBe('You are offline now');
    expect(enUS['pages.team.info.title']).toBe('Team Name');
  });

  it('merges every Chinese leaf locale module into the top-level bundle', () => {
    const chineseLeafModules = loadLeafLocaleModules('zh-CN');

    chineseLeafModules.forEach(({ fileName, messages }) => {
      expect(Object.keys(messages).length).toBeGreaterThan(0);
      expect(zhCN).toMatchObject(messages);
      expect(zhCN).toEqual(expect.objectContaining(messages));
      expect(fileName).toMatch(/\.ts$/);
    });

    expect(zhCN['navBar.lang']).toBe('语言');
    expect(zhCN['app.pwa.offline']).toBe('当前处于离线状态');
    expect(zhCN['pages.team.info.title']).toBe('团队名称');
  });

  it('keeps shared runtime locale keys aligned between English and Chinese bundles', () => {
    const sharedKeys = [
      'app.pwa.offline',
      'app.pwa.serviceworker.updated',
      'app.pwa.serviceworker.updated.hint',
      'app.pwa.serviceworker.updated.ok',
      'app.pwa.serviceworker.updated.failed',
      'pages.team.info.title',
      'pages.team.info.description',
      'component.allTeams.form.title',
    ];

    sharedKeys.forEach((key) => {
      expect(enUS[key]).toBeDefined();
      expect(zhCN[key]).toBeDefined();
    });
  });
});
