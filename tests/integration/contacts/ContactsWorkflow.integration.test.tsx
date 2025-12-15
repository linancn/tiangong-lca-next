/**
 * Contacts management workflow integration tests.
 * Coverage:
 * - src/pages/Contacts/index.tsx
 * - src/pages/Contacts/Components/create.tsx
 * - src/pages/Contacts/Components/edit.tsx
 * - src/pages/Contacts/Components/delete.tsx
 *
 * Journeys validated:
 * 1. Owner loads /mydata contacts table (ProTable request invokes getContactTableAll).
 * 2. Owner creates a contact via ContactCreate drawer, observes success toast and table reload.
 * 3. Owner edits the newly created contact, sees success feedback and refreshed list.
 * 4. Owner deletes the edited contact, verifying success toast and refreshed list.
 * 5. Owner searches contacts, triggering getContactTablePgroongaSearch and rendering search results.
 *
 * Services mocked:
 * - getContactTableAll
 * - getContactTablePgroongaSearch
 * - createContact
 * - updateContact
 * - deleteContact
 * - getContactDetail
 */

import ContactsPage from '@/pages/Contacts';
import userEvent from '@testing-library/user-event';
import { createMockTableResponse } from '../../helpers/testData';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';
jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/contacts', search: '' });
  return umi.createUmiMock();
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-new-contact'),
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

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view</button>,
}));

jest.mock('@/pages/Contacts/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');

  const ContactFormMock = ({ onData, onTabChange }: any) => {
    const context = React.useContext(__ProFormContext) ?? {
      values: {},
      setFieldValue: () => {},
    };

    React.useEffect(() => {
      onTabChange?.('contactInformation');
    }, [onTabChange]);

    React.useEffect(() => {
      onData?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const values = context.values ?? {};
    const shortName = values?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '';
    const email = values?.contactInformation?.dataSetInformation?.email ?? '';

    const updateField = (path: any[], value: any) => {
      context.setFieldValue?.(path, value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='contact-short-name'>Short Name</label>
        <input
          id='contact-short-name'
          value={shortName}
          onChange={(event) =>
            updateField(
              ['contactInformation', 'dataSetInformation', 'common:shortName'],
              event.target.value,
            )
          }
        />
        <label htmlFor='contact-email'>Email</label>
        <input
          id='contact-email'
          value={email}
          onChange={(event) =>
            updateField(['contactInformation', 'dataSetInformation', 'email'], event.target.value)
          }
        />
      </div>
    );
  };

  return {
    __esModule: true,
    ContactForm: ContactFormMock,
  };
});

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactTableAll: jest.fn(),
  getContactTablePgroongaSearch: jest.fn(),
  contact_hybrid_search: jest.fn(),
  createContact: jest.fn(),
  updateContact: jest.fn(),
  deleteContact: jest.fn(),
  getContactDetail: jest.fn(),
}));

