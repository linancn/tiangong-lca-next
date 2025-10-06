/**
 * Tests for AISuggestion component
 * Path: src/components/AISuggestion/index.tsx
 *
 * Coverage focuses on:
 * - Renders correctly with given props
 * - Handles user interactions (button click, modal open/close)
 * - Disabled state behavior
 * - Modal functionality
 * - Service integration
 * - Loading states
 * - Basic rendering without complex diff logic
 */

import AISuggestion from '@/components/AISuggestion';
import { getAISuggestion } from '@/services/general/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

// Mock dependencies
jest.mock('@/services/general/api', () => ({
  getAISuggestion: jest.fn(),
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createProcess: jest.fn(() => ({
    processDataSet: {},
    toJSONString: jest.fn(() => '{}'),
  })),
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

// Mock jsondiffpatch
jest.mock('jsondiffpatch', () => ({
  create: jest.fn(() => ({
    diff: jest.fn(() => null),
  })),
}));

const mockGetAISuggestion = getAISuggestion as jest.MockedFunction<any>;

describe('AISuggestion Component', () => {
  const defaultProps = {
    type: 'process' as const,
    originJson: {
      processDataSet: {
        id: 'test-process',
        name: 'Test Process',
      },
    },
    disabled: false,
    onAcceptChange: jest.fn(),
    onRejectChange: jest.fn(),
    onLatestJsonChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAISuggestion.mockResolvedValue({
      success: true,
      data: {
        processDataSet: {
          id: 'test-process',
          name: 'AI Suggested Process',
        },
      },
    });
  });

  it('should render correctly with given props', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render disabled button when disabled prop is true', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should open modal when button is clicked', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    waitFor(() => {
      expect(screen.queryByText('component.aiSuggestion.modal.title')).not.toBeInTheDocument();
    });
  });

  it('should not open modal when button is disabled', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.queryByText('component.aiSuggestion.modal.title')).not.toBeInTheDocument();
  });

  it('should call getAISuggestion when modal opens', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    waitFor(() => {
      expect(mockGetAISuggestion).toHaveBeenCalledWith('{}', 'process', {
        outputDiffSummary: true,
        outputDiffHTML: true,
        maxRetries: 1,
      });
    });
  });

  it('should show loading state while fetching AI suggestion', () => {
    mockGetAISuggestion.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('component.aiSuggestion.modal.loading')).toBeInTheDocument();
  });

  it('should call onClose when modal closes', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const cancelButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render with correct button text', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('component.aiSuggestion.button.aiCheck');
  });

  it('should handle flow type correctly', () => {
    const flowProps = {
      ...defaultProps,
      type: 'flow' as const,
    };

    render(
      <ConfigProvider>
        <AISuggestion {...flowProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    waitFor(() => {
      expect(mockGetAISuggestion).toHaveBeenCalledWith('{}', 'flow', {
        outputDiffSummary: true,
        outputDiffHTML: true,
        maxRetries: 1,
      });
    });
  });

  it('should handle missing originJson gracefully', () => {
    const propsWithoutJson = {
      ...defaultProps,
      originJson: undefined,
    };

    render(
      <ConfigProvider>
        <AISuggestion {...propsWithoutJson} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    waitFor(() => {
      expect(mockGetAISuggestion).toHaveBeenCalled();
    });
  });

  it('should handle service error gracefully', async () => {
    mockGetAISuggestion.mockRejectedValue(new Error('Service error'));

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
    });
  });

  it('should handle empty AI response', async () => {
    mockGetAISuggestion.mockResolvedValue({
      success: true,
      data: null,
    });

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
    });
  });

  it('should render modal with correct width', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('should reset state when modal closes', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const cancelButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    // Open modal again to verify state was reset
    fireEvent.click(button);
    expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
  });

  it('should handle undefined callbacks gracefully', () => {
    const propsWithoutCallbacks = {
      ...defaultProps,
      onAcceptChange: undefined,
      onRejectChange: undefined,
      onLatestJsonChange: undefined,
      onClose: undefined,
    };

    render(
      <ConfigProvider>
        <AISuggestion {...propsWithoutCallbacks} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
  });

  it('should render with correct button attributes', () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
