// @ts-nocheck
import { fireEvent, render, screen } from '@testing-library/react';

import FlowsSelectDrawer from '@/pages/Flows/Components/select/drawer';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const actionRefs: Record<string, any> = {};
const proTableInstances: any[] = [];

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  DatabaseOutlined: () => <span data-testid='icon-database' />,
}));

jest.mock('antd', () => {
  const React = require('react');
  const Button = ({ children, onClick, icon }: any) => (
    <button type='button' onClick={onClick}>
      {icon}
      {toText(children)}
    </button>
  );
  const Drawer = ({ open, children, extra, footer }: any) =>
    open ? (
      <div data-testid='drawer'>
        {extra}
        {children}
        <div data-testid='drawer-footer'>{footer}</div>
      </div>
    ) : null;
  const Space = ({ children }: any) => <div>{children}</div>;
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
  const Input = (props: any) => <input onChange={(e) => props.onChange?.(e)} />;
  Input.Search = ({ onSearch, value, onChange }: any) => (
    <div>
      <input
        value={value}
        data-testid='search-input'
        onChange={(e) => onChange?.(e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch?.((e.target as HTMLInputElement).value);
        }}
      />
      <button type='button' onClick={() => onSearch?.('')}>
        search
      </button>
    </div>
  );
  const Checkbox = ({ onChange }: any) => (
    <input type='checkbox' onChange={(e) => onChange?.(e)} data-testid='checkbox' />
  );
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  return { __esModule: true, Button, Drawer, Space, Card, Input, Checkbox, Row, Col, Tooltip };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const ProTable = (props: any) => {
    proTableInstances.push(props);
    const toolbar = props.toolBarRender ? props.toolBarRender() : null;
    if (props.actionRef) {
      props.actionRef.current = {
        setPageInfo: jest.fn(),
        reload: jest.fn(() => props.request?.({ pageSize: 10, current: 1 }, {}, {})),
      };
      actionRefs[props.actionRef] = props.actionRef.current;
    }
    return (
      <div data-testid={`pro-table-${proTableInstances.length - 1}`}>
        {toolbar}
        {(props.columns || []).map((col: any, index: number) => {
          if (typeof col.render !== 'function') return null;
          return (
            <div key={index}>{col.render(null, { id: 'row', version: '1.0', name: 'n' })}</div>
          );
        })}
        <button
          type='button'
          onClick={() => props.rowSelection?.onChange?.(['row-id:1.0'])}
          data-testid={`select-row-${proTableInstances.length - 1}`}
        >
          select-row
        </button>
      </div>
    );
  };
  return { __esModule: true, ProTable };
});

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: jest.fn(() => Promise.resolve({ data: [] })),
  getFlowTableAll: jest.fn(() => Promise.resolve({ data: [] })),
  getFlowTablePgroongaSearch: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('@/pages/Flows/Components/create', () => ({
  __esModule: true,
  default: () => <div data-testid='flows-create' />,
}));
jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='flows-edit' />,
}));
jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: () => <div data-testid='flows-delete' />,
}));
jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <div data-testid='flows-view' />,
}));

describe('FlowsSelectDrawer (src/pages/Flows/Components/select/drawer.tsx)', () => {
  beforeEach(() => {
    proTableInstances.length = 0;
  });

  it('opens drawer, selects a flow, and submits id/version', () => {
    const onData = jest.fn();
    render(<FlowsSelectDrawer buttonType='text' lang='en' onData={onData} />);

    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    const selectButtons = screen.getAllByTestId(/select-row/);
    fireEvent.click(selectButtons[0]);
    fireEvent.click(screen.getByText('Submit'));

    expect(onData).toHaveBeenCalledWith('row-id', '1.0');
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('switches tabs and renders the correct table/toolbars', () => {
    render(<FlowsSelectDrawer buttonType='text' lang='en' onData={jest.fn()} />);

    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByText('TianGong Data')).toBeInTheDocument();

    fireEvent.click(screen.getByText('My Data'));

    expect(screen.getAllByTestId('active-tab')[0].textContent).toBe('my');
    expect(screen.getByTestId('flows-create')).toBeInTheDocument();
  });
});
