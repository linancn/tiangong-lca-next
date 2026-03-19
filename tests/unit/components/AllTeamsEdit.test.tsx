import { render, screen, waitFor, within } from '@testing-library/react';
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

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) {
      return null;
    }
    getContainer?.();
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

let mockForceUndefinedFormValues = false;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react') as typeof import('react');

  const ProForm = ({ formRef, initialValues = {}, onFinish, submitter, children }: any) => {
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

    const getFieldsValue = React.useCallback(
      () => (mockForceUndefinedFormValues ? (undefined as any) : values),
      [values],
    );

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
        <div data-testid='submitter-render-output'>{submitter?.render?.()}</div>
        <div data-testid='form-values-json'>{JSON.stringify(values)}</div>
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
          <button
            type='button'
            onClick={() =>
              onLogoChange({ lightLogo: [{ name: 'light.png' }], darkLogo: 'existing/dark.png' })
            }
          >
            Upload light logo only
          </button>
          <button
            type='button'
            onClick={() =>
              onLogoChange({ lightLogo: [{ name: '' }], darkLogo: 'existing/dark.png' })
            }
          >
            Upload light logo with empty filename
          </button>
          <button
            type='button'
            onClick={() =>
              onLogoChange({ lightLogo: 'existing/light.png', darkLogo: [{ name: 'dark.png' }] })
            }
          >
            Upload dark logo only
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
    mockForceUndefinedFormValues = false;
    mockGetTeamMessageApi.mockResolvedValue(createTeamResponse());
    mockEditTeamMessage.mockResolvedValue({ data: { id: 'team-1' }, error: null });
    mockUploadLogoApi.mockResolvedValue({ data: { path: 'uploaded/path.png' }, error: null });
    mockIsImage.mockReturnValue(true);
  });

  it('does not open from the icon trigger when disabled', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(<TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled />);

    const trigger = screen.getByRole('button', { name: /edit/i });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('hydrates fallback title and description arrays when the team payload omits them', async () => {
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          id: 'team-1',
          json: {
            lightLogo: 'existing/light.png',
            darkLogo: 'existing/dark.png',
          },
        },
      ],
    });

    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId('form-values-json').textContent || '{}');
      expect(values.title).toEqual([
        { '#text': '', '@xml:lang': 'zh' },
        { '#text': '', '@xml:lang': 'en' },
      ]);
      expect(values.description).toEqual([
        { '#text': '', '@xml:lang': 'zh' },
        { '#text': '', '@xml:lang': 'en' },
      ]);
    });
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

  it('reuses existing logo paths without uploading again', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockEditTeamMessage).toHaveBeenCalled();
    });

    const payload = mockEditTeamMessage.mock.calls.at(-1)?.[1];
    expect(payload.lightLogo).toBe('existing/light.png');
    expect(payload.darkLogo).toBe('existing/dark.png');
    expect(mockUploadLogoApi).not.toHaveBeenCalled();
  });

  it('supports text button mode and closes the drawer from the cancel action', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(<TeamEdit id='team-1' buttonType='custom.edit.label' actionRef={actionRef as any} />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('falls back to the default edit label when buttonType is empty', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(<TeamEdit id='team-1' buttonType='' actionRef={actionRef as any} />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes the drawer from the drawer close action', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close drawer/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes the drawer from the header close icon', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog');

    const [headerCloseButton] = within(dialog).getAllByRole('button');
    await user.click(headerCloseButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes the linked view drawer after a successful save when callback is provided', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    render(
      <TeamEdit
        id='team-1'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
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

  it('warns when uploading a non-image dark logo only', async () => {
    mockIsImage.mockReturnValueOnce(false);

    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /upload dark logo only/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Only image files can be uploaded!');
    });
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('aborts saving when a light logo upload resolves without a path', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockUploadLogoApi.mockResolvedValueOnce({ data: { path: undefined }, error: null });

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /upload light logo only/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to upload team logo.');
    });
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
  });

  it('aborts saving when a dark logo upload resolves without a path', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockUploadLogoApi.mockResolvedValueOnce({ data: { path: undefined }, error: null });

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /upload dark logo only/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to upload team logo.');
    });
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
  });

  it('aborts saving when the light logo upload fails', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadLogoApi.mockRejectedValueOnce(new Error('light upload failed'));

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /upload logos/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to upload team logo.');
    });
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('falls back to an empty object when the form ref returns undefined values', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockForceUndefinedFormValues = true;

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockEditTeamMessage).toHaveBeenCalled();
    });
    expect(mockEditTeamMessage).toHaveBeenLastCalledWith('team-1', {
      lightLogo: 'existing/light.png',
      darkLogo: 'existing/dark.png',
    });
  });

  it('aborts saving when the dark logo upload fails after the light logo succeeds', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadLogoApi.mockRejectedValueOnce(new Error('dark upload failed'));

    render(
      <TeamEdit id='team-1' buttonType='icon' actionRef={actionRef as any} disabled={false} />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /upload dark logo only/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to upload team logo.');
    });
    expect(mockUploadLogoApi).toHaveBeenCalledTimes(1);
    expect(mockUploadLogoApi).toHaveBeenCalledWith('dark.png', { name: 'dark.png' }, 'png');
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