const {
  getContactTableAll: mockGetContactTableAll,
  getContactTablePgroongaSearch: mockGetContactTablePgroongaSearch,
  createContact: mockCreateContact,
  updateContact: mockUpdateContact,
  deleteContact: mockDeleteContact,
  getContactDetail: mockGetContactDetail,
} = jest.requireMock('@/services/contacts/api');

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({ data: [] })),
  contributeSource: jest.fn(),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: jest.fn((dataset: any) => ({
    contactInformation: {
      dataSetInformation: {
        'common:shortName':
          dataset?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '',
        email: dataset?.contactInformation?.dataSetInformation?.email ?? '',
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

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: jest.fn().mockImplementation(() => ({
    findProblemNodes: () => [],
  })),
  checkData: jest.fn(),
  getErrRefTab: jest.fn(),
}));

type ContactRow = {
  id: string;
  shortName: string;
  name: string;
  classification: string;
  email: string;
  version: string;
  modifiedAt: string;
  teamId: string | null;
};

const existingContact: ContactRow = {
  id: 'contact-1',
  shortName: 'Existing Contact',
  name: 'Existing Contact Name',
  classification: 'Class A',
  email: 'existing@example.com',
  version: '01.00.000',
  modifiedAt: '2024-01-01T00:00:00Z',
  teamId: 'team-1',
};

const createdContact: ContactRow = {
  id: 'contact-2',
  shortName: 'New Contact',
  name: 'New Contact Name',
  classification: 'Class B',
  email: 'new@example.com',
  version: '01.00.000',
  modifiedAt: '2024-02-01T00:00:00Z',
  teamId: 'team-1',
};

const updatedContact: ContactRow = {
  ...createdContact,
  shortName: 'Updated Contact',
  email: 'updated@example.com',
};

const searchContact: ContactRow = {
  id: 'contact-3',
  shortName: 'Search Result Contact',
  name: 'Search Contact Name',
  classification: 'Class S',
  email: 'search@example.com',
  version: '01.00.000',
  modifiedAt: '2024-03-01T00:00:00Z',
  teamId: null,
};

describe('Contacts workflow', () => {
  const renderContacts = async () => {
    await act(async () => {
      renderWithProviders(<ContactsPage />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetContactTableAll
      .mockResolvedValueOnce(createMockTableResponse([existingContact], 1, 1))
      .mockResolvedValueOnce(createMockTableResponse([existingContact, createdContact], 2, 1))
      .mockResolvedValueOnce(createMockTableResponse([existingContact, updatedContact], 2, 1))
      .mockResolvedValue(createMockTableResponse([existingContact], 1, 1));

    mockGetContactTablePgroongaSearch.mockResolvedValue(
      createMockTableResponse([searchContact], 1, 1),
    );

    mockCreateContact.mockResolvedValue({ data: [{ id: createdContact.id }] });
    mockUpdateContact.mockResolvedValue({ data: [{ rule_verification: true }] });
    mockDeleteContact.mockResolvedValue({ status: 204 });

    mockGetContactDetail.mockImplementation(async (id: string) => {
      if (id === createdContact.id) {
        return {
          data: {
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': createdContact.shortName,
                    email: createdContact.email,
                  },
                },
                administrativeInformation: {
                  dataEntryBy: {
                    'common:timeStamp': '2024-02-01T00:00:00Z',
                  },
                  publicationAndOwnership: {
                    'common:dataSetVersion': createdContact.version,
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
    await renderContacts();

    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Existing Contact')).toBeInTheDocument());

    const user = userEvent.setup();

    // Create
    const toolbar = screen.getByTestId('pro-table-toolbar');
    await user.click(within(toolbar).getByRole('button', { name: 'Create' }));

    const createDrawer = await screen.findByRole('dialog', { name: 'Create Contact' });

    const shortNameInput = within(createDrawer).getByLabelText('Short Name');
    await user.clear(shortNameInput);
    await user.type(shortNameInput, 'New Contact');

    const emailInput = within(createDrawer).getByLabelText('Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');

    await user.click(within(createDrawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreateContact).toHaveBeenCalledTimes(1));
    expect(mockCreateContact).toHaveBeenCalledWith(
      'uuid-new-contact',
      expect.objectContaining({
        contactInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'New Contact',
            email: 'new@example.com',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!'),
    );
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('New Contact')).toBeInTheDocument());

    // Edit
    const newContactRow = screen.getByTestId(new RegExp(`^pro-table-row-${createdContact.id}-`));
    const editButton = within(newContactRow).getByRole('button', { name: 'Edit' });
    await user.click(editButton);

    const editDrawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await waitFor(() =>
      expect(mockGetContactDetail).toHaveBeenCalledWith(createdContact.id, createdContact.version),
    );

    const editShortName = within(editDrawer).getByDisplayValue('New Contact');
    await user.clear(editShortName);
    await user.type(editShortName, 'Updated Contact');

    const editEmail = within(editDrawer).getByDisplayValue('new@example.com');
    await user.clear(editEmail);
    await user.type(editEmail, 'updated@example.com');

    await user.click(within(editDrawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalledTimes(1));
    expect(mockUpdateContact).toHaveBeenCalledWith(
      createdContact.id,
      createdContact.version,
      expect.objectContaining({
        contactInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'Updated Contact',
            email: 'updated@example.com',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Save successfully!'),
    );
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByText('Updated Contact')).toBeInTheDocument());

    // Delete
    const updatedRow = screen.getByTestId(new RegExp(`^pro-table-row-${createdContact.id}-`));
    const deleteButton = within(updatedRow).getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);

    const confirmModal = await screen.findByRole('dialog', { name: 'Delete Contact' });
    await user.click(within(confirmModal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockDeleteContact).toHaveBeenCalledWith(createdContact.id, createdContact.version),
    );
    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith(
        'Selected record has been deleted.',
      ),
    );
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.queryByText('Updated Contact')).not.toBeInTheDocument());

    // Search
    const searchContainer = screen.getByTestId('search-input');
    const searchInput = within(searchContainer).getByPlaceholderText('pages.search.keyWord');
    await user.type(searchInput, 'Search Contact');
    await user.click(within(searchContainer).getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(mockGetContactTablePgroongaSearch).toHaveBeenCalled());
    const lastSearchCall =
      mockGetContactTablePgroongaSearch.mock.calls[
        mockGetContactTablePgroongaSearch.mock.calls.length - 1
      ];
    expect(lastSearchCall).toEqual([
      expect.objectContaining({ current: 1, pageSize: 10 }),
      'en',
      'my',
      'Search Contact',
      {},
      'all',
    ]);

    await waitFor(() => expect(screen.getByText('Search Result Contact')).toBeInTheDocument());
  });
});
