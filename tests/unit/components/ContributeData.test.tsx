/**
 * Tests for ContributeData component
 * Path: src/components/ContributeData/index.tsx
 *
 * Coverage focuses on:
 * - Renders correctly with given props
 * - Handles user interactions (button click, modal confirmation)
 * - Disabled state behavior
 * - Modal confirmation flow
 */

import ContributeData from '@/components/ContributeData';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock antd Modal.confirm
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  Modal: {
    ...jest.requireActual('antd').Modal,
    confirm: jest.fn(),
  },
}));

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

describe('ContributeData Component', () => {
  const defaultProps = {
    onOk: jest.fn(),
    disabled: false,
  };

  const mockConfirm = jest.requireMock('antd').Modal.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with given props', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render disabled button when disabled prop is true', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show tooltip with correct text', async () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.mouseOver(button);

    // Wait for tooltip to appear
    await waitFor(() => {
      expect(screen.getByText('Contribute to team')).toBeInTheDocument();
    });
  });

  it('should open confirmation modal when button is clicked', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Contribute data',
        content: 'Are you sure you want to contribute this data?',
        okText: 'Confirm',
        cancelText: 'Cancel',
        onOk: defaultProps.onOk,
      }),
    );
  });

  it('should not open modal when button is disabled', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should call onOk callback when confirmation is accepted', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        onOk: defaultProps.onOk,
      }),
    );

    // Simulate confirmation acceptance
    const confirmCall = mockConfirm.mock.calls[0][0];
    confirmCall.onOk();

    expect(defaultProps.onOk).toHaveBeenCalledTimes(1);
  });

  it('should render with correct icon', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // The CloudUploadOutlined icon should be present
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should have correct button attributes', () => {
    render(
      <ConfigProvider>
        <ContributeData {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Check if button has the expected classes or data attributes instead of HTML attributes
    expect(button).toHaveClass('ant-btn-circle');
    expect(button).toHaveClass('ant-btn-sm');
  });
});
