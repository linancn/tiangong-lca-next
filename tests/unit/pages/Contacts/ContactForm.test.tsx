// @ts-nocheck
import { ContactForm } from '@/pages/Contacts/Components/form';
import React from 'react';
import { fireEvent, render, screen } from '../../../helpers/testUtils';

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
}));

const mockGetRules = jest.fn(() => [{ required: true, message: 'Required' }]);

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: jest.fn((rules: any) => mockGetRules(rules)),
}));

const mockLangTextItemForm = jest.fn(({ label, name, rules }: any) => (
  <div data-testid={`lang-${Array.isArray(name) ? name.join('.') : name}`}>
    {toText(label)}::{rules?.length ?? 0}
  </div>
));

const mockLevelTextItemForm = jest.fn(() => <div data-testid='level-text-item' />);
const mockContactSelectForm = jest.fn(({ onData }: any) => (
  <button type='button' onClick={() => onData?.()} data-testid='contact-select'>
    contact-select
  </button>
));
const mockSourceSelectForm = jest.fn(({ onData, defaultSourceName }: any) => (
  <button
    type='button'
    onClick={() => onData?.()}
    data-testid={`source-select-${defaultSourceName ?? 'none'}`}
  >
    source-select
  </button>
));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: (props: any) => mockLangTextItemForm(props),
}));

jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: (props: any) => mockLevelTextItemForm(props),
}));

jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: (props: any) => mockContactSelectForm(props),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: (props: any) => mockSourceSelectForm(props),
}));

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label }: any) => <span>{toText(label)}</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <section>
      <nav>
        {tabList.map((tab: any) => (
          <button
            key={tab.key}
            type='button'
            aria-pressed={tab.key === activeTabKey}
            onClick={() => onTabChange?.(tab.key)}
          >
            {toText(tab.tab)}
          </button>
        ))}
      </nav>
      <div>{children}</div>
    </section>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children }: any) => (
    <label>
      {toText(label)}
      {children}
    </label>
  );

  const Input = (props: any) => <input {...props} />;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    Form,
    Input,
    Space,
    theme,
  };
});

describe('ContactForm component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRules.mockClear();
  });

  const renderForm = (props: Record<string, any> = {}) =>
    render(
      <ContactForm
        lang='en'
        activeTabKey='contactInformation'
        formRef={React.createRef()}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
        showRules={false}
        {...props}
      />,
    );

  it('invokes onTabChange when switching tabs', () => {
    const onTabChange = jest.fn();
    renderForm({ onTabChange });

    fireEvent.click(screen.getByRole('button', { name: 'Administrative information' }));

    expect(onTabChange).toHaveBeenCalledWith('administrativeInformation');
  });

  it('invokes onData when reference selectors trigger', () => {
    const onData = jest.fn();
    renderForm({ onData });

    const contactButtons = screen.getAllByTestId('contact-select');
    fireEvent.click(contactButtons[0]);
    fireEvent.click(screen.getByTestId('source-select-ILCD format'));

    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('passes default source name when formType is create', () => {
    renderForm({ formType: 'create' });

    expect(
      mockSourceSelectForm.mock.calls.some(
        ([props]: any[]) => props?.defaultSourceName === 'ILCD format',
      ),
    ).toBe(true);
  });

  it('applies validation rules when showRules is true', () => {
    renderForm({ showRules: true });

    const shortNameCall = mockLangTextItemForm.mock.calls.find(
      ([props]: any[]) =>
        Array.isArray(props?.name) &&
        props.name.join('.') === 'contactInformation.dataSetInformation.common:shortName',
    );

    expect(shortNameCall).toBeDefined();
    expect(shortNameCall?.[0]?.rules?.length).toBeGreaterThan(0);
  });
});
