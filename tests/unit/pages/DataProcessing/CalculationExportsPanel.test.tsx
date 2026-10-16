import CalculationExportsPanel from '@/pages/DataProcessing/CalculationExportsPanel';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('antd', () => {
  const React = require('react');
  const base = require('../../../mocks/antd').createAntdMock();
  return {
    ...base,
    Table: (props: any) => (
      <>
        <base.Table {...props} />
        <button type='button' onClick={() => props.pagination.onChange(2)}>
          Next page
        </button>
      </>
    ),
  };
});
jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ defaultMessage }: any) => defaultMessage }),
}));
const mockGet = jest.fn();
const mockRequest = jest.fn();
const mockDownload = jest.fn();
jest.mock('@/services/lcaReleases', () => ({
  getCalculationExport: (...args: any[]) => mockGet(...args),
  requestCalculationExport: (...args: any[]) => mockRequest(...args),
  fetchFreshCalculationExportBlob: (...args: any[]) => mockDownload(...args),
}));
const projection = (status: string) => ({
  packageId: 'package',
  format: 'parquet',
  status,
  workerJobId: 'job',
  progress: null,
  result: null,
  errorCode: status === 'failed' ? 'artifact_too_large' : null,
});
const response = (status: string) => ({ data: projection(status), error: null });

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(response('not_requested'));
});
afterEach(() => {
  jest.useRealTimers();
});

test('reads default Parquet status without automatically starting an export', async () => {
  render(<CalculationExportsPanel packageId='package' />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate export' })).toBeEnabled(),
  );
  expect(mockGet).toHaveBeenCalledWith('package', 'parquet', 0);
  expect(mockRequest).not.toHaveBeenCalled();
});

test('only explicit generation enqueues and terminal failure stops polling', async () => {
  jest.useFakeTimers();
  mockGet
    .mockResolvedValueOnce(response('not_requested'))
    .mockResolvedValueOnce(response('running'))
    .mockResolvedValue(response('failed'));
  mockRequest.mockResolvedValue(response('queued'));
  render(<CalculationExportsPanel packageId='package' />);
  await act(async () => {});
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));
  });
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockRequest).toHaveBeenCalledWith('package', 'parquet');
  await act(async () => {
    jest.advanceTimersByTime(4000);
  });
  expect(
    screen.getByText(/Export stopped\. Calculation results remain available\./),
  ).toBeInTheDocument();
  const calls = mockGet.mock.calls.length;
  await act(async () => {
    jest.advanceTimersByTime(60000);
  });
  expect(mockGet).toHaveBeenCalledTimes(calls);
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Generate export' })).toBeDisabled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Refresh export status' }));
  });
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test('ignores an older package response after switching the calculation', async () => {
  let resolveOld!: (value: unknown) => void;
  mockGet
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue(response('not_requested'));
  const view = render(<CalculationExportsPanel packageId='old' />);
  view.rerender(<CalculationExportsPanel packageId='new' />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate export' })).toBeEnabled(),
  );
  await act(async () => {
    resolveOld(response('failed'));
  });
  expect(
    screen.queryByText(/Export stopped\. Calculation results remain available\./),
  ).not.toBeInTheDocument();
});

const completed = () => ({
  data: {
    ...projection('completed'),
    result: {
      files: [{ fileName: 'part.parquet', recordCount: 20, byteSize: 1024 }],
      manifest: { fileName: 'export-manifest.json', byteSize: 200 },
      totalFiles: 21,
    },
  },
  error: null,
});
const settle = async () => {
  await act(async () => {});
};

test.each([new Error('read error'), 'read string', null, { message: 'denied' }])(
  'shows a read failure and stops polling: %p',
  async (failure) => {
    jest.useFakeTimers();
    if (failure instanceof Error || typeof failure === 'string') mockGet.mockRejectedValue(failure);
    else mockGet.mockResolvedValue({ data: null, error: failure });
    render(<CalculationExportsPanel packageId='package' />);
    await settle();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  },
);

test.each([new Error('request error'), 'request string', null, { message: 'denied' }])(
  'preserves calculation after explicit request failure: %p',
  async (failure) => {
    if (failure instanceof Error || typeof failure === 'string')
      mockRequest.mockRejectedValue(failure);
    else mockRequest.mockResolvedValue({ data: null, error: failure });
    render(<CalculationExportsPanel packageId='package' />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));
    await settle();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate export' })).toBeEnabled();
  },
);

test('ignores stale request success and all stale failures', async () => {
  let resolve!: (v: any) => void;
  let reject!: (v: any) => void;
  mockRequest.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = render(<CalculationExportsPanel packageId='old' />);
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));
  view.rerender(<CalculationExportsPanel packageId='new' />);
  await settle();
  await act(async () => {
    resolve(response('failed'));
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  mockRequest.mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate export' }));
  view.rerender(<CalculationExportsPanel packageId='newer' />);
  await settle();
  await act(async () => {
    reject(new Error('old request'));
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  mockGet.mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
  );
  view.rerender(<CalculationExportsPanel packageId='pending' />);
  view.rerender(<CalculationExportsPanel packageId='latest' />);
  await settle();
  await act(async () => {
    reject(new Error('old read'));
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('downloads verified files, changes pages and resets pages when changing format', async () => {
  mockGet.mockResolvedValue(completed());
  mockDownload.mockResolvedValue(new Blob(['verified']));
  URL.createObjectURL = jest.fn(() => 'blob:verified');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<CalculationExportsPanel packageId='package' />);
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Download' }));
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Download export manifest' }));
  await settle();
  expect(click).toHaveBeenCalledTimes(2);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await settle();
  expect(mockGet).toHaveBeenLastCalledWith('package', 'parquet', 20);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'csv' } });
  await settle();
  expect(mockGet).toHaveBeenLastCalledWith('package', 'csv', 0);
  click.mockRestore();
});

test.each([new Error('download error'), 'download string'])(
  'reports download failure without saving: %p',
  async (error) => {
    mockGet.mockResolvedValue(completed());
    mockDownload.mockRejectedValue(error);
    render(<CalculationExportsPanel packageId='package' />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await settle();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  },
);

test.each(['resolve', 'reject'])(
  'ignores stale download %s and clears busy state for new package',
  async (mode) => {
    let finish!: (v: any) => void;
    mockGet.mockResolvedValue(completed());
    mockDownload.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = mode === 'resolve' ? resolve : reject;
        }),
    );
    const view = render(<CalculationExportsPanel packageId='old' />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    view.rerender(<CalculationExportsPanel packageId='new' />);
    await settle();
    await act(async () => {
      finish(mode === 'resolve' ? new Blob(['old']) : new Error('old'));
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  },
);

test('renders numeric progress and terminal states without optional details', async () => {
  mockGet
    .mockResolvedValueOnce({ data: { ...projection('running'), progress: 0.42 }, error: null })
    .mockResolvedValue({ data: { ...projection('cancelled'), workerJobId: null }, error: null });
  const view = render(<CalculationExportsPanel packageId='package' />);
  await settle();
  expect(screen.getByText(/42%/)).toBeInTheDocument();
  view.rerender(<CalculationExportsPanel packageId='new' />);
  await settle();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
