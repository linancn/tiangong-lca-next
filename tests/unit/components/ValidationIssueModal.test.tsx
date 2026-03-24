import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { upsertValidationIssueNotification } from '@/services/notifications/api';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

let mockZIndexPopupBase: number | undefined = 1000;
let mockZIndexPopupBaseSequence: Array<number | undefined> | null = null;
let latestTableDataSource: any[] = [];
const mockMessageSuccess = jest.fn();
const mockMessageError = jest.fn();

jest.mock('@/services/notifications/api', () => ({
  upsertValidationIssueNotification: jest.fn(),
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => (
    <span>{defaultMessage ?? id}</span>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({
    children,
    disabled,
    loading,
    onClick,
    type,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: string;
  }) => (
    <button
      type='button'
      data-button-type={type}
      data-loading={loading ? 'true' : 'false'}
      disabled={disabled || loading}
      onClick={disabled || loading ? undefined : onClick}
    >
      {children}
    </button>
  );

  const ConfigProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  const Modal = ({
    children,
    closable,
    closeIcon,
    footer,
    onCancel,
    open,
    title,
    zIndex,
  }: {
    children?: React.ReactNode;
    closable?: boolean;
    closeIcon?: React.ReactNode;
    footer?: React.ReactNode;
    onCancel?: () => void;
    open?: boolean;
    title?: React.ReactNode;
    zIndex?: number;
  }) => {
    if (!open) {
      return null;
    }

    return (
      <div role='dialog' data-z-index={zIndex}>
        <div>{title}</div>
        {closable ? (
          <button aria-label='close' type='button' onClick={onCancel}>
            {closeIcon}
          </button>
        ) : null}
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    );
  };

  const Space = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  const Table = ({
    columns,
    dataSource,
    rowKey,
    scroll,
    sticky,
  }: {
    columns: Array<{
      title: React.ReactNode;
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, record: any, index: number) => React.ReactNode;
    }>;
    dataSource: any[];
    rowKey?: ((record: any) => string) | string;
    scroll?: {
      y?: number;
    };
    sticky?: boolean;
  }) => {
    latestTableDataSource = dataSource;
    return (
      <table data-scroll-y={scroll?.y} data-sticky={sticky ? 'true' : 'false'}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key ?? String(column.dataIndex)}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr
              key={
                typeof rowKey === 'function'
                  ? rowKey(record)
                  : typeof rowKey === 'string'
                    ? String(record[rowKey] ?? rowIndex)
                    : rowIndex
              }
            >
              {columns.map((column) => {
                const value = column.dataIndex ? record[column.dataIndex] : undefined;
                const content = column.render?.(value, record, rowIndex) ?? value ?? null;
                return <td key={column.key ?? String(column.dataIndex)}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Modal,
    Space,
    Table,
    message: {
      success: (...args: any[]) => mockMessageSuccess(...args),
      error: (...args: any[]) => mockMessageError(...args),
    },
    theme: {
      useToken: () => ({
        token: {
          borderRadiusLG: 8,
          colorBorderSecondary: '#f0f0f0',
          colorPrimary: '#5C246A',
          colorText: '#1f1f1f',
          colorTextDisabled: '#bfbfbf',
          colorTextHeading: '#141414',
          colorTextSecondary: '#8c8c8c',
          get zIndexPopupBase() {
            if (mockZIndexPopupBaseSequence && mockZIndexPopupBaseSequence.length > 0) {
              return mockZIndexPopupBaseSequence.shift();
            }
            return mockZIndexPopupBase;
          },
          fontSizeHeading4: 20,
          fontSizeLG: 16,
          fontWeightStrong: 600,
          lineHeight: 1.5715,
          marginSM: 12,
        },
      }),
    },
  };
});

describe('ValidationIssueModal', () => {
  const mockUpsertValidationIssueNotification =
    upsertValidationIssueNotification as jest.MockedFunction<any>;
  const intl = {
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => {
      const messages: Record<string, string> = {
        'pages.validationIssues.downloadHtml': '下载 HTML',
        'pages.validationIssues.datasetType.contact': '联系人',
        'pages.validationIssues.datasetType.source': '来源',
        'pages.validationIssues.datasetType.unitgroup': '单位组',
        'pages.validationIssues.datasetType.flowproperty': '流属性',
        'pages.validationIssues.datasetType.flow': '流',
        'pages.validationIssues.datasetType.process': '过程',
        'pages.validationIssues.datasetType.lifecyclemodel': '模型',
        'pages.validationIssues.table.issue': '问题',
        'pages.validationIssues.table.user': '数据拥有者',
        'pages.validationIssues.table.action': '操作',
        'pages.validationIssues.issue.nonExistentRef': '数据不存在',
        'pages.validationIssues.issue.ruleVerificationFailed': '数据校验不通过',
        'pages.validationIssues.issue.sdkInvalid': '当前数据集校验失败',
        'pages.validationIssues.confirm': '知道了',
        'pages.process.view.processInformation': '过程信息',
        'pages.process.view.modellingAndValidation': '建模信息',
        'pages.process.view.administrativeInformation': '管理信息',
        'pages.process.view.exchanges': '输入/输出',
        'pages.validationIssues.fixIssue': '修复问题',
        'pages.validationIssues.notifyDataOwner': '通知数据拥有者',
        'pages.validationIssues.dataOwnerNotified': '已通知',
        'pages.validationIssues.notifyDataOwner.ownerMissing': '无法识别数据拥有者。',
        'pages.validationIssues.notifyDataOwner.success': '已通知数据拥有者。',
        'pages.validationIssues.notifyDataOwner.error': '通知数据拥有者失败。',
      };

      return messages[id] ?? defaultMessage ?? id;
    },
  };

  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
    mockZIndexPopupBase = 1000;
    mockZIndexPopupBaseSequence = null;
    latestTableDataSource = [];
    mockMessageSuccess.mockReset();
    mockMessageError.mockReset();
    mockUpsertValidationIssueNotification.mockReset();
    mockUpsertValidationIssueNotification.mockResolvedValue({ success: true, error: null });
    localStorage.setItem('isDarkMode', 'false');
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: () => {},
        writable: true,
      });
    }
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders a closable modal with enabled fix issue button and jumps on click', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: true,
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ownerName: '流程拥有者',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('数据校验问题')).toBeInTheDocument();
    expect(screen.getByText('数据拥有者')).toBeInTheDocument();
    expect(screen.getByText('流程拥有者')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '知道了' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-z-index', '2000');

    const fixIssueButton = screen.getByRole('button', { name: '修复问题' });
    expect(fixIssueButton).toBeInTheDocument();

    fireEvent.click(fixIssueButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
      '_blank',
      'noopener,noreferrer',
    );

    await act(async () => {
      modalHandle?.destroy();
    });
    windowOpenSpy.mockRestore();
  });

  it('renders notify data owner when the issue belongs to another account', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/processes?id=process-2&version=01.00.000',
            ownerName: '其他拥有者',
            ownerUserId: 'owner-user-2',
            ref: {
              '@refObjectId': 'process-2',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    const notifyButton = screen.getByRole('button', { name: '通知数据拥有者' });
    expect(notifyButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修复问题' })).not.toBeInTheDocument();

    fireEvent.click(notifyButton);

    await waitFor(() => {
      expect(mockUpsertValidationIssueNotification).toHaveBeenCalledWith({
        recipientUserId: 'owner-user-2',
        ref: {
          '@refObjectId': 'process-2',
          '@type': 'process data set',
          '@version': '01.00.000',
        },
        link: 'http://localhost:8000/mydata/processes?id=process-2&version=01.00.000',
        issues: [
          {
            code: 'ruleVerificationFailed',
            tabName: undefined,
            tabNames: undefined,
            underReviewVersion: undefined,
          },
        ],
      });
    });
    expect(mockMessageSuccess).toHaveBeenCalledWith('已通知数据拥有者。');
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: '已通知' })).toBeDisabled();

    await act(async () => {
      modalHandle?.destroy();
    });
    windowOpenSpy.mockRestore();
  });

  it('shows an error when notifying data owner without a resolved owner id', async () => {
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/processes?id=process-3&version=01.00.000',
            ownerName: '未知拥有者',
            ref: {
              '@refObjectId': 'process-3',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    fireEvent.click(screen.getByRole('button', { name: '通知数据拥有者' }));

    expect(mockMessageError).toHaveBeenCalledWith('无法识别数据拥有者。');
    expect(mockUpsertValidationIssueNotification).not.toHaveBeenCalled();

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('shows an error when notifying data owner fails', async () => {
    mockUpsertValidationIssueNotification.mockResolvedValueOnce({
      success: false,
      error: new Error('notify failed'),
    });
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/processes?id=process-4&version=01.00.000',
            ownerName: '失败拥有者',
            ownerUserId: 'owner-user-4',
            ref: {
              '@refObjectId': 'process-4',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    fireEvent.click(screen.getByRole('button', { name: '通知数据拥有者' }));

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('通知数据拥有者失败。');
    });
    expect(screen.getByRole('button', { name: '通知数据拥有者' })).toBeInTheDocument();

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('falls back to a generic error when notifying data owner fails without an error payload', async () => {
    mockUpsertValidationIssueNotification.mockResolvedValueOnce({
      success: false,
      error: undefined,
    });
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/processes?id=process-4b&version=01.00.000',
            ownerName: '失败拥有者',
            ownerUserId: 'owner-user-4b',
            ref: {
              '@refObjectId': 'process-4b',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    fireEvent.click(screen.getByRole('button', { name: '通知数据拥有者' }));

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('通知数据拥有者失败。');
    });
    expect(screen.getByRole('button', { name: '通知数据拥有者' })).toBeInTheDocument();

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('renders non existent issues as dataset does not exist and disables the fix issue button', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'nonExistentRef',
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    expect(screen.getByText('数据不存在')).toBeInTheDocument();

    const fixIssueButton = screen.getByRole('button', { name: '修复问题' });
    expect(fixIssueButton).toBeDisabled();

    fireEvent.click(fixIssueButton);
    expect(windowOpenSpy).not.toHaveBeenCalled();

    await act(async () => {
      modalHandle?.destroy();
    });
    windowOpenSpy.mockRestore();
  });

  it('merges issues with the same dataset into one row and lists all issue messages', async () => {
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
            tabNames: [
              'processInformation',
              'modellingAndValidation',
              'administrativeInformation',
              'exchanges',
            ],
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(
      screen.getByText('当前数据集校验失败(过程信息，建模信息，管理信息，输入/输出)'),
    ).toBeInTheDocument();
    expect(screen.getByText('数据校验不通过')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '修复问题' })).toHaveLength(1);

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('hydrates grouped owner metadata from later issues when the first row is sparse', async () => {
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ownerName: '   ',
            ownerUserId: '   ',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ownerName: ' 后续拥有者 ',
            ownerUserId: ' user-2 ',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
            tabNames: ['processInformation'],
          },
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/contacts?id=contact-1&version=01.00.000',
            ownerName: ' 联系人拥有者 ',
            ref: {
              '@refObjectId': 'contact-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            isOwnedByCurrentUser: true,
            link: 'http://localhost:8000/mydata/contacts?id=contact-1&version=01.00.000',
            ref: {
              '@refObjectId': 'contact-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
            tabNames: ['contactInformation'],
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    const processRow = latestTableDataSource.find((row) => row.ref['@refObjectId'] === 'process-1');
    const contactRow = latestTableDataSource.find((row) => row.ref['@refObjectId'] === 'contact-1');

    expect(processRow).toMatchObject({
      isOwnedByCurrentUser: false,
      ownerName: '后续拥有者',
      ownerUserId: 'user-2',
    });
    expect(contactRow).toMatchObject({
      isOwnedByCurrentUser: true,
      ownerName: '联系人拥有者',
    });

    expect(screen.getByText('后续拥有者')).toBeInTheDocument();
    expect(screen.getByText('联系人拥有者')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '通知数据拥有者' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修复问题' })).toBeInTheDocument();

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('keeps the table header fixed and sorts rows by the required dataset type order', async () => {
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/models?id=model-1&version=01.00.000',
            ref: {
              '@refObjectId': 'model-1',
              '@type': 'lifeCycleModel data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: true,
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ownerName: '过程拥有者',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/flows?id=flow-1&version=01.00.000',
            ref: {
              '@refObjectId': 'flow-1',
              '@type': 'flow data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/contacts?id=contact-1&version=01.00.000',
            ownerName: '联系人拥有者',
            ref: {
              '@refObjectId': 'contact-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    expect(screen.getByRole('table')).toHaveAttribute('data-scroll-y', '360');
    expect(screen.getByRole('table')).toHaveAttribute('data-sticky', 'true');

    const rowTexts = Array.from(document.querySelectorAll('tbody tr')).map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(rowTexts).toEqual([
      expect.stringContaining('联系人'),
      expect.stringContaining('流'),
      expect.stringContaining('过程'),
      expect.stringContaining('模型'),
    ]);
    expect(rowTexts[0]).toContain('contact-1');
    expect(rowTexts[1]).toContain('flow-1');
    expect(rowTexts[2]).toContain('process-1');
    expect(rowTexts[3]).toContain('model-1');

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('exports html table with the same action column content as the modal', async () => {
    const createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:validation-issues');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: true,
            link: 'http://localhost:8000/mydata/processes?id=process-1&version=01.00.000',
            ownerName: '过程拥有者',
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: false,
            link: 'http://localhost:8000/mydata/contacts?id=contact-1&version=01.00.000',
            ownerName: '联系人拥有者',
            ref: {
              '@refObjectId': 'contact-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'nonExistentRef',
            link: 'http://localhost:8000/mydata/processes?id=process-2&version=01.00.000',
            ref: {
              '@refObjectId': 'process-2',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '数据校验问题',
      }) as { destroy: () => void };
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '下载 HTML' }));
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    expect(html).toContain('<th>数据拥有者</th>');
    expect(html).toContain('<th>操作</th>');
    expect(html).not.toContain('<th>链接</th>');
    expect(html).toContain('>联系人拥有者<');
    expect(html).toContain('>过程拥有者<');
    expect(html).toContain('>修复问题<');
    expect(html).not.toContain('>通知数据拥有者<');
    expect(html).toContain('<td>-</td>');
    expect(html).toContain('class="action-link"');
    expect(html).toContain('class="action-link-disabled"');
    expect(html.indexOf('contact-1')).toBeLessThan(html.indexOf('process-1'));
    expect(html.indexOf('process-1')).toBeLessThan(html.indexOf('process-2'));

    await act(async () => {
      modalHandle?.destroy();
    });
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('clicks the generated download link outside jsdom environments', async () => {
    const createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:validation-issues-browser');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const originalUserAgent = window.navigator.userAgent;
    let modalHandle: { destroy: () => void } | null = null;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
    });

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            isOwnedByCurrentUser: true,
            link: 'http://localhost:8000/mydata/processes?id=process-browser&version=01.00.000',
            ownerName: '浏览器下载分支',
            ref: {
              '@refObjectId': 'process-browser',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '浏览器下载分支',
      }) as { destroy: () => void };
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '下载 HTML' }));
    });

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      modalHandle?.destroy();
    });

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    anchorClickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('returns null when issues are empty and closes via confirm/cancel with default title', async () => {
    expect(showValidationIssueModal({ intl, issues: [] })).toBeNull();

    let modalHandle: { destroy: () => void } | null = null;
    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=process-9&version=01.00.000',
            ref: {
              '@refObjectId': 'process-9',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
      }) as { destroy: () => void };
    });

    expect(screen.getByText('Validation issues')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '知道了' }));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      modalHandle?.destroy();
      modalHandle?.destroy();
    });

    await act(async () => {
      showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=process-10&version=01.00.000',
            ref: {
              '@refObjectId': 'process-10',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: '关闭校验框',
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('covers all issue codes, type fallbacks, duplicate filtering and html escaping', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:validation-issues-2');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'underReview',
            link: '',
            ref: {
              '@refObjectId': 'contact-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'versionUnderReview',
            underReviewVersion: undefined,
            link: '',
            ref: {
              '@refObjectId': 'source-1',
              '@type': 'source data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'versionIsInTg',
            link: '',
            ref: {
              '@refObjectId': 'unit-1',
              '@type': 'unit group data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: [''],
            ref: {
              '@refObjectId': 'contact-sdk-empty-tab',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            // cover tabNames ?? [] fallback branch
            tabNames: ['basicInformation'],
            ref: {
              '@refObjectId': 'contact-sdk-1',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: undefined,
            ref: {
              '@refObjectId': 'contact-sdk-without-tab-names',
              '@type': 'contact data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['basicInformation'],
            ref: {
              '@refObjectId': 'source-sdk-1',
              '@type': 'source data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['basicInformation'],
            ref: {
              '@refObjectId': 'unit-sdk-1',
              '@type': 'unit group data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['baseData', 'baseData'],
            ref: {
              '@refObjectId': 'flowProperty-1',
              '@type': 'flow property data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['baseData'],
            ref: {
              '@refObjectId': 'flow-1',
              '@type': 'flow data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['processInformation', 'unknownTab'],
            ref: {
              '@refObjectId': 'process-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['generalInformation'],
            ref: {
              '@refObjectId': 'model-1',
              '@type': 'lifeCycleModel data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'mysteryCode' as any,
            link: '',
            ref: {
              '@refObjectId': 'unknown-1',
              '@type': 'mystery data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'sdkInvalid',
            link: '',
            tabNames: ['mysteryTab'],
            ref: {
              '@refObjectId': 'unknown-sdk-1',
              '@type': 'mystery data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            link: '',
            ref: {
              '@refObjectId': 'dup-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=dup-1&version=01.00.000',
            ref: {
              '@refObjectId': 'dup-1',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=escape-1&version=01.00.000&name=<x>',
            ownerName: 'owner<&"',
            ref: {
              '@refObjectId': '<id&"',
              '@type': 'process data set',
              '@version': "01.00.000'",
            },
          },
        ],
        title: '覆盖所有分支',
      }) as { destroy: () => void };
    });

    expect(screen.getByText('Dataset is under review')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Another version {underReviewVersion} of this dataset is already under review',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Current version is lower than the published version'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('当前数据集校验失败(baseData)').length).toBeGreaterThan(1);
    expect(screen.getAllByText('当前数据集校验失败(basicInformation)').length).toBeGreaterThan(2);
    expect(screen.getAllByText('当前数据集校验失败').length).toBeGreaterThan(1);
    expect(screen.getByText('当前数据集校验失败(过程信息，unknownTab)')).toBeInTheDocument();
    expect(screen.getByText('当前数据集校验失败(generalInformation)')).toBeInTheDocument();
    expect(screen.getByText('当前数据集校验失败(mysteryTab)')).toBeInTheDocument();
    expect(screen.getByText('mysteryCode')).toBeInTheDocument();
    expect(screen.getAllByText('mystery data set').length).toBeGreaterThan(1);
    expect(screen.getByText('<id&"')).toBeInTheDocument();
    expect(screen.getByText("01.00.000'")).toBeInTheDocument();
    expect(screen.getByText('owner<&"')).toBeInTheDocument();
    expect(screen.getAllByText('数据校验不通过').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: '修复问题' })[0]);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'http://localhost:8000/mydata/processes?id=dup-1&version=01.00.000',
      '_blank',
      'noopener,noreferrer',
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '下载 HTML' }));
    });

    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    expect(html).toContain('&lt;id&amp;&quot;');
    expect(html).toContain('01.00.000&#39;');
    expect(html).toContain('name=&lt;x&gt;');
    expect(html).toContain('owner&lt;&amp;&quot;');
    expect(html).toContain('class="action-link"');
    expect(html).toContain('>mystery data set<');

    await act(async () => {
      modalHandle?.destroy();
    });
    windowOpenSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('falls back to default modal z-index when token base z-index is missing', async () => {
    mockZIndexPopupBase = undefined;
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: '',
            ref: {
              '@refObjectId': 'z-index-fallback',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: 'z-index fallback',
      }) as { destroy: () => void };
    });

    expect(screen.getByRole('dialog')).toHaveAttribute('data-z-index', '2000');

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('falls back to 1000 when zIndexPopupBase changes to undefined between reads', async () => {
    mockZIndexPopupBaseSequence = [2, undefined];
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: '',
            ref: {
              '@refObjectId': 'z-index-dynamic-fallback',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: 'z-index dynamic fallback',
      }) as { destroy: () => void };
    });

    expect(screen.getByRole('dialog')).toHaveAttribute('data-z-index', '2000');

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('renders dash when issue description is undefined', async () => {
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: undefined as any,
            link: '',
            ref: {
              '@refObjectId': 'issue-code-undefined',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: 'issue fallback',
      }) as { destroy: () => void };
    });

    expect(screen.getAllByText('-').length).toBeGreaterThan(1);

    await act(async () => {
      modalHandle?.destroy();
    });
  });

  it('opens empty link when grouped issue link becomes undefined before click', async () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    let modalHandle: { destroy: () => void } | null = null;

    await act(async () => {
      modalHandle = showValidationIssueModal({
        intl,
        issues: [
          {
            code: 'ruleVerificationFailed',
            link: 'http://localhost:8000/mydata/processes?id=process-dynamic&version=01.00.000',
            ref: {
              '@refObjectId': 'process-dynamic',
              '@type': 'process data set',
              '@version': '01.00.000',
            },
          },
        ],
        title: 'dynamic link',
      }) as { destroy: () => void };
    });

    latestTableDataSource[0].link = undefined;
    fireEvent.click(screen.getByRole('button', { name: '修复问题' }));
    expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank', 'noopener,noreferrer');

    await act(async () => {
      modalHandle?.destroy();
    });
    windowOpenSpy.mockRestore();
  });
});
