import LcaSolveToolbar from '@/pages/Processes/Components/lcaSolveToolbar';
import { getLcaResult, pollLcaJobUntilTerminal, submitLcaSolve } from '@/services/lca';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type MockFormApi = {
  __values: Record<string, number | undefined>;
  setFieldsValue: (next: Record<string, number | undefined>) => void;
  validateFields: () => Promise<Record<string, number | undefined>>;
};

const buildMockFormApi = (): MockFormApi => {
  const api: MockFormApi = {
    __values: {},
    setFieldsValue(next) {
      api.__values = {
        ...api.__values,
        ...next,
      };
    },
    async validateFields() {
      return { ...api.__values };
    },
  };
  return api;
};

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({
    onClick,
    disabled,
    tooltip,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    tooltip?: ReactNode;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} data-testid='lca-toolbar-trigger'>
      {tooltip}
    </button>
  ),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  submitLcaSolve: jest.fn(),
  pollLcaJobUntilTerminal: jest.fn(),
  getLcaResult: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: (
      { defaultMessage, id }: { defaultMessage?: string; id: string },
      values?: Record<string, string | number>,
    ) => {
      let text = defaultMessage ?? id;
      if (!values) {
        return text;
      }
      for (const [key, value] of Object.entries(values)) {
        text = text.replace(`{${key}}`, String(value));
      }
      return text;
    },
  }),
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');
  const FormContext = React.createContext(null as { form: MockFormApi } | null);

  const Form = ({ form, initialValues, children }: any) => {
    if (form && initialValues) {
      form.setFieldsValue(initialValues);
    }

    return <FormContext.Provider value={{ form }}>{children}</FormContext.Provider>;
  };

  Form.useForm = () => {
    const form = buildMockFormApi();
    return [form];
  };

  const MockFormItem = ({ name, label, children }: any) => {
    const ctx = React.useContext(FormContext);
    const form = ctx?.form;
    const stringName = String(name);

    const child = React.Children.only(children);
    return (
      <div>
        <label htmlFor={`field-${stringName}`}>{label}</label>
        {React.cloneElement(child, {
          id: `field-${stringName}`,
          'data-testid': `field-${stringName}`,
          value: form?.__values?.[stringName],
          onChange: (nextValue: number | undefined) => {
            form?.setFieldsValue({ [stringName]: nextValue });
          },
        })}
      </div>
    );
  };
  Form.Item = MockFormItem;

  const InputNumber = ({
    value,
    onChange,
    ...rest
  }: {
    value?: number;
    onChange?: (value: number | undefined) => void;
    [key: string]: unknown;
  }) => (
    <input
      type='number'
      value={value ?? ''}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        onChange?.(Number.isNaN(parsed) ? undefined : parsed);
      }}
      {...rest}
    />
  );

  const Modal = ({
    open,
    title,
    children,
    okText,
    cancelText,
    onOk,
    onCancel,
  }: {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    okText?: ReactNode;
    cancelText?: ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
  }) => {
    if (!open) {
      return null;
    }

    return (
      <div data-testid='lca-modal'>
        <h3>{title}</h3>
        <div>{children}</div>
        <button type='button' data-testid='lca-modal-ok' onClick={onOk}>
          {okText}
        </button>
        <button type='button' data-testid='lca-modal-cancel' onClick={onCancel}>
          {cancelText}
        </button>
      </div>
    );
  };

  const Space = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Typography = {
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Form,
    InputNumber,
    Modal,
    Space,
    Typography,
    message,
  };
});

import { message } from 'antd';

const mockSubmitLcaSolve = submitLcaSolve as unknown as jest.Mock;
const mockPollLcaJobUntilTerminal = pollLcaJobUntilTerminal as unknown as jest.Mock;
const mockGetLcaResult = getLcaResult as unknown as jest.Mock;

const buildJob = (overrides: Record<string, unknown> = {}) => ({
  job_id: 'job-1',
  snapshot_id: 'snap-1',
  job_type: 'solve_one',
  status: 'completed',
  timestamps: {
    created_at: '2026-03-01T00:00:00Z',
    started_at: '2026-03-01T00:00:01Z',
    finished_at: '2026-03-01T00:00:02Z',
    updated_at: '2026-03-01T00:00:02Z',
  },
  payload: {},
  diagnostics: {},
  result: {
    result_id: 'res-1',
    created_at: '2026-03-01T00:00:02Z',
    artifact_url: 'https://example.com/res.h5',
    artifact_format: 'hdf5:v1',
    artifact_byte_size: 100,
    artifact_sha256: 'sha',
    diagnostics: {},
  },
  ...overrides,
});

