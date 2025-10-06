import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage || id}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

jest.mock('@/services/general/util', () => ({
  getLangText: jest.fn((value: any) => (typeof value === 'string' ? value : value?.en || '')),
  getLang: jest.fn(() => 'en'),
}));

jest.mock('antd', () => {
  const React = require('react') as typeof import('react');

  const messageMock = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    open: jest.fn(),
  };

  const extractText = (node: any): string => {
    if (node === null || node === undefined) {
      return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join('');
    }
    if (node?.props) {
      return (
        extractText(node.props.children) ||
        extractText(node.props.defaultMessage) ||
        extractText(node.props.message)
      );
    }
    return '';
  };

  const Tooltip = ({ title, children }: any) => {
    const label = extractText(title) || 'tooltip';
    return React.cloneElement(children, {
      'aria-label': label,
      title: label,
    });
  };

  const Button = React.forwardRef<HTMLButtonElement, any>((props, ref) => {
    const { children, onClick, disabled, htmlType = 'button', type: variant, ...rest } = props;
    return (
      <button
        ref={ref}
        type='button'
        data-variant={variant}
        data-html-type={htmlType}
        onClick={onClick}
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) => {
    if (!open) {
      return null;
    }
    const heading = typeof title === 'string' ? title : (title?.props?.children ?? 'Drawer');
    return (
      <section role='dialog' aria-modal='true'>
        <header>
          <h2>{heading}</h2>
          <div>{extra}</div>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
        <button type='button' onClick={onClose} aria-label='close drawer'>
          Close
        </button>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) => (
    <div data-testid={spinning ? 'spinner-active' : 'spinner-idle'}>{children}</div>
  );

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Spin,
    Tooltip,
    message: messageMock,
  };
});

type ProFormHandle = {
  submit: () => void;
  resetFields: () => void;
  setFieldsValue: (values: Record<string, unknown>) => void;
  getFieldsValue: () => Record<string, unknown>;
};

jest.mock('@ant-design/pro-components', () => {
  const React = require('react') as typeof import('react');

  const ProForm = ({ formRef, initialValues = {}, onFinish, children }: any) => {
    const [values, setValues] = React.useState<Record<string, unknown>>(initialValues);

    const submit = React.useCallback(() => {
      return onFinish?.(values);
    }, [onFinish, values]);

    const resetFields = React.useCallback(() => {
      setValues(initialValues);
    }, [initialValues]);

    const setFieldsValue = React.useCallback((next: Record<string, unknown>) => {
      setValues((prev: Record<string, unknown>) => ({ ...prev, ...next }));
    }, []);

    const getFieldsValue = React.useCallback(() => values, [values]);

    React.useEffect(() => {
      if (formRef) {
        (formRef as React.MutableRefObject<ProFormHandle>).current = {
          submit,
          resetFields,
          setFieldsValue,
          getFieldsValue,
        };
      }
    }, [formRef, submit, resetFields, setFieldsValue, getFieldsValue]);

    React.useEffect(() => {
      setValues(initialValues);
    }, [initialValues]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {typeof children === 'function' ? children({}) : children}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
  };
});

jest.mock('@/components/AllTeams/form', () => {
  const React = require('react') as typeof import('react');
  return {
    __esModule: true,
    default: ({ onLogoChange, lightLogoProps, darkLogoProps }: any) => {
      return (
        <div>
          <div data-testid='light-logo-prop'>{lightLogoProps}</div>
          <div data-testid='dark-logo-prop'>{darkLogoProps}</div>
          <button
            type='button'
            onClick={() =>
              onLogoChange({ lightLogo: [{ name: 'light.png' }], darkLogo: [{ name: 'dark.png' }] })
            }
          >
            Upload logos
          </button>
          <button type='button' onClick={() => onLogoChange({ lightLogo: [], darkLogo: [] })}>
            Clear logos
          </button>
        </div>
      );
    },
  };
});

jest.mock('@/services/supabase/storage', () => ({
  removeLogoApi: jest.fn(() => Promise.resolve({ data: null, error: null })),
  uploadLogoApi: jest.fn(() =>
    Promise.resolve({ data: { path: 'uploaded/path.png' }, error: null }),
  ),
  isImage: jest.fn(() => true),
}));

jest.mock('@/services/teams/api', () => ({
  editTeamMessage: jest.fn(),
  getTeamMessageApi: jest.fn(),
}));

import TeamEdit from '@/components/AllTeams/edit';
import { isImage, removeLogoApi, uploadLogoApi } from '@/services/supabase/storage';
import { editTeamMessage, getTeamMessageApi } from '@/services/teams/api';
import { message } from 'antd';

const mockGetTeamMessageApi = getTeamMessageApi as unknown as jest.MockedFunction<any>;
const mockEditTeamMessage = editTeamMessage as unknown as jest.MockedFunction<any>;
const mockUploadLogoApi = uploadLogoApi as unknown as jest.MockedFunction<any>;
const mockRemoveLogoApi = removeLogoApi as unknown as jest.MockedFunction<any>;
const mockIsImage = isImage as unknown as jest.MockedFunction<any>;

type MessageApiMock = {
  success: jest.Mock;
  error: jest.Mock;
  warning: jest.Mock;
  info: jest.Mock;
  loading: jest.Mock;
  open: jest.Mock;
};

const getMessageMock = () => message as unknown as MessageApiMock;

const createTeamResponse = () => ({
  data: [
    {
      id: 'team-1',
      json: {
        title: [
          { '#text': 'Team EN', '@xml:lang': 'en' },
          { '#text': '团队中文', '@xml:lang': 'zh' },
        ],
        description: [
          { '#text': 'English description', '@xml:lang': 'en' },
          { '#text': '中文描述', '@xml:lang': 'zh' },
        ],
        lightLogo: 'existing/light.png',
        darkLogo: 'existing/dark.png',
      },
    },
  ],
});

describe('TeamEdit component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTeamMessageApi.mockResolvedValue(createTeamResponse());
    mockEditTeamMessage.mockResolvedValue({ data: { id: 'team-1' }, error: null });
    mockUploadLogoApi.mockResolvedValue({ data: { path: 'uploaded/path.png' }, error: null });
    mockIsImage.mockReturnValue(true);
  });

  it('opens the drawer and loads existing team data', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-1');
    });

    expect(await screen.findByTestId('light-logo-prop')).toHaveTextContent('existing/light.png');
    expect(screen.getByTestId('dark-logo-prop')).toHaveTextContent('existing/dark.png');
  });

  it('submits changes successfully and closes the drawer', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /upload logos/i }));

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUploadLogoApi).toHaveBeenCalledWith('light.png', { name: 'light.png' }, 'png');
      expect(mockUploadLogoApi).toHaveBeenCalledWith('dark.png', { name: 'dark.png' }, 'png');
      expect(mockEditTeamMessage).toHaveBeenCalled();
    });

    const payload = mockEditTeamMessage.mock.calls.at(-1)?.[1];
    expect(payload.lightLogo).toEqual('../sys-files/uploaded/path.png');
    expect(payload.darkLogo).toEqual('../sys-files/uploaded/path.png');

    expect(getMessageMock().success).toHaveBeenCalledWith('Team updated successfully!');
    expect(actionRef.current.reload).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows an error message when updating fails', async () => {
    mockEditTeamMessage.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to update team information.');
    });

    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('removes existing logos when they are cleared before saving', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /clear logos/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockRemoveLogoApi).toHaveBeenCalledTimes(2);
    });
  });

  it('warns when uploading a non-image file', async () => {
    mockIsImage.mockReturnValueOnce(false).mockReturnValueOnce(false);

    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /upload logos/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Only image files can be uploaded!');
    });
  });
});
