/**
 * Sources management workflow integration tests.
 * Coverage:
 * - src/pages/Sources/index.tsx
 * - src/pages/Sources/Components/create.tsx
 * - src/pages/Sources/Components/edit.tsx
 * - src/pages/Sources/Components/delete.tsx
 *
 * Journeys validated:
 * 1. Owner loads /mydata sources table (request invokes getSourceTableAll).
 * 2. Owner creates a source via SourceCreate drawer, observes success toast and table reload.
 * 3. Owner edits the created source via SourceEdit drawer, sees success feedback and refreshed list.
 * 4. Owner deletes the updated source via SourceDelete modal, verifying success toast and refreshed list.
 * 5. Owner searches sources, triggering getSourceTablePgroongaSearch and rendering search results.
 *
 * Services mocked:
 * - getSourceTableAll
 * - getSourceTablePgroongaSearch
 * - source_hybrid_search
 * - createSource
 * - updateSource
 * - deleteSource
 * - getSourceDetail
 */

import SourcesPage from '@/pages/Sources';
import userEvent from '@testing-library/user-event';
import { createMockTableResponse } from '../../helpers/testData';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';
jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/sources', search: '' });
  return umi.createUmiMock();
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-new-source'),
}));

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

const antdMessageMock = jest.requireMock('antd').message as Record<string, jest.Mock>;
const getMockAntdMessage = () => antdMessageMock;

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

jest.mock('@ant-design/pro-table', () => require('@/tests/mocks/proTable').createProTableMock());

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => {
    const { toText } = require('../../helpers/nodeToText');
    return (
      <button type='button' onClick={onClick}>
        {toText(tooltip) || 'button'}
      </button>
    );
  },
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <select onChange={(event) => onChange?.(event.target.value)}>
      <option value='all'>All</option>
      <option value='pending'>Pending</option>
    </select>
  ),
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([])}>
      import
    </button>
  ),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: () => <span>contribute</span>,
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <span>export</span>,
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view</button>,
}));

jest.mock('@/pages/Sources/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');

  const SourceFormMock = ({ onData, onTabChange, setFileList, setLoadFiles }: any) => {
    const context =
      React.useContext(__ProFormContext) ?? ({ values: {}, setFieldValue: () => {} } as any);

    React.useEffect(() => {
      onTabChange?.('sourceInformation');
    }, [onTabChange]);

    const values = context.values ?? {};
    const shortName = values?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? '';
    const citation = values?.sourceInformation?.dataSetInformation?.sourceCitation ?? '';
    const publicationType = values?.sourceInformation?.dataSetInformation?.publicationType ?? '';

    const updateField = (path: any[], value: any) => {
      context.setFieldValue?.(path, value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='source-short-name'>Short Name</label>
        <input
          id='source-short-name'
          value={shortName}
          onChange={(event) =>
            updateField(
              ['sourceInformation', 'dataSetInformation', 'common:shortName'],
              event.target.value,
            )
          }
        />
        <label htmlFor='source-citation'>Citation</label>
        <input
          id='source-citation'
          value={citation}
          onChange={(event) =>
            updateField(
              ['sourceInformation', 'dataSetInformation', 'sourceCitation'],
              event.target.value,
            )
          }
        />
        <label htmlFor='source-publication-type'>Publication Type</label>
        <input
          id='source-publication-type'
          value={publicationType}
          onChange={(event) =>
            updateField(
              ['sourceInformation', 'dataSetInformation', 'publicationType'],
              event.target.value,
            )
          }
        />
        <button
          type='button'
          onClick={() => {
            const file = {
              uid: '../sources/file-existing.pdf',
              name: 'file-existing.pdf',
              url: 'https://cdn/file-existing.pdf',
            };
            setFileList?.([file]);
            setLoadFiles?.([file]);
          }}
        >
          add-file
        </button>
      </div>
    );
  };

  return {
    __esModule: true,
    SourceForm: SourceFormMock,
  };
});

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceTableAll: jest.fn(),
  getSourceTablePgroongaSearch: jest.fn(),
  source_hybrid_search: jest.fn(),
  createSource: jest.fn(),
  updateSource: jest.fn(),
  deleteSource: jest.fn(),
  getSourceDetail: jest.fn(),
}));

