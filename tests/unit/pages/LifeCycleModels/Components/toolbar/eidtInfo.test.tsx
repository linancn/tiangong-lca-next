// @ts-nocheck
import ToolbarEditInfo from '@/pages/LifeCycleModels/Components/toolbar/eidtInfo';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen } from '../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  const parentContextValue = { refCheckData: [] };
  return {
    __esModule: true,
    RefCheckContext: React.createContext(parentContextValue),
    useRefCheckContext: () => parentContextValue,
  };
});

jest.mock('@/pages/LifeCycleModels/Components/form', () => {
  const React = require('react');
  return {
    __esModule: true,
    LifeCycleModelForm: ({ children }: any) => (
      <div data-testid='life-cycle-model-form'>{children}</div>
    ),
  };
});

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon, htmlType = 'button' }: any) => (
    <button
      type={htmlType === 'submit' ? 'submit' : htmlType === 'reset' ? 'reset' : 'button'}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Space = ({ children, className }: any) => <div className={className ?? ''}>{children}</div>;

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Spin,
    message,
  };
});

const { message: mockAntdMessage } = jest.requireMock('antd');

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  InfoOutlined: () => <span>info-icon</span>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    path.forEach((key: string, index: number) => {
      if (index === path.length - 1) {
        cursor[key] = value;
      } else {
        cursor[key] = { ...(cursor[key] ?? {}) };
        cursor = cursor[key];
      }
    });
    return next;
  };

  const getNestedValue = (source: any, path: any[]) => {
    return path.reduce((acc: any, key: string) => (acc ? acc[key] : undefined), source);
  };

  const buildChangedValue = (path: any[], value: any) => {
    return path.reduceRight((acc: any, key: string) => ({ [key]: acc }), value);
  };

  const ProForm = ({
    formRef,
    initialValues = {},
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    const setValue = (namePath: any[], value: any) => {
      valuesRef.current = setNestedValue(valuesRef.current, namePath, value);
      const changed = buildChangedValue(namePath, value);
      onValuesChange?.(changed, { ...valuesRef.current });
    };

    const api = {
      submit: async () => onFinish?.({ ...valuesRef.current }),
      resetFields: () => {
        valuesRef.current = { ...initialValues };
      },
      setFieldsValue: (next: any) => {
        valuesRef.current = { ...valuesRef.current, ...next };
      },
      getFieldsValue: () => ({ ...valuesRef.current }),
      setFieldValue: (name: any, value: any) => {
        const path = Array.isArray(name) ? name : [name];
        setValue(path, value);
      },
      getFieldValue: (name: any) => {
        const path = Array.isArray(name) ? name : [name];
        return getNestedValue(valuesRef.current, path);
      },
      validateFields: async () => valuesRef.current,
    };

    React.useLayoutEffect(() => {
      if (formRef) {
        formRef.current = api;
      }
    }, [formRef]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.({ ...valuesRef.current });
        }}
      >
        {typeof children === 'function' ? children(valuesRef.current) : children}
        {submitter?.render?.() ?? null}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
    ProFormInstance: {},
  };
});

const mockCheckReferences = jest.fn();
const mockCheckRequiredFields = jest.fn().mockReturnValue({ checkResult: true, tabName: '' });
const mockDealModel = jest.fn();
const mockDealProcress = jest.fn();
const mockCheckVersions = jest.fn().mockResolvedValue(undefined);
const mockGetAllRefObj = jest.fn().mockReturnValue([]);
const mockUpdateReviewsAfterCheckData = jest.fn().mockResolvedValue({});
const mockUpdateUnReviewToUnderReview = jest.fn().mockResolvedValue({});

function MockReffPath() {}
MockReffPath.prototype.findProblemNodes = function () {
  return [];
};

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  checkVersions: (...args: any[]) => mockCheckVersions(...args),
  checkRequiredFields: (...args: any[]) => mockCheckRequiredFields(...args),
  dealModel: (...args: any[]) => mockDealModel(...args),
  dealProcress: (...args: any[]) => mockDealProcress(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  ReffPath: MockReffPath,
  updateReviewsAfterCheckData: (...args: any[]) => mockUpdateReviewsAfterCheckData(...args),
  updateUnReviewToUnderReview: (...args: any[]) => mockUpdateUnReviewToUnderReview(...args),
}));

const mockGetLifeCycleModelDetail = jest.fn();
jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
}));

