// @ts-nocheck
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlowsView from '@/pages/Flows/Components/view';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetFlowDetail = jest.fn();
const mockGenFlowFromData = jest.fn();
const mockGetUnitData = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  ProfileOutlined: () => <span data-testid='icon-profile' />,
}));

jest.mock('antd', () => {
  const React = require('react');
  const Button = ({ children, onClick, icon }: any) => (
    <button type='button' onClick={onClick}>
      {icon}
      {toText(children)}
    </button>
  );
  const Drawer = ({ open, children, extra }: any) =>
    open ? (
      <div data-testid='drawer'>
        {extra}
        {children}
      </div>
    ) : null;
  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div data-testid='card'>
      <div>
        {tabList.map((tab: any) => (
          <button type='button' key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div data-testid='active-tab'>{activeTabKey}</div>
      {children}
    </div>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  return { __esModule: true, Button, Drawer, Card, Tooltip, Space, Descriptions, Divider, Spin };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const ProTable = (props: any) => {
    return (
      <div data-testid='pro-table'>
        {(props.columns || []).map((col: any, idx: number) =>
          typeof col.render === 'function' ? (
            <div key={col.dataIndex ?? idx}>
              {col.render(null, props.dataSource?.[0] || {}, idx)}
            </div>
          ) : null,
        )}
      </div>
    );
  };
  return { __esModule: true, ProTable };
});

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: (...args: any[]) => mockGenFlowFromData(...args),
  genFlowPropertyTabTableData: (data: any) => data,
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (value: any) => value ?? 'lang',
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));
jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-desc'>{data}</div>,
}));
jest.mock('@/components/LocationTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='location-desc'>{toText(data)}</div>,
}));
jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='quant-icon'>{String(value)}</span>,
}));
jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='contact-desc'>{toText(data)}</div>,
}));
jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='source-desc'>{toText(data)}</div>,
}));
jest.mock('@/pages/Flows/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='flow-select-desc' />,
}));
jest.mock('@/pages/Flows/Components/Property/view', () => ({
  __esModule: true,
  default: () => <div data-testid='property-view' />,
}));

describe('FlowsView (src/pages/Flows/Components/view.tsx)', () => {
  beforeEach(() => {
    mockGetFlowDetail.mockReset();
    mockGenFlowFromData.mockReset();
    mockGetUnitData.mockReset();
    mockGetFlowDetail.mockResolvedValue({
      data: { json: { flowDataSet: { from: 'api' } }, version: '1.0' },
    });
    mockGenFlowFromData.mockReturnValue({
      id: 'flow-id',
      flowInformation: { dataSetInformation: { name: { baseName: 'Base' } } },
      modellingAndValidation: { LCIMethod: { typeOfDataSet: 'Product flow' } },
      flowProperties: { flowProperty: [{ dataSetInternalID: 'p1', quantitativeReference: true }] },
    });
    mockGetUnitData.mockResolvedValue([
      {
        dataSetInternalID: 'p1',
        meanValue: 1,
        quantitativeReference: true,
        refUnitRes: { name: 'unit', refUnitGeneralComment: 'c', refUnitName: 'kg' },
      },
    ]);
  });

  it('loads flow detail and renders tabs and property table', async () => {
    render(<FlowsView id='flow-1' version='1.0' lang='en' buttonType='icon' />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('icon-profile').parentElement as HTMLElement);
    });

    await waitFor(() => {
      expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0');
      expect(mockGenFlowFromData).toHaveBeenCalled();
    });

    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByTestId('lang-desc').length).toBeGreaterThan(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Flow property'));
    });
    expect(screen.getByTestId('active-tab').textContent).toBe('flowProperties');
    expect(screen.getByTestId('property-view')).toBeInTheDocument();
  });
});
