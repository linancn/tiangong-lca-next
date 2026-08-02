import DatasetSubmitReviewButton from '@/components/DatasetSubmitReviewButton';
import { submitDatasetReviewApi } from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockMessageError = jest.fn();
const mockMessageSuccess = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  submitDatasetReviewApi: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

jest.mock('antd', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: import('react').ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type='button' disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  message: {
    error: (...args: unknown[]) => mockMessageError(...args),
    success: (...args: unknown[]) => mockMessageSuccess(...args),
  },
}));

const submitDatasetReviewApiMock = jest.mocked(submitDatasetReviewApi);

describe('DatasetSubmitReviewButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops before submission when the existing data check fails', async () => {
    const beforeSubmit = jest.fn().mockResolvedValue(false);

    render(
      <DatasetSubmitReviewButton
        table='contacts'
        id='contact-id'
        version='01.00.000'
        beforeSubmit={beforeSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

    await waitFor(() => expect(beforeSubmit).toHaveBeenCalledTimes(1));
    expect(submitDatasetReviewApiMock).not.toHaveBeenCalled();
  });

  it('submits the dataset and invokes the success callback', async () => {
    const onSuccess = jest.fn();
    submitDatasetReviewApiMock.mockResolvedValue({
      data: { review_id: 'review-id' },
      error: null,
    } as never);

    render(
      <DatasetSubmitReviewButton
        table='flows'
        id='flow-id'
        version='01.00.000'
        beforeSubmit={jest.fn().mockResolvedValue(true)}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

    await waitFor(() =>
      expect(submitDatasetReviewApiMock).toHaveBeenCalledWith('flows', 'flow-id', '01.00.000'),
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Review submitted successfully');
    expect(onSuccess).toHaveBeenCalledWith({ review_id: 'review-id' });
  });

  it('shows backend and fallback submission errors', async () => {
    submitDatasetReviewApiMock
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'backend rejected' },
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: {},
      } as never);

    const { rerender } = render(
      <DatasetSubmitReviewButton
        table='sources'
        id='source-id'
        version='01.00.000'
        beforeSubmit={jest.fn().mockResolvedValue(true)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));
    await waitFor(() => expect(mockMessageError).toHaveBeenCalledWith('backend rejected'));

    rerender(
      <DatasetSubmitReviewButton
        table='sources'
        id='source-id'
        version='01.00.000'
        beforeSubmit={jest.fn().mockResolvedValue(true)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

    await waitFor(() => expect(mockMessageError).toHaveBeenCalledWith('Submit review failed.'));
  });

  it('honors the disabled state and supports an omitted success callback', async () => {
    const beforeSubmit = jest.fn().mockResolvedValue(true);
    submitDatasetReviewApiMock.mockResolvedValue({ data: null, error: null } as never);

    const { rerender } = render(
      <DatasetSubmitReviewButton
        table='unitgroups'
        id='unitgroup-id'
        version='01.00.000'
        disabled
        beforeSubmit={beforeSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));
    expect(beforeSubmit).not.toHaveBeenCalled();

    rerender(
      <DatasetSubmitReviewButton
        table='unitgroups'
        id='unitgroup-id'
        version='01.00.000'
        beforeSubmit={beforeSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

    await waitFor(() => expect(mockMessageSuccess).toHaveBeenCalled());
  });
});