const mockGetProcessDetail = jest.fn();
jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGetUserTeamId = jest.fn().mockResolvedValue('team-1');
jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: () => 'uuid-1',
}));

beforeEach(() => {
  Object.values(mockAntdMessage).forEach((fn) => fn.mockReset());
  mockCheckReferences.mockReset();
  mockCheckRequiredFields.mockReset().mockReturnValue({ checkResult: true, tabName: '' });
  mockDealModel.mockReset();
  mockDealProcress.mockReset();
  mockCheckVersions.mockReset().mockResolvedValue(undefined);
  mockGetAllRefObj.mockReset().mockReturnValue([]);
  mockGetLifeCycleModelDetail.mockReset();
  mockGetProcessDetail.mockReset();
  mockGetUserTeamId.mockReset().mockResolvedValue('team-1');
  mockUpdateReviewsAfterCheckData.mockReset().mockResolvedValue({});
  mockUpdateUnReviewToUnderReview.mockReset().mockResolvedValue({});
});

describe('ToolbarEditInfo', () => {
  const baseProps = {
    lang: 'en',
    data: { id: 'model-1', version: '1.0' },
    onData: jest.fn(),
    action: 'edit',
  };

  it('validates missing nodes when checking data', async () => {
    const ref = React.createRef<any>();
    render(<ToolbarEditInfo ref={ref} {...baseProps} />);

    const result = await ref.current?.handleCheckData('checkData', [], []);

    expect(mockAntdMessage.error).toHaveBeenCalledWith('Please add node');
    expect(result).toEqual({ checkResult: false, unReview: [] });
    expect(mockGetLifeCycleModelDetail).not.toHaveBeenCalled();
  });

  it('validates missing edges when nodes provided', async () => {
    const ref = React.createRef<any>();
    render(<ToolbarEditInfo ref={ref} {...baseProps} />);

    const nodes = [{ data: { quantitativeReference: '1', id: 'proc-1', version: '1.0' } }];
    const result = await ref.current?.handleCheckData('checkData', nodes, []);

    expect(mockAntdMessage.error).toHaveBeenCalledWith('Please add connection line');
    expect(result).toEqual({ checkResult: false, unReview: [] });
  });

  it('submits form data on save', async () => {
    const onData = jest.fn();
    const ref = React.createRef<any>();
    render(<ToolbarEditInfo ref={ref} {...baseProps} onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'info-icon' }));
    expect(
      await screen.findByRole('dialog', { name: 'Model base infomation' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onData).toHaveBeenCalledWith(expect.any(Object));
    expect(screen.queryByRole('dialog', { name: 'Model base infomation' })).not.toBeInTheDocument();
  });

  it('returns review metadata when nodes and edges pass validation', async () => {
    const ref = React.createRef<any>();
    const problemNodes = [
      { '@refObjectId': 'proc-3', '@version': '2.0', ruleVerification: [], nonExistent: false },
    ];

    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        teamId: 'team-1',
        json_tg: { submodels: [{ id: 'sub-1' }] },
        json: {
          lifeCycleModelDataSet: {
            lifeCycleModelInformation: { dataSetInformation: { name: {} } },
          },
        },
        ruleVerification: [],
      },
    });
    mockGetProcessDetail.mockResolvedValue({ data: {} });
    mockCheckReferences.mockResolvedValue({ findProblemNodes: () => problemNodes });

    render(<ToolbarEditInfo ref={ref} {...baseProps} />);

    const nodes = [
      { data: { quantitativeReference: '1', id: 'proc-1', version: '1.0' } },
      { data: { quantitativeReference: '0', id: 'proc-2', version: '1.0' } },
    ];
    const edges = [{}];

    const result = await ref.current?.handleCheckData('checkData', nodes, edges);

    expect(mockGetLifeCycleModelDetail).toHaveBeenCalledWith('model-1', '1.0');
    expect(mockGetProcessDetail).toHaveBeenCalledWith('model-1', '1.0');
    expect(mockCheckReferences).toHaveBeenCalled();
    expect(mockCheckRequiredFields).toHaveBeenCalled();
    expect(mockGetUserTeamId).toHaveBeenCalled();
    expect(mockDealModel).toHaveBeenCalled();
    expect(mockDealProcress).toHaveBeenCalled();
    expect(mockAntdMessage.error).not.toHaveBeenCalled();
    expect(result).toEqual({
      checkResult: true,
      unReview: [{ '@refObjectId': 'sub-1', '@version': '1.0', '@type': 'process data set' }],
      problemNodes,
    });
  });
});
