/**
 * Tests for classifications service API functions
 * Path: src/services/classifications/api.ts
 */

const mockGetCachedOrFetchClassificationFileData = jest.fn();
const mockResolveReferenceResource = jest.fn();

jest.mock('@/services/classifications/util', () => {
  const actual = jest.requireActual('@/services/classifications/util');
  return {
    __esModule: true,
    ...actual,
    getCachedOrFetchClassificationFileData: (...args: any[]) =>
      mockGetCachedOrFetchClassificationFileData(...args),
  };
});

jest.mock('@/services/referenceResources/resolver', () => {
  const actual = jest.requireActual('@/services/referenceResources/resolver');
  return {
    __esModule: true,
    ...actual,
    resolveReferenceResource: (...args: any[]) => mockResolveReferenceResource(...args),
  };
});

import {
  getILCDClassification,
  getILCDFlowCategorization,
  getILCDFlowCategorizationAll,
} from '@/services/classifications/api';
import { getReferenceResourceDefinition } from '@/services/referenceResources/manifest';

const referenceFile = (
  resourceId: 'cpc' | 'isic' | 'ilcd-classification' | 'ilcd-flow-categorization',
  language: 'en' | 'zh',
) => getReferenceResourceDefinition(resourceId).runtimeAssets[language]!.fileName;

const ISIC_EN_FILE = referenceFile('isic', 'en');
const ISIC_ZH_FILE = referenceFile('isic', 'zh');
const CPC_EN_FILE = referenceFile('cpc', 'en');
const CPC_ZH_FILE = referenceFile('cpc', 'zh');
const ILCD_EN_FILE = referenceFile('ilcd-classification', 'en');
const ILCD_ZH_FILE = referenceFile('ilcd-classification', 'zh');
const FLOW_EN_FILE = referenceFile('ilcd-flow-categorization', 'en');

