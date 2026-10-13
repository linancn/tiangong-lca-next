import ReviewReportDownloadButton from '@/pages/Processes/Components/Review/reportDownloadButton';
import {
  collectReviewReportReferenceKeys,
  reviewReportReferenceKey,
} from '@/pages/Processes/Components/Review/reportReferences';
import {
  createReviewReportDownloads,
  triggerReviewReportDownloads,
} from '@/services/reviews/reportDownload';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { antdMocks, resetAntdMocks } from '../../../../../mocks/antd';

jest.mock('@/services/reviews/reportDownload', () => ({
  __esModule: true,
  createReviewReportDownloads: jest.fn(),
  triggerReviewReportDownloads: jest.fn(),
}));

jest.mock('antd', () => require('../../../../../mocks/antd').createAntdMock());

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DownloadOutlined: () => <span aria-hidden='true'>download-icon</span>,
}));

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
      defaultMessage ?? id,
  }),
}));

const mockCreateDownloads = createReviewReportDownloads as jest.Mock;
const mockTriggerDownloads = triggerReviewReportDownloads as jest.Mock;

const props = {
  processId: '11111111-1111-4111-8111-111111111111',
  processVersion: '01.01.000',
  sourceId: '22222222-2222-4222-8222-222222222222',
  sourceVersion: '01.01.000',
};

describe('ReviewReportDownloadButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAntdMocks();
  });

  it('downloads all current attachments without opening Source details', async () => {
    const downloads = [
      {
        filename: 'report.pdf',
        signedDownloadUrl: 'https://storage.example.test/report.pdf?token=short',
        signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
      },
      {
        filename: 'evidence.xlsx',
        signedDownloadUrl: 'https://storage.example.test/evidence.xlsx?token=short',
        signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
      },
    ];
    mockCreateDownloads.mockResolvedValue({ data: downloads, error: null });

    render(<ReviewReportDownloadButton {...props} />);
    expect(screen.queryByText('download-icon')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Download report/ }));

    await waitFor(() => expect(mockCreateDownloads).toHaveBeenCalledWith(props));
    expect(mockTriggerDownloads).toHaveBeenCalledWith(downloads);
    expect(antdMocks.messageApi.error).not.toHaveBeenCalled();
  });

  it('shows a localized empty-current-attachment message', async () => {
    mockCreateDownloads.mockResolvedValue({
      data: null,
      error: {
        code: 'REVIEW_REPORT_NO_ATTACHMENTS',
        message: 'The review report has no current attachments',
      },
    });

    render(<ReviewReportDownloadButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Download report/ }));

    await waitFor(() =>
      expect(antdMocks.messageApi.error).toHaveBeenCalledWith(
        'The review report has no current attachments.',
      ),
    );
    expect(mockTriggerDownloads).not.toHaveBeenCalled();
  });

  it('shows the generic failure message for other download errors', async () => {
    mockCreateDownloads.mockResolvedValue({
      data: null,
      error: {
        code: 'REVIEW_REPORT_DOWNLOAD_FAILED',
        message: 'Unable to prepare review report download',
      },
    });

    render(<ReviewReportDownloadButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Download report/ }));

    await waitFor(() =>
      expect(antdMocks.messageApi.error).toHaveBeenCalledWith(
        'Failed to download the review report.',
      ),
    );
    expect(mockTriggerDownloads).not.toHaveBeenCalled();
  });

  it('shows the stable failure message when preparing a download throws', async () => {
    mockCreateDownloads.mockRejectedValue(new Error('network failure'));

    render(<ReviewReportDownloadButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Download report/ }));

    await waitFor(() =>
      expect(antdMocks.messageApi.error).toHaveBeenCalledWith(
        'Failed to download the review report.',
      ),
    );
    expect(mockTriggerDownloads).not.toHaveBeenCalled();
  });

  it('collects only complete and unique report references from rejected comments', () => {
    const report = {
      '@refObjectId': props.sourceId,
      '@version': props.sourceVersion,
    };

    expect(reviewReportReferenceKey(props.sourceId, props.sourceVersion)).toBe(
      `${props.sourceId}:${props.sourceVersion}`,
    );
    expect(reviewReportReferenceKey(props.sourceId)).toBeNull();
    expect(
      collectReviewReportReferenceKeys([
        {
          'common:referenceToCompleteReviewReport': [report, report, { '@refObjectId': 'missing' }],
        },
        {},
      ] as never),
    ).toEqual([`${props.sourceId}:${props.sourceVersion}`]);
  });
});
