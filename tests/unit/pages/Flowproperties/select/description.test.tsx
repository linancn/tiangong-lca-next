// @ts-nocheck
import FlowpropertiesSelectDescription from '@/pages/Flowproperties/Components/select/description';
import { renderWithProviders, screen } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => 'en-US',
}));

jest.mock('antd', () => {
  const React = require('react');
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <strong>{toText(label)}</strong>
      <span>{children}</span>
    </div>
  );
  return {
    __esModule: true,
    Card: ({ title, children }: any) => (
      <div>
        <div>{toText(title)}</div>
        <div>{children}</div>
      </div>
    ),
    Space: ({ children }: any) => <div>{children}</div>,
    Descriptions,
    Divider: ({ children }: any) => <div>{toText(children)}</div>,
    ConfigProvider,
  };
});

jest.mock('@/components/LangTextItem/description', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ data }: any) => <div>{JSON.stringify(data)}</div>,
  };
});

jest.mock('@/pages/Unitgroups/Components/select/descriptionMini', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <div>{`unitgroup ${id}:${version}`}</div>,
  };
});

jest.mock('@/pages/Flowproperties/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
  };
});

describe('FlowpropertiesSelectDescription', () => {
  it('renders flow property reference information', () => {
    const data = {
      '@refObjectId': 'fp-1',
      '@version': '1.0.0',
      'common:shortDescription': [{ '#text': 'Short description', '@lang': 'en' }],
    };

    renderWithProviders(
      <FlowpropertiesSelectDescription title='Reference' data={data} lang='en' />,
    );

    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('fp-1')).toBeInTheDocument();
    expect(screen.getByText('view fp-1:1.0.0')).toBeInTheDocument();
    expect(screen.getAllByText(/Short description/).length).toBeGreaterThan(0);
    expect(screen.getByText('unitgroup fp-1:1.0.0')).toBeInTheDocument();
  });
});