const {
  getSourceTableAll: mockGetSourceTableAll,
  getSourceTablePgroongaSearch: mockGetSourceTablePgroongaSearch,
  source_hybrid_search: mockSourceHybridSearch,
  createSource: mockCreateSource,
  updateSource: mockUpdateSource,
  deleteSource: mockDeleteSource,
  getSourceDetail: mockGetSourceDetail,
} = jest.requireMock('@/services/sources/api');

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: jest.fn(() => 'my'),
  getLang: jest.fn(() => 'en'),
  getLangText: jest.fn((textArray: any[], lang: string) => {
    if (!Array.isArray(textArray)) return '';
    const match = textArray.find((item) => item?.['@xml:lang'] === lang);
    return match?.['#text'] ?? '';
  }),
  formatDateTime: jest.fn(() => '2024-01-10T00:00:00Z'),
}));

jest.mock('@/services/general/data', () => ({
  __esModule: true,
  initVersion: '01.00.000',
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getDataDetail: jest.fn(() => Promise.resolve({ data: {} })),
  getDataDetailById: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('@/services/sources/util', () => ({
  __esModule: true,
  genSourceFromData: jest.fn((dataset: any) => ({
    sourceInformation: {
      dataSetInformation: {
        'common:shortName':
          dataset?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? '',
        sourceCitation: dataset?.sourceInformation?.dataSetInformation?.sourceCitation ?? '',
        publicationType: dataset?.sourceInformation?.dataSetInformation?.publicationType ?? '',
        referenceToDigitalFile:
          dataset?.sourceInformation?.dataSetInformation?.referenceToDigitalFile ?? [],
      },
    },
    administrativeInformation: {
      dataEntryBy: {
        'common:timeStamp':
          dataset?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '',
      },
      publicationAndOwnership: {
        'common:dataSetVersion':
          dataset?.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
          '',
      },
    },
  })),
}));

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  getThumbFileUrls: jest.fn(async (references: any[] = []) =>
    (references ?? []).map((ref: any) => ({
      uid: ref?.['@uri'] ?? '../sources/file-existing.pdf',
      name: ref?.['@uri']?.split('/').pop() ?? 'file-existing.pdf',
      url: `https://cdn/${ref?.['@uri']?.split('/').pop() ?? 'file-existing.pdf'}`,
    })),
  ),
  removeFile: jest.fn(() => Promise.resolve({ error: null })),
  uploadFile: jest.fn(() => Promise.resolve({ error: null })),
  getBase64: jest.fn(() => Promise.resolve('data:image/png;base64,abc')),
  getOriginalFileUrl: jest.fn(() => Promise.resolve({ url: 'https://cdn/file-existing.pdf' })),
  isImage: jest.fn(() => true),
  FileType: Object,
}));

const { removeFile: mockRemoveFile } = jest.requireMock('@/services/supabase/storage');

jest.mock('@/services/supabase/key', () => ({
  __esModule: true,
  supabaseStorageBucket: 'sources',
}));

jest.mock('@/services/sources/data', () => ({
  __esModule: true,
  SourceDataSetObjectKeys: ['sourceInformation'],
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getDataTitle: jest.fn(() => 'My Data'),
  getAllVersionsColumns: jest.fn((columns: any) => columns),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: jest.fn().mockImplementation(() => ({
    findProblemNodes: () => [],
  })),
  checkData: jest.fn(),
  getErrRefTab: jest.fn(),
  getAllRefObj: jest.fn(() => []),
  getRefTableName: jest.fn((type: string) => {
    const tableDict: Record<string, string> = {
      'contact data set': 'contacts',
      'source data set': 'sources',
      'unit group data set': 'unitgroups',
      'flow property data set': 'flowproperties',
      'flow data set': 'flows',
      'process data set': 'processes',
      'lifeCycleModel data set': 'lifecyclemodels',
    };
    return tableDict[type];
  }),
}));