describe('LcaSolveToolbar component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openModal = () => {
    fireEvent.click(screen.getByTestId('lca-toolbar-trigger'));
    expect(screen.getByTestId('lca-modal')).toBeInTheDocument();
  };

  it('opens modal from toolbar trigger', () => {
    render(<LcaSolveToolbar />);
    expect(screen.queryByTestId('lca-modal')).not.toBeInTheDocument();

    openModal();
  });

  it('submits queued job, polls terminal status, and fetches result', async () => {
    mockSubmitLcaSolve.mockResolvedValueOnce({
      mode: 'queued',
      snapshot_id: 'snap-1',
      cache_key: 'cache-1',
      job_id: 'job-1',
    });
    mockPollLcaJobUntilTerminal.mockResolvedValueOnce(buildJob());
    mockGetLcaResult.mockResolvedValueOnce({
      result_id: 'res-1',
      snapshot_id: 'snap-1',
      created_at: '2026-03-01T00:00:02Z',
      diagnostics: {},
      artifact: {
        artifact_url: 'https://example.com/res.h5',
        artifact_format: 'hdf5:v1',
        artifact_byte_size: 100,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-1',
        job_type: 'solve_one',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-01T00:00:00Z',
          started_at: '2026-03-01T00:00:01Z',
          finished_at: '2026-03-01T00:00:02Z',
          updated_at: '2026-03-01T00:00:02Z',
        },
      },
    });

    render(<LcaSolveToolbar />);
    openModal();

    fireEvent.change(screen.getByTestId('field-process_index'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('field-amount'), { target: { value: '2.5' } });

    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(mockSubmitLcaSolve).toHaveBeenCalledWith({
        scope: 'prod',
        demand: {
          process_index: 3,
          amount: 2.5,
        },
        solve: {
          return_x: false,
          return_g: true,
          return_h: true,
        },
        print_level: 0,
      });
    });

    await waitFor(() => {
      expect(mockPollLcaJobUntilTerminal).toHaveBeenCalledWith('job-1', {
        timeoutMs: 120000,
      });
    });

    await waitFor(() => {
      expect(mockGetLcaResult).toHaveBeenCalledWith('res-1');
    });

    expect(message.loading).toHaveBeenCalled();
    expect(message.success).toHaveBeenCalled();
  });

  it('handles cache_hit without polling', async () => {
    mockSubmitLcaSolve.mockResolvedValueOnce({
      mode: 'cache_hit',
      snapshot_id: 'snap-1',
      cache_key: 'cache-1',
      result_id: 'res-cache',
    });
    mockGetLcaResult.mockResolvedValueOnce({
      result_id: 'res-cache',
      snapshot_id: 'snap-1',
      created_at: '2026-03-01T00:00:02Z',
      diagnostics: {},
      artifact: {
        artifact_url: 'https://example.com/res-cache.h5',
        artifact_format: 'hdf5:v1',
        artifact_byte_size: 100,
        artifact_sha256: 'sha',
      },
      job: {
        job_id: 'job-1',
        job_type: 'solve_one',
        status: 'completed',
        timestamps: {
          created_at: '2026-03-01T00:00:00Z',
          started_at: '2026-03-01T00:00:01Z',
          finished_at: '2026-03-01T00:00:02Z',
          updated_at: '2026-03-01T00:00:02Z',
        },
      },
    });

    render(<LcaSolveToolbar />);
    openModal();
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(mockGetLcaResult).toHaveBeenCalledWith('res-cache');
    });
    expect(mockPollLcaJobUntilTerminal).not.toHaveBeenCalled();
    expect(message.success).toHaveBeenCalled();
  });

  it('shows failed message and skips result fetch when job terminal is failed', async () => {
    mockSubmitLcaSolve.mockResolvedValueOnce({
      mode: 'queued',
      snapshot_id: 'snap-1',
      cache_key: 'cache-1',
      job_id: 'job-1',
    });
    mockPollLcaJobUntilTerminal.mockResolvedValueOnce(
      buildJob({
        status: 'failed',
        result: null,
      }),
    );

    render(<LcaSolveToolbar />);
    openModal();
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(mockPollLcaJobUntilTerminal).toHaveBeenCalled();
    });

    expect(mockGetLcaResult).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalled();
  });

  it('blocks submit for invalid process index (< 0)', async () => {
    render(<LcaSolveToolbar />);
    openModal();

    fireEvent.change(screen.getByTestId('field-process_index'), { target: { value: '-1' } });
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('process_index must be an integer >= 0');
    });

    expect(mockSubmitLcaSolve).not.toHaveBeenCalled();
  });
});
