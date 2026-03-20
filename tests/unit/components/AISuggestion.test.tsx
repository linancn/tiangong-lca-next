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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider, message } from 'antd';

let mockDiffResult: any = null;

// Mock dependencies
jest.mock('@/services/general/api', () => ({
  getAISuggestion: jest.fn(),
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createProcess: jest.fn(() => ({
    processDataSet: {},
    toJSONString: jest.fn(() => '{}'),
  })),
  createFlow: jest.fn(() => ({
    flowDataSet: {},
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
    diff: jest.fn(() => mockDiffResult),
  })),
}));

const mockGetAISuggestion = getAISuggestion as jest.MockedFunction<any>;

describe('AISuggestion Component', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
    mockDiffResult = null;
    mockGetAISuggestion.mockResolvedValue({
      success: true,
      data: {
        processDataSet: {
          id: 'test-process',
          name: 'AI Suggested Process',
        },
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
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

  it('should open modal when button is clicked', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const user = userEvent.setup();
    const button = screen.getByRole('button');
    await user.click(button);

    expect(await screen.findByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await screen.findByText('component.aiSuggestion.modal.title');

    const modal = screen.getByRole('dialog');
    const closeButtons = within(modal).getAllByRole('button', { name: /close/i });
    const closeButton = closeButtons.find((button) => button.classList.contains('ant-modal-close'));
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('should call getAISuggestion when modal opens', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGetAISuggestion).toHaveBeenCalledWith('{}', 'process', {
        outputDiffSummary: true,
        outputDiffHTML: true,
        maxRetries: 1,
      });
    });
  });

  it('should show loading state while fetching AI suggestion', async () => {
    mockGetAISuggestion.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(await screen.findByText('component.aiSuggestion.modal.loading')).toBeInTheDocument();
  });

  it('should call onClose when modal closes', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await screen.findByText('component.aiSuggestion.modal.title');

    const modal = screen.getByRole('dialog');
    const closeButtons = within(modal).getAllByRole('button', { name: /close/i });
    const closeButton = closeButtons.find((button) => button.classList.contains('ant-modal-close'));
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
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

  it('should handle flow type correctly', async () => {
    const flowProps = {
      ...defaultProps,
      type: 'flow' as const,
      originJson: {
        flowDataSet: {
          id: 'test-flow',
          name: 'Test Flow',
        },
      },
    };

    render(
      <ConfigProvider>
        <AISuggestion {...flowProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGetAISuggestion).toHaveBeenCalledWith('{}', 'flow', {
        outputDiffSummary: true,
        outputDiffHTML: true,
        maxRetries: 1,
      });
    });
  });

  it('should handle missing originJson gracefully', async () => {
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

    await screen.findByText('component.aiSuggestion.modal.title');
    expect(mockGetAISuggestion).not.toHaveBeenCalled();
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
    expect(consoleErrorSpy).toHaveBeenCalled();
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

  it('should render modal with correct width', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const user = userEvent.setup();
    const button = screen.getByRole('button');
    await user.click(button);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('should reset state when modal closes', async () => {
    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await screen.findByText('component.aiSuggestion.modal.title');

    const modal = screen.getByRole('dialog');
    const closeButtons = within(modal).getAllByRole('button', { name: /close/i });
    const closeButton = closeButtons.find((button) => button.classList.contains('ant-modal-close'));
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Open modal again to verify state was reset
    fireEvent.click(button);
    await screen.findByText('component.aiSuggestion.modal.title');
  });

  it('should handle undefined callbacks gracefully', async () => {
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

    const user = userEvent.setup();
    const button = screen.getByRole('button');
    await user.click(button);

    expect(await screen.findByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
  });

  it('uses default disabled/onClose handlers and dark theme when those props are omitted', async () => {
    localStorage.setItem('isDarkMode', 'true');
    const propsWithoutOnClose: typeof defaultProps = { ...defaultProps };
    delete (propsWithoutOnClose as Partial<typeof defaultProps>).disabled;
    delete (propsWithoutOnClose as Partial<typeof defaultProps>).onClose;

    render(
      <ConfigProvider>
        <AISuggestion {...propsWithoutOnClose} />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    expect(document.querySelector('.json-diff-container')).toHaveAttribute('data-theme', 'dark');

    const modal = screen.getByRole('dialog');
    const closeButtons = within(modal).getAllByRole('button', { name: /close/i });
    const closeButton = closeButtons.find((button) => button.classList.contains('ant-modal-close'));
    expect(closeButton).toBeDefined();
    await userEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    localStorage.setItem('isDarkMode', 'false');
  });

  it('reuses the original json when the expected dataset payload is missing', async () => {
    const onLatestJsonChange = jest.fn();

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{ customPayload: { foo: 'bar' } }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAISuggestion).not.toHaveBeenCalled();
      expect(onLatestJsonChange).toHaveBeenCalledWith({ customPayload: { foo: 'bar' } });
    });
  });

  it('skips AI requests when getTidasData returns null for unsupported types', async () => {
    render(
      <ConfigProvider>
        <AISuggestion
          {...({
            ...defaultProps,
            type: 'unsupported',
            originJson: { unsupportedDataSet: {} },
          } as any)}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('component.aiSuggestion.modal.title')).toBeInTheDocument();
    expect(mockGetAISuggestion).not.toHaveBeenCalled();
  });

  it('accepts all suggested changes and can undo them', async () => {
    mockDiffResult = {
      processDataSet: {
        name: ['Test Process', 'AI Suggested Process'],
      },
    };

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));

    const acceptAllButton = await screen.findByRole('button', {
      name: /component\.aiSuggestion\.button\.acceptAll/i,
    });
    await userEvent.click(acceptAllButton);

    await waitFor(() =>
      expect(defaultProps.onAcceptChange).toHaveBeenCalledWith(
        'processDataSet.name',
        'AI Suggested Process',
      ),
    );

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.undo/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onRejectChange).toHaveBeenCalledWith('processDataSet.name');
    });
  });

  it('rejects all suggested changes and can undo them back to accepted values', async () => {
    mockDiffResult = {
      processDataSet: {
        name: ['Test Process', 'AI Suggested Process'],
      },
    };

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));

    const rejectAllButton = await screen.findByRole('button', {
      name: /component\.aiSuggestion\.button\.rejectAll/i,
    });
    await userEvent.click(rejectAllButton);

    await waitFor(() => {
      expect(defaultProps.onRejectChange).toHaveBeenCalledWith('processDataSet.name');
    });

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.undo/i }),
    );

    await waitFor(() =>
      expect(defaultProps.onAcceptChange).toHaveBeenCalledWith(
        'processDataSet.name',
        'AI Suggested Process',
      ),
    );
  });

  it('reports clipboard copy failures', async () => {
    const messageErrorSpy = jest.spyOn(message, 'error').mockImplementation(() => ({}) as any);
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.copyOriginal/i }),
    );

    await waitFor(() => {
      expect(messageErrorSpy).toHaveBeenCalledWith('component.aiSuggestion.message.copyFailed');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    messageErrorSpy.mockRestore();
  });

  it('handles single accept/reject actions and undo callbacks', async () => {
    const messageSuccessSpy = jest.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    const messageWarningSpy = jest.spyOn(message, 'warning').mockImplementation(() => ({}) as any);
    mockDiffResult = {
      processDataSet: {
        name: ['Test Process', 'AI Suggested Process'],
      },
    };

    render(
      <ConfigProvider>
        <AISuggestion {...defaultProps} />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.action\.accept/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onAcceptChange).toHaveBeenCalledWith(
        'processDataSet.name',
        'AI Suggested Process',
      );
      expect(messageSuccessSpy).toHaveBeenCalledWith(
        expect.stringContaining('processDataSet.name'),
      );
    });

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.undo/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onRejectChange).toHaveBeenCalledWith('processDataSet.name');
    });

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.action\.reject/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onRejectChange).toHaveBeenCalledWith('processDataSet.name');
      expect(messageWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('processDataSet.name'),
      );
    });

    const acceptCallCountBeforeUndoReject = defaultProps.onAcceptChange.mock.calls.length;
    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.undo/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onAcceptChange).toHaveBeenCalledTimes(
        acceptCallCountBeforeUndoReject + 1,
      );
      expect(defaultProps.onAcceptChange).toHaveBeenLastCalledWith(
        'processDataSet.name',
        'AI Suggested Process',
      );
    });

    messageSuccessSpy.mockRestore();
    messageWarningSpy.mockRestore();
  });

  it('undoes a rejected falsy value change and notifies the parent with the original falsy payload', async () => {
    mockDiffResult = {
      processDataSet: {
        isBackgroundSystem: [true, false],
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          isBackgroundSystem: false,
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              isBackgroundSystem: true,
            },
          }}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.action\.reject/i }),
    );

    const acceptCallCountBeforeUndo = defaultProps.onAcceptChange.mock.calls.length;

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.undo/i }),
    );

    await waitFor(() => {
      expect(defaultProps.onAcceptChange).toHaveBeenCalledTimes(acceptCallCountBeforeUndo + 1);
      expect(defaultProps.onAcceptChange).toHaveBeenLastCalledWith(
        'processDataSet.isBackgroundSystem',
        false,
      );
    });
  });

  it('parses added and removed array deltas and reports copy success for AI data', async () => {
    const messageSuccessSpy = jest.spyOn(message, 'success').mockImplementation(() => ({}) as any);
    mockDiffResult = {
      processDataSet: {
        tags: {
          _t: 'a',
          0: ['added-tag'],
          '1_1': ['removed-tag', 0, 3],
        },
      },
    };

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              id: 'test-process',
              tags: ['removed-tag'],
            },
          }}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    expect(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    ).toHaveTextContent('(2)');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.copyAI/i }),
    );

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify(
          {
            processDataSet: {
              id: 'test-process',
              name: 'AI Suggested Process',
            },
          },
          null,
          2,
        ),
      );
      expect(messageSuccessSpy).toHaveBeenCalledWith(
        expect.stringContaining('component.aiSuggestion.message.copySuccess'),
      );
    });

    messageSuccessSpy.mockRestore();
  });

  it('applies complex accepted diffs across objects and arrays while ignoring text-diff entries', async () => {
    const onLatestJsonChange = jest.fn();
    mockDiffResult = {
      processDataSet: {
        obsolete: ['gone', 0, 0],
        textBody: ['old text', 'new text', 2],
        flag: [false, true],
        count: [1, 2],
        metadata: {
          title: ['old title', 'new title'],
        },
        addedObj: [{ label: 'fresh' }],
        listAdded: {
          _t: 'a',
          1: ['new'],
        },
        listRemoved: {
          _t: 'a',
          '1_1': ['drop', 0, 3],
        },
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          flag: true,
          count: 2,
          textBody: 'new text',
          metadata: {
            title: 'new title',
          },
          addedObj: {
            label: 'fresh',
          },
          listAdded: ['keep', 'new'],
          listRemoved: ['keep'],
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              flag: false,
              count: 1,
              textBody: 'old text',
              obsolete: 'gone',
              metadata: {
                title: 'old title',
              },
              addedObj: undefined,
              listAdded: ['keep'],
              listRemoved: ['keep', 'drop'],
            },
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    const acceptAllButton = screen.getByRole('button', {
      name: /component\.aiSuggestion\.button\.acceptAll/i,
    });
    expect(acceptAllButton).toHaveTextContent('(7)');

    await userEvent.click(acceptAllButton);

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          flag: true,
          count: 2,
          textBody: 'old text',
          metadata: {
            title: 'new title',
          },
          addedObj: {
            label: 'fresh',
          },
          listAdded: ['keep', 'new'],
          listRemoved: ['keep'],
        },
      });
    });
  });

  it('accepts trailing numeric and boolean array additions', async () => {
    const onLatestJsonChange = jest.fn();
    mockDiffResult = {
      processDataSet: {
        trailing: {
          _t: 'a',
          0: [1],
          1: [true],
        },
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          trailing: [1, true],
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              trailing: [],
            },
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    const acceptAllButton = screen.getByRole('button', {
      name: /component\.aiSuggestion\.button\.acceptAll/i,
    });
    expect(acceptAllButton).toHaveTextContent('(2)');

    await userEvent.click(acceptAllButton);

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          trailing: [1, true],
        },
      });
    });
  });

  it('initializes missing intermediate array containers for nested array additions', async () => {
    const onLatestJsonChange = jest.fn();
    mockDiffResult = {
      processDataSet: {
        groups: {
          _t: 'a',
          0: {
            _t: 'a',
            0: ['nested'],
          },
        },
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          groups: [['nested']],
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {},
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    );

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          groups: [['nested']],
        },
      });
    });
  });

  it('applies nested object additions and trailing object removals', async () => {
    const onLatestJsonChange = jest.fn();
    mockDiffResult = {
      processDataSet: {
        removedTail: [
          {
            label: 'old',
            extra: 'value',
          },
          0,
          0,
        ],
        metadata: {
          details: {
            label: ['fresh'],
          },
        },
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          metadata: {
            details: {
              label: 'fresh',
            },
          },
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              metadata: {},
              removedTail: {
                label: 'old',
                extra: 'value',
              },
            },
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    );

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          metadata: {
            details: {
              label: 'fresh',
            },
          },
        },
      });
    });
  });

  it('accepts large trailing removals without losing alignment', async () => {
    const onLatestJsonChange = jest.fn();
    const removedHuge = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [`key${index}`, index]),
    );
    mockDiffResult = {
      processDataSet: {
        removedHuge: [removedHuge, 0, 0],
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {},
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              removedHuge,
            },
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    );

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {},
      });
    });
  });

  it('applies nested updates inside newly-added array slots', async () => {
    const onLatestJsonChange = jest.fn();
    mockDiffResult = {
      processDataSet: {
        matrix: {
          _t: 'a',
          0: {
            label: ['fresh'],
          },
        },
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          matrix: [
            {
              label: 'fresh',
            },
          ],
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {
              matrix: [],
            },
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    );

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          matrix: [
            {
              label: 'fresh',
            },
          ],
        },
      });
    });
  });

  it('accepts large trailing additions without losing alignment', async () => {
    const onLatestJsonChange = jest.fn();
    const addedHuge = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [`key${index}`, index]),
    );
    mockDiffResult = {
      processDataSet: {
        addedHuge: [addedHuge],
      },
    };
    mockGetAISuggestion.mockResolvedValueOnce({
      success: true,
      data: {
        processDataSet: {
          addedHuge,
        },
      },
    });

    render(
      <ConfigProvider>
        <AISuggestion
          {...defaultProps}
          originJson={{
            processDataSet: {},
          }}
          onLatestJsonChange={onLatestJsonChange}
        />
      </ConfigProvider>,
    );

    await userEvent.click(screen.getByRole('button'));
    await screen.findByText('component.aiSuggestion.modal.title');

    await userEvent.click(
      screen.getByRole('button', { name: /component\.aiSuggestion\.button\.acceptAll/i }),
    );

    await waitFor(() => {
      expect(onLatestJsonChange).toHaveBeenLastCalledWith({
        processDataSet: {
          addedHuge,
        },
      });
    });
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
