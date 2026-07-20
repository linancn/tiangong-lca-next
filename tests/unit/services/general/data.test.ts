import { CONTENT_LANGUAGE_OPTIONS } from '@/services/general/contentLanguageRegistry';
import type {
  Classification,
  DataTabKey,
  LangTextEntry,
  ListPagination,
  ReferenceItem,
} from '@/services/general/data';
import {
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  initVersion,
  syncLocaleMaterializedTableRequestEpochs,
} from '@/services/general/data';

describe('general data constants', () => {
  it('exposes the supported language options in stable order', () => {
    expect(CONTENT_LANGUAGE_OPTIONS).toEqual([
      { value: 'en', label: 'English' },
      { value: 'zh', label: '简体中文' },
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
    ]);
  });

  it('keeps the default initial version string stable', () => {
    expect(initVersion).toBe('01.01.000');
  });

  it.each([
    ['en', 'en'],
    ['zh-CN', 'zh'],
    ['de-DE', 'de'],
    ['fr-FR', 'fr'],
    ['unsupported-locale', 'en'],
    [undefined, 'en'],
  ] as const)('normalizes %s into content-aware table params', (value, expected) => {
    expect(getContentLanguageAwareTableParams(value)).toEqual({
      contentLanguage: expected,
    });
  });

  it('rejects A -> B -> A and same-language reverse-order results by request epoch', async () => {
    let currentLanguage = 'en';
    const currentLanguageRef = { current: currentLanguage };
    const requestEpochRef = { current: 0 };
    const resolvers: Array<(value: { data: string[]; success: boolean; total: number }) => void> =
      [];
    const request = (language: string) =>
      guardLocaleMaterializedTableRequest(
        language,
        () => currentLanguage,
        requestEpochRef,
        () =>
          new Promise<{ data: string[]; success: boolean; total: number }>((resolve) => {
            resolvers.push(resolve);
          }),
      );

    const firstEnglish = request('en');
    currentLanguage = 'fr';
    syncLocaleMaterializedTableRequestEpochs(currentLanguageRef, currentLanguage, [
      requestEpochRef,
    ]);
    const french = request('fr');
    currentLanguage = 'en';
    syncLocaleMaterializedTableRequestEpochs(currentLanguageRef, currentLanguage, [
      requestEpochRef,
    ]);
    const latestEnglish = request('en');

    resolvers[2]({ data: ['latest English row'], success: true, total: 1 });
    await expect(latestEnglish).resolves.toEqual({
      data: ['latest English row'],
      success: true,
      total: 1,
    });
    resolvers[0]({ data: ['first English row'], success: true, total: 1 });
    resolvers[1]({ data: ['French row'], success: true, total: 1 });
    await expect(firstEnglish).resolves.toEqual({ data: [], success: false, total: 1 });
    await expect(french).resolves.toEqual({ data: [], success: false, total: 1 });

    const olderSearch = request('en');
    const newerSearch = request('en');
    resolvers[4]({ data: ['newer search'], success: true, total: 1 });
    await expect(newerSearch).resolves.toEqual({
      data: ['newer search'],
      success: true,
      total: 1,
    });
    resolvers[3]({ data: ['older search'], success: true, total: 1 });
    await expect(olderSearch).resolves.toEqual({ data: [], success: false, total: 1 });
  });

  it('invalidates during render and exposes current-request state to side effects', async () => {
    let currentLanguage = 'en';
    const currentLanguageRef = { current: currentLanguage };
    const requestEpochRef = { current: 0 };
    let resolveRequest!: (value: { data: string[]; success: boolean; total: number }) => void;
    let isCurrentRequest!: () => boolean;
    const pendingResult = guardLocaleMaterializedTableRequest(
      'en',
      () => currentLanguage,
      requestEpochRef,
      (context) => {
        isCurrentRequest = context.isCurrentRequest;
        return new Promise<{ data: string[]; success: boolean; total: number }>((resolve) => {
          resolveRequest = resolve;
        });
      },
    );

    expect(isCurrentRequest()).toBe(true);
    currentLanguage = 'fr';
    syncLocaleMaterializedTableRequestEpochs(currentLanguageRef, currentLanguage, [
      requestEpochRef,
    ]);
    expect(isCurrentRequest()).toBe(false);
    resolveRequest({ data: ['stale English row'], success: true, total: 1 });
    await expect(pendingResult).resolves.toEqual({ data: [], success: false, total: 1 });
  });

  it('does not hide request errors', async () => {
    const requestEpochRef = { current: 0 };
    const failure = new Error('request failed');
    await expect(
      guardLocaleMaterializedTableRequest(
        'fr',
        () => 'fr',
        requestEpochRef,
        async () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);
  });

  it('supports shared pagination, reference, and classification shapes', () => {
    const pagination: ListPagination = {
      total: 42,
      pageSize: 20,
      current: 2,
    };
    const ref: ReferenceItem = {
      '@refObjectId': 'source-1',
      '@type': 'source data set',
      '@uri': '../sources/source-1.xml',
      '@version': '01.00.000',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Primary source' }],
    };
    const classification: Classification = {
      id: 'materials',
      value: 'Materials',
      label: 'Materials',
      children: [
        {
          id: 'steel',
          value: 'Steel',
          label: 'Steel',
          children: [],
        },
      ],
    };

    expect(pagination.current).toBe(2);
    expect(ref['@type']).toBe('source data set');
    expect(classification.children[0].label).toBe('Steel');
  });

  it('supports language entries and tab keys used across data pages', () => {
    const zhEntry: LangTextEntry = { '@xml:lang': 'zh', '#text': '中文' };
    const tabKey: DataTabKey = 'te';

    expect(zhEntry['#text']).toBe('中文');
    expect(tabKey).toBe('te');
  });
});