describe('Classifications API (src/services/classifications/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const actual = jest.requireActual('@/services/referenceResources/resolver');
    mockResolveReferenceResource.mockReset();
    mockResolveReferenceResource.mockImplementation(actual.resolveReferenceResource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a failure payload when classification localization is explicitly missing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockResolveReferenceResource.mockReturnValue({
      status: 'missing',
      resourceId: 'isic',
      requestedLanguage: 'en',
      usedFallback: false,
      ownerIssue: '#634',
      diagnostic: 'ISIC English labels are unavailable.',
      baseAsset: {
        language: 'en',
        fileName: 'ISICClassification.min.json.gz',
      },
    });

    await expect(getILCDClassification('Process', 'en', ['all'])).resolves.toEqual({
      data: [],
      success: false,
    });
    expect(mockGetCachedOrFetchClassificationFileData).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ISIC English labels are unavailable.' }),
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('uses ISIC gzip classifications for Process in English', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValueOnce({
      CategorySystem: {
        categories: [
          {
            '@dataType': 'Process',
            category: [{ '@id': 'proc-1', '@name': 'Process Root' }],
          },
        ],
      },
    });

    const result = await getILCDClassification('Process', 'en', ['all']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenCalledWith(ISIC_EN_FILE);
    expect(result).toEqual({
      data: [{ id: 'proc-1', value: 'Process Root', label: 'Process Root', children: [] }],
      success: true,
    });
  });

  it('uses ISIC gzip classifications for Process-family zh requests and maps zh labels by id', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Process',
              category: [{ '@id': 'proc-1', '@name': 'Process Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': '过程',
              category: [{ '@id': 'proc-1', '@name': '过程根' }],
            },
          ],
        },
      });

    const result = await getILCDClassification('LifeCycleModel', 'zh', ['proc-1']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(1, ISIC_EN_FILE);
    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(2, ISIC_ZH_FILE);
    expect(result).toEqual({
      data: [{ id: 'proc-1', value: 'Process Root', label: '过程根', children: [] }],
      success: true,
    });
  });

  it('uses CPC gzip classifications for Flow in Chinese and maps labels from zh data', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Flow',
              category: [{ '@id': 'flow-1', '@name': 'Flow Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': '流',
              category: [{ '@id': 'flow-1', '@name': '流根' }],
            },
          ],
        },
      });

    const result = await getILCDClassification('Flow', 'zh', ['flow-1']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(1, CPC_EN_FILE);
    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(2, CPC_ZH_FILE);
    expect(result).toEqual({
      data: [{ id: 'flow-1', value: 'Flow Root', label: '流根', children: [] }],
      success: true,
    });
  });

  it('maps duplicate-id occurrences before filtering so the selected node keeps its matching localized label', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Flow',
              category: [
                { '@id': 'duplicate', '@name': 'First occurrence' },
                { '@id': 'duplicate', '@name': 'Second occurrence' },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': '流',
              category: [
                { '@id': 'duplicate', '@name': '第一个条目' },
                { '@id': 'duplicate', '@name': '第二个条目' },
              ],
            },
          ],
        },
      });

    const result = await getILCDClassification('Flow', 'zh', ['Second occurrence']);

    expect(result).toEqual({
      data: [
        {
          id: 'duplicate',
          value: 'Second occurrence',
          label: '第二个条目',
          children: [],
        },
      ],
      success: true,
    });
  });

  it('fails closed when the localized classification asset cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Flow',
              category: [{ '@id': 'flow-1', '@name': 'Flow Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce(null);

    const result = await getILCDClassification('Flow', 'zh', ['all']);

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(`Failed to load ILCD classification data from`),
      }),
    );
  });

  it('loads non-special classifications from the cached English file and filters nested matches', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: [
          {
            '@dataType': 'Contact',
            category: [
              {
                '@id': 'contact-root',
                '@name': 'Contact Root',
                category: [{ '@id': 'contact-leaf', '@name': 'Contact Leaf' }],
              },
            ],
          },
        ],
      },
    });

    const result = await getILCDClassification('Contact', 'en', ['contact-leaf']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenCalledWith(ILCD_EN_FILE);
    expect(result).toEqual({
      data: [
        {
          id: 'contact-root',
          value: 'Contact Root',
          label: 'Contact Root',
          children: [
            {
              id: 'contact-leaf',
              value: 'Contact Leaf',
              label: 'Contact Leaf',
              children: [],
            },
          ],
        },
      ],
      success: true,
    });
  });

  it('loads non-special classifications from a single cached group and returns all nodes', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          '@dataType': 'Source',
          category: {
            '@id': 'source-root',
            '@name': 'Source Root',
          },
        },
      },
    });

    const result = await getILCDClassification('Source', 'en', ['all']);

    expect(result).toEqual({
      data: [{ id: 'source-root', value: 'Source Root', label: 'Source Root', children: [] }],
      success: true,
    });
  });

  it('returns an empty classification list when generic filters normalize to nothing', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          '@dataType': 'Source',
          category: [{ '@id': 'source-root', '@name': 'Source Root' }],
        },
      },
    });

    const result = await getILCDClassification('Source', 'en', ['']);

    expect(result).toEqual({ data: [], success: true });
  });

  it('returns an empty classification list when generic category groups are missing', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: null,
      },
    });

    const result = await getILCDClassification('Source', 'en', ['all']);

    expect(result).toEqual({ data: [], success: true });
  });

  it('loads non-special classifications from English and Chinese files for zh requests', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'UnitGroup',
              category: [
                {
                  '@id': 'unit-root',
                  '@name': 'Unit Root',
                  category: [{ '@id': 'unit-leaf', '@name': 'Unit Leaf' }],
                },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': '单位组',
              category: [
                {
                  '@id': 'unit-root',
                  '@name': '单位根',
                  category: [{ '@id': 'unit-leaf', '@name': '单位叶' }],
                },
              ],
            },
          ],
        },
      });

    const result = await getILCDClassification('UnitGroup', 'zh', ['unit-root']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(1, ILCD_EN_FILE);
    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenNthCalledWith(2, ILCD_ZH_FILE);
    expect(result).toEqual({
      data: [
        {
          id: 'unit-root',
          value: 'Unit Root',
          label: '单位根',
          children: [
            {
              id: 'unit-leaf',
              value: 'Unit Leaf',
              label: '单位叶',
              children: [],
            },
          ],
        },
      ],
      success: true,
    });
  });

  it('falls back to the original category type for zh requests when no translated type mapping exists', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'CustomType',
              category: [{ '@id': 'custom-1', '@name': 'Custom Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'CustomType',
              category: [{ '@id': 'custom-1', '@name': '自定义根' }],
            },
          ],
        },
      });

    const result = await getILCDClassification('CustomType', 'zh', ['custom-1']);

    expect(result).toEqual({
      data: [{ id: 'custom-1', value: 'Custom Root', label: '自定义根', children: [] }],
      success: true,
    });
  });

  it('returns an empty failure payload when ISIC classification file data cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData.mockResolvedValueOnce(null);

    const result = await getILCDClassification('Process', 'zh', ['proc-1']);

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns an empty failure payload when classification file data cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue(null);

    const result = await getILCDClassification('Source', 'en', ['all']);

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('filters flow categorization nodes from cached files in English', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          category: [
            {
              '@id': 'elem-root',
              '@name': 'Emissions',
              category: [{ '@id': 'elem-leaf', '@name': 'Air' }],
            },
          ],
        },
      },
    });

    const result = await getILCDFlowCategorization('en', ['elem-leaf']);

    expect(mockGetCachedOrFetchClassificationFileData).toHaveBeenCalledWith(FLOW_EN_FILE);
    expect(result).toEqual({
      data: [
        {
          id: 'elem-root',
          value: 'Emissions',
          label: 'Emissions',
          children: [
            {
              id: 'elem-leaf',
              value: 'Air',
              label: 'Air',
              children: [],
            },
          ],
        },
      ],
      success: true,
    });
  });

  it('normalizes a single flow categorization node when all values are requested', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          category: {
            '@id': 'elem-root',
            '@name': 'Emissions',
          },
        },
      },
    });

    const result = await getILCDFlowCategorization('en', ['all']);

    expect(result).toEqual({
      data: [{ id: 'elem-root', value: 'Emissions', label: 'Emissions', children: [] }],
      success: true,
    });
  });

  it('returns an empty flow categorization list when nodes do not match any requested filters', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          category: [{ '@id': 'elem-root', '@name': 'Emissions' }],
        },
      },
    });

    const result = await getILCDFlowCategorization('en', ['missing']);

    expect(result).toEqual({ data: [], success: true });
  });

  it('returns an empty flow categorization list when the cached category payload is missing', async () => {
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue({
      CategorySystem: {
        categories: {
          category: null,
        },
      },
    });

    const result = await getILCDFlowCategorization('en', ['all']);

    expect(result).toEqual({ data: [], success: true });
  });

  it('returns a failure payload when the base flow categorization file cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData.mockResolvedValue(null);

    await expect(getILCDFlowCategorization('en', ['all'])).resolves.toEqual({
      data: [],
      success: false,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Failed to load ILCD flow categorization from ${FLOW_EN_FILE}`,
      }),
    );
  });

  it('returns a failure payload when flow categorization localization is explicitly missing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockResolveReferenceResource.mockReturnValue({
      status: 'missing',
      resourceId: 'ilcd-flow-categorization',
      requestedLanguage: 'en',
      usedFallback: false,
      ownerIssue: '#634',
      diagnostic: 'ILCD flow categorization English labels are unavailable.',
      baseAsset: {
        language: 'en',
        fileName: 'ILCDFlowCategorization.min.json.gz',
      },
    });

    await expect(getILCDFlowCategorization('en', ['all'])).resolves.toEqual({
      data: [],
      success: false,
    });
    expect(mockGetCachedOrFetchClassificationFileData).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'ILCD flow categorization English labels are unavailable.',
      }),
    );
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('loads Chinese flow categorization labels when requested', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': 'Emissions' }],
          },
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': '排放' }],
          },
        },
      });

    const result = await getILCDFlowCategorization('zh', ['all']);

    expect(result).toEqual({
      data: [{ id: 'elem-root', value: 'Emissions', label: '排放', children: [] }],
      success: true,
    });
  });

  it('fails closed when the localized flow categorization asset cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': 'Emissions' }],
          },
        },
      })
      .mockRejectedValueOnce(new Error('localized asset unavailable'));

    const result = await getILCDFlowCategorization('zh', ['all']);

    expect(result).toEqual({ data: [], success: false });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'localized asset unavailable',
      }),
    );
  });

  it('combines flow classification and elementary-flow categorization in getILCDFlowCategorizationAll', async () => {
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Flow',
              category: [{ '@id': 'flow-root', '@name': 'Flow Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': '流',
              category: [{ '@id': 'flow-root', '@name': '流根' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': 'Elementary Root' }],
          },
        },
      })
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': '基本流根' }],
          },
        },
      });

    const result = await getILCDFlowCategorizationAll('zh');

    expect(result).toEqual({
      data: {
        category: [{ id: 'flow-root', value: 'Flow Root', label: '流根', children: [] }],
        categoryElementaryFlow: [
          { id: 'elem-root', value: 'Elementary Root', label: '基本流根', children: [] },
        ],
      },
      success: true,
    });
  });

  it('propagates a localized resource failure from getILCDFlowCategorizationAll', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCachedOrFetchClassificationFileData
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: [
            {
              '@dataType': 'Flow',
              category: [{ '@id': 'flow-root', '@name': 'Flow Root' }],
            },
          ],
        },
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        CategorySystem: {
          categories: {
            category: [{ '@id': 'elem-root', '@name': 'Elementary Root' }],
          },
        },
      })
      .mockResolvedValueOnce(null);

    await expect(getILCDFlowCategorizationAll('zh')).resolves.toEqual({
      data: { category: [], categoryElementaryFlow: [] },
      success: false,
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