type SourceRow = {
  id: string;
  shortName: string;
  classification: string;
  publicationType: string;
  version: string;
  modifiedAt: string;
  teamId: string | null;
};

const existingSource: SourceRow = {
  id: 'source-existing',
  shortName: 'Existing Source',
  classification: 'Class A',
  publicationType: 'Article',
  version: '01.00.000',
  modifiedAt: '2024-01-01T00:00:00Z',
  teamId: 'team-1',
};

const createdSource: SourceRow = {
  id: 'source-created',
  shortName: 'New Source',
  classification: 'Class B',
  publicationType: 'Book',
  version: '01.00.000',
  modifiedAt: '2024-02-01T00:00:00Z',
  teamId: 'team-1',
};

const updatedSource: SourceRow = {
  ...createdSource,
  shortName: 'Updated Source',
  publicationType: 'Report',
};

const searchSource: SourceRow = {
  id: 'source-search',
  shortName: 'Search Result Source',
  classification: 'Class S',
  publicationType: 'Thesis',
  version: '01.00.000',
  modifiedAt: '2024-03-01T00:00:00Z',
  teamId: null,
};

describe('Sources workflow', () => {
  const renderSources = async () => {
    await act(async () => {
      renderWithProviders(<SourcesPage />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetSourceTableAll
      .mockResolvedValueOnce(createMockTableResponse([existingSource], 1, 1))
      .mockResolvedValueOnce(createMockTableResponse([existingSource, createdSource], 2, 1))
      .mockResolvedValueOnce(createMockTableResponse([existingSource, updatedSource], 2, 1))
      .mockResolvedValue(createMockTableResponse([existingSource], 1, 1));

    mockGetSourceTablePgroongaSearch.mockResolvedValue(
      createMockTableResponse([searchSource], 1, 1),
    );
    mockSourceHybridSearch.mockResolvedValue(createMockTableResponse([], 0, 1));

    mockCreateSource.mockResolvedValue({ data: [{ id: createdSource.id }] });
    mockUpdateSource.mockResolvedValue({ data: [{ rule_verification: true }] });
    mockDeleteSource.mockResolvedValue({ status: 204 });

    mockGetSourceDetail.mockImplementation(async (id: string) => {
      if (id === createdSource.id || id === updatedSource.id) {
        return {
          data: {
            json: {
              sourceDataSet: {
                sourceInformation: {
                  dataSetInformation: {
                    'common:shortName': createdSource.shortName,
                    sourceCitation: 'Initial Citation',
                    publicationType: createdSource.publicationType,
                    referenceToDigitalFile: [{ '@uri': '../sources/file-existing.pdf' }],
                  },
                },
                administrativeInformation: {
                  dataEntryBy: {
                    'common:timeStamp': '2024-02-01T00:00:00Z',
                  },
                  publicationAndOwnership: {
                    'common:dataSetVersion': createdSource.version,
                  },
                },
              },
            },
          },
        };
      }
      if (id === existingSource.id) {
        return {
          data: {
            json: {
              sourceDataSet: {
                sourceInformation: {
                  dataSetInformation: {
                    'common:shortName': existingSource.shortName,
                    sourceCitation: 'Existing Citation',
                    publicationType: existingSource.publicationType,
                    referenceToDigitalFile: [{ '@uri': '../sources/file-existing.pdf' }],
                  },
                },
                administrativeInformation: {
                  dataEntryBy: {
                    'common:timeStamp': '2024-01-01T00:00:00Z',
                  },
                  publicationAndOwnership: {
                    'common:dataSetVersion': existingSource.version,
                  },
                },
              },
            },
          },
        };
      }
      return { data: { json: {} } };
    });

    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('supports create, edit, delete, and search workflows', async () => {
    await renderSources();

    await waitFor(() => expect(mockGetSourceTableAll).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Existing Source')).toBeInTheDocument());

    const user = userEvent.setup();

    // Create
    const toolbar = screen.getByTestId('pro-table-toolbar');
    await user.click(within(toolbar).getByRole('button', { name: 'Create' }));

    const createDrawer = await screen.findByRole('dialog', { name: 'Create Source' });

    const shortNameInput = within(createDrawer).getByLabelText('Short Name');
    await user.clear(shortNameInput);
    await user.type(shortNameInput, 'New Source');

    const citationInput = within(createDrawer).getByLabelText('Citation');
    await user.clear(citationInput);
    await user.type(citationInput, 'New Citation 2024');

    const publicationInput = within(createDrawer).getByLabelText('Publication Type');
    await user.clear(publicationInput);
    await user.type(publicationInput, 'Book');

    await user.click(within(createDrawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreateSource).toHaveBeenCalledTimes(1));
    expect(mockCreateSource).toHaveBeenCalledWith(
      'uuid-new-source',
      expect.objectContaining({
        sourceInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'New Source',
            sourceCitation: 'New Citation 2024',
            publicationType: 'Book',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!'),
    );
    await waitFor(() => expect(mockGetSourceTableAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('New Source')).toBeInTheDocument());

    // Edit
    const createdRowKey = `${createdSource.id}-${createdSource.version}`;
    const newSourceRow = screen.getByTestId(`pro-table-row-${createdRowKey}`);
    const editButton = within(newSourceRow).getByRole('button', { name: 'Edit' });
    await user.click(editButton);

    const editDrawer = await screen.findByRole('dialog', { name: 'Edit Source' });

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(createdSource.id, createdSource.version),
    );

    const editShortName = within(editDrawer).getByDisplayValue('New Source');
    await user.clear(editShortName);
    await user.type(editShortName, 'Updated Source');

    const editPublication = within(editDrawer).getByDisplayValue('Book');
    await user.clear(editPublication);
    await user.type(editPublication, 'Report');

    await user.click(within(editDrawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalledTimes(1));
    expect(mockUpdateSource).toHaveBeenCalledWith(
      createdSource.id,
      createdSource.version,
      expect.objectContaining({
        sourceInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'Updated Source',
            publicationType: 'Report',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Saved Successfully!'),
    );
    await waitFor(() => expect(mockGetSourceTableAll).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByText('Updated Source')).toBeInTheDocument());

    // Delete
    const updatedRow = screen.getByTestId(`pro-table-row-${createdRowKey}`);
    const deleteButton = within(updatedRow).getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);

    const confirmModal = await screen.findByRole('dialog', { name: 'Delete' });
    await user.click(within(confirmModal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockRemoveFile).toHaveBeenCalledWith(['file-existing.pdf']));
    await waitFor(() =>
      expect(mockDeleteSource).toHaveBeenCalledWith(createdSource.id, createdSource.version),
    );
    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith(
        'Selected record has been deleted.',
      ),
    );
    await waitFor(() => expect(mockGetSourceTableAll).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.queryByText('Updated Source')).not.toBeInTheDocument());

    // Search
    const searchContainer = screen.getByTestId('search-input');
    const searchInput = within(searchContainer).getByPlaceholderText('pages.search.keyWord');
    await user.type(searchInput, 'Search Source');
    await user.click(within(searchContainer).getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalled());
    const lastSearchCall =
      mockGetSourceTablePgroongaSearch.mock.calls[
        mockGetSourceTablePgroongaSearch.mock.calls.length - 1
      ];
    expect(lastSearchCall).toEqual([
      expect.objectContaining({ current: 1, pageSize: 10 }),
      'en',
      'my',
      'Search Source',
      {},
      'all',
    ]);

    await waitFor(() => expect(screen.getByText('Search Result Source')).toBeInTheDocument());
  });
});
