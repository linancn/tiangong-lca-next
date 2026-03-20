import type {
  Classification,
  DataTabKey,
  LangTextEntry,
  ListPagination,
  ReferenceItem,
} from '@/services/general/data';
import { initVersion, langOptions } from '@/services/general/data';

describe('general data constants', () => {
  it('exposes the supported language options in stable order', () => {
    expect(langOptions).toEqual([
      { value: 'en', label: 'English' },
      { value: 'zh', label: '简体中文' },
    ]);
  });

  it('keeps the default initial version string stable', () => {
    expect(initVersion).toBe('01.01.000');
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
