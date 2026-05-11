// @ts-nocheck
import AddMemberModal from '@/pages/Review/Components/AddMemberModal';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  SearchOutlined: () => <span>search</span>,
}));

const mockAddReviewMemberApi = jest.fn();
jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  addReviewMemberApi: (...args: any[]) => mockAddReviewMemberApi(...args),
}));

const mockGetUserInfoByEmail = jest.fn();
const mockUpdateUserContact = jest.fn();
jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserInfoByEmail: (...args: any[]) => mockGetUserInfoByEmail(...args),
  updateUserContact: (...args: any[]) => mockUpdateUserContact(...args),
}));

const mockGetContactDetail = jest.fn();
jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactDetail: (...args: any[]) => mockGetContactDetail(...args),
}));

const mockGenContactFromData = jest.fn();
jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: (...args: any[]) => mockGenContactFromData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLang: () => 'en',
  getLangText: (data: any[] = []) => data?.[0]?.['#text'] ?? '-',
  jsonToList: (value: any) => value,
}));

jest.mock('@/pages/Contacts/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button type='button' onClick={() => onData?.('contact-2', '2.0.0')}>
      pick-contact
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const FormContext = React.createContext<any>(null);

  const Form = React.forwardRef(({ children }: any, ref: any) => {
    const [values, setValues] = React.useState<Record<string, any>>({});

    const api = React.useMemo(
      () => ({
        getFieldValue: (name: string) => values[name],
        setFieldValue: (name: string, value: any) => {
          setValues((previous) => ({ ...previous, [name]: value }));
        },
        setFieldsValue: (next: Record<string, any>) => {
          setValues((previous) => ({ ...previous, ...next }));
        },
        resetFields: () => setValues({}),
      }),
      [values],
    );

    React.useImperativeHandle(ref, () => api, [api]);

    return <FormContext.Provider value={{ values, api }}>{children}</FormContext.Provider>;
  });
  Form.displayName = 'MockForm';

  const FormItem = ({ name, label, children }: any) => {
    const context = React.useContext(FormContext);
    const fieldName = Array.isArray(name) ? name.join('.') : name;
    const value = fieldName ? (context?.values?.[fieldName] ?? '') : '';

    return (
      <label>
        <span>{toText(label)}</span>
        {React.cloneElement(children, {
          value,
          onChange: (event: any) => {
            const nextValue = event?.target?.value ?? event;
            context?.api?.setFieldValue(fieldName, nextValue);
            children?.props?.onChange?.(event);
          },
        })}
      </label>
    );
  };

  Form.Item = FormItem;

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Input = ({ value = '', onChange, placeholder, suffix }: any) => (
    <div>
      <input
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event)}
      />
      {suffix}
    </div>
  );

  const Modal = ({ open, title, children, onCancel, onOk, confirmLoading, okButtonProps }: any) =>
    open ? (
      <section data-testid='modal'>
        <header>{toText(title)}</header>
        <div>{children}</div>
        <button type='button' onClick={() => onCancel?.()}>
          cancel
        </button>
        <button
          type='button'
          disabled={Boolean(confirmLoading) || Boolean(okButtonProps?.disabled)}
          onClick={() => onOk?.()}
        >
          ok
        </button>
      </section>
    ) : null;

  const Card = ({ title, children }: any) => (
    <section>
      <header>{title}</header>
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Empty = ({ description }: any) => <div>{toText(description)}</div>;
  Empty.PRESENTED_IMAGE_SIMPLE = 'empty';

  const Spin = ({ children }: any) => <div>{children}</div>;
  const theme = {
    useToken: () => ({
      token: {
        colorTextTertiary: '#595959',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Empty,
    Form,
    Input,
    Modal,
    Spin,
    message,
    theme,
  };
});

const mockMessage = jest.requireMock('antd').message as Record<string, jest.Mock>;

describe('ReviewAddMemberModal', () => {
  let consoleErrorSpy: jest.SpyInstance;

  const renderModal = (props: any = {}) => {
    const onCancel = jest.fn();
    const onSuccess = jest.fn();

    render(<AddMemberModal open onCancel={onCancel} onSuccess={onSuccess} {...props} />);

    return { onCancel, onSuccess };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetContactDetail.mockResolvedValue({
      data: {
        version: '2.0.0',
        json: {
          contactDataSet: {
            mocked: true,
          },
        },
      },
    });
    mockGenContactFromData.mockReturnValue({
      contactInformation: {
        dataSetInformation: {
          'common:shortName': [{ '@xml:lang': 'en', '#text': 'Selected contact' }],
        },
      },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows an error when querying without an email', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockMessage.error).toHaveBeenCalledWith('Please enter an email address');
    expect(mockGetUserInfoByEmail).not.toHaveBeenCalled();
  });

  it('queries a user and saves successfully when contact info already exists', async () => {
    const { onCancel, onSuccess } = renderModal();
    const contactInfo = {
      '@refObjectId': 'contact-1',
      '@type': 'contact data set',
      '@uri': '../contacts/contact-1.xml',
      '@version': '1.0.0',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Primary contact' }],
    };

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-1',
        raw_user_meta_data: {
          email: 'reviewer@example.com',
          display_name: 'Reviewer One',
        },
      },
      contact: contactInfo,
    });
    mockAddReviewMemberApi.mockResolvedValue({ success: true });
    mockUpdateUserContact.mockResolvedValue({ error: null });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'reviewer@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() =>
      expect(mockGetUserInfoByEmail).toHaveBeenCalledWith('reviewer@example.com'),
    );
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('Primary contact')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => expect(mockAddReviewMemberApi).toHaveBeenCalledWith('user-1'));
    expect(mockUpdateUserContact).toHaveBeenCalledWith('user-1', contactInfo);
    expect(mockMessage.success).toHaveBeenCalledWith('Member added successfully!');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows user-not-found error when query returns no user', async () => {
    renderModal();

    mockGetUserInfoByEmail.mockResolvedValue({
      success: false,
    });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'missing@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(mockGetUserInfoByEmail).toHaveBeenCalledWith('missing@example.com'));
    expect(mockMessage.error).toHaveBeenCalledWith('User not found');
    expect(screen.queryByText('No contact information')).not.toBeInTheDocument();
  });

  it('shows query failed when querying throws', async () => {
    renderModal();

    mockGetUserInfoByEmail.mockRejectedValue(new Error('boom'));

    fireEvent.change(screen.getByPlaceholderText('Please enter email and click query'), {
      target: { value: 'broken@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(mockMessage.error).toHaveBeenCalledWith('Query failed'));
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('keeps ok disabled when queried user has no contact info', async () => {
    renderModal();

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-2',
        raw_user_meta_data: {
          email: 'new-reviewer@example.com',
          display_name: 'Reviewer Two',
        },
      },
      contact: null,
    });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'new-reviewer@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('No contact information')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'ok' })).toBeDisabled();
  });

  it('loads contact from the contact picker and reports duplicate-member errors', async () => {
    renderModal();

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-2',
        raw_user_meta_data: {
          email: 'new-reviewer@example.com',
          display_name: 'Reviewer Two',
        },
      },
      contact: null,
    });
    mockAddReviewMemberApi.mockResolvedValue({
      error: {
        code: '23505',
      },
    });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'new-reviewer@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('No contact information')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /pick-contact/i }));

    await waitFor(() => expect(mockGetContactDetail).toHaveBeenCalledWith('contact-2', '2.0.0'));
    expect(screen.getByText('Selected contact')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => expect(mockAddReviewMemberApi).toHaveBeenCalledWith('user-2'));
    expect(mockMessage.error).toHaveBeenCalledWith('User already exists');
    expect(mockUpdateUserContact).not.toHaveBeenCalled();
  });

  it('falls back to empty user id, empty contact short descriptions, and dash display names', async () => {
    renderModal();

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        raw_user_meta_data: {
          email: 'fallback@example.com',
        },
      },
      contact: null,
    });
    mockGetContactDetail.mockResolvedValueOnce({
      data: {
        version: '2.0.0',
        json: {},
      },
    });
    mockGenContactFromData.mockReturnValueOnce({
      contactInformation: {
        dataSetInformation: {},
      },
    });
    mockAddReviewMemberApi.mockResolvedValue({ success: true });
    mockUpdateUserContact.mockResolvedValue({ error: null });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'fallback@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('-')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /pick-contact/i }));
    await waitFor(() => expect(mockGenContactFromData).toHaveBeenCalledWith({}));

    await userEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => expect(mockAddReviewMemberApi).toHaveBeenCalledWith(''));
    expect(mockUpdateUserContact).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        'common:shortDescription': [],
      }),
    );
  });

  it('shows generic failure when updating associated contact fails', async () => {
    renderModal();

    const contactInfo = {
      '@refObjectId': 'contact-1',
      '@type': 'contact data set',
      '@uri': '../contacts/contact-1.xml',
      '@version': '1.0.0',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Primary contact' }],
    };

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-1',
        raw_user_meta_data: {
          email: 'reviewer@example.com',
          display_name: 'Reviewer One',
        },
      },
      contact: contactInfo,
    });
    mockAddReviewMemberApi.mockResolvedValue({ success: true });
    mockUpdateUserContact.mockResolvedValue({ error: { message: 'update failed' } });

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'reviewer@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText('Primary contact')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => expect(mockMessage.error).toHaveBeenCalledWith('Failed to add member!'));
  });

  it('invokes onCancel when cancel button is clicked', async () => {
    const { onCancel } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockAddReviewMemberApi).not.toHaveBeenCalled();
  });

  it('resets queried user and contact state when the modal closes and reopens', async () => {
    const onCancel = jest.fn();
    const onSuccess = jest.fn();
    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-reset',
        raw_user_meta_data: {
          email: 'reset@example.com',
          display_name: 'Reset User',
        },
      },
      contact: {
        '@refObjectId': 'contact-reset',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-reset.xml',
        '@version': '1.0.0',
        'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Reset contact' }],
      },
    });

    const { rerender } = render(<AddMemberModal open onCancel={onCancel} onSuccess={onSuccess} />);

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'reset@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText('user-reset')).toBeInTheDocument());

    rerender(<AddMemberModal open={false} onCancel={onCancel} onSuccess={onSuccess} />);
    rerender(<AddMemberModal open onCancel={onCancel} onSuccess={onSuccess} />);

    expect(screen.queryByText('user-reset')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Please enter email and click query')).toHaveValue('');
  });

  it('logs unexpected errors during member creation and leaves the modal open', async () => {
    renderModal();

    const contactInfo = {
      '@refObjectId': 'contact-1',
      '@type': 'contact data set',
      '@uri': '../contacts/contact-1.xml',
      '@version': '1.0.0',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Primary contact' }],
    };

    mockGetUserInfoByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-1',
        raw_user_meta_data: {
          email: 'reviewer@example.com',
          display_name: 'Reviewer One',
        },
      },
      contact: contactInfo,
    });
    mockAddReviewMemberApi.mockRejectedValue(new Error('add failed'));

    await userEvent.type(
      screen.getByPlaceholderText('Please enter email and click query'),
      'reviewer@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText('Primary contact')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error)));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });
});
