// @ts-nocheck
import { SourceForm } from '@/pages/Sources/Components/form';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../helpers/testUtils';

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

jest.mock('@/components/FileViewer/upload', () => ({
  __esModule: true,
  UploadButton: () => <span>upload-button</span>,
}));

const mockGetBase64 = jest.fn(() => Promise.resolve('data:image/png;base64,abc'));
const mockGetOriginalFileUrl = jest.fn(() => Promise.resolve({ url: 'https://example.com/file' }));
const mockIsImage = jest.fn(() => true);

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  FileType: Object,
  getBase64: jest.fn((file: any) => mockGetBase64(file)),
  getOriginalFileUrl: jest.fn((...args: any[]) => mockGetOriginalFileUrl(...args)),
  isImage: jest.fn((file: any) => mockIsImage(file)),
}));

jest.mock('@/pages/Sources/sources_schema.json', () => ({
  __esModule: true,
  default: {
    sourceDataSet: {
      sourceInformation: {
        dataSetInformation: {
          'common:shortName': {
            rules: [{ required: true }],
          },
          classificationInformation: {
            'common:classification': {
              'common:class': {
                '@classId': {
                  rules: [{ required: true }],
                },
              },
            },
          },
          sourceCitation: {
            rules: [{ required: true }],
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': {
            rules: [{ required: true }],
          },
          'common:referenceToDataSetFormat': {
            '@refObjectId': {
              rules: [{ required: true }],
            },
          },
        },
        publicationAndOwnership: {
          'common:dataSetVersion': {
            rules: [{ required: true }],
          },
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId': {
              rules: [{ required: true }],
            },
          },
        },
      },
    },
  },
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

  const Upload = ({ fileList = [], beforeUpload, onPreview, onChange, children }: any) => {
    const [internalList, setInternalList] = React.useState(fileList);

    React.useEffect(() => {
      setInternalList(fileList);
    }, [fileList]);

    const triggerUpload = () => {
      const file = {
        uid: 'file-uid',
        name: 'example.png',
        originFileObj: {},
      };
      beforeUpload?.(file);
      const nextList = [...internalList, file];
      setInternalList(nextList);
      onChange?.({ fileList: nextList });
    };

    return (
      <div>
        <button type='button' onClick={triggerUpload} data-testid='upload-trigger'>
          upload
        </button>
        <button
          type='button'
          onClick={() => internalList[0] && onPreview?.(internalList[0])}
          disabled={!internalList.length}
          data-testid='preview-trigger'
        >
          preview
        </button>
        {children}
      </div>
    );
  };

  const Image = ({ preview }: any) => (
    <div>
      <button type='button' onClick={() => preview?.onVisibleChange?.(true)}>
        open-preview
      </button>
      <button type='button' onClick={() => preview?.onVisibleChange?.(false)}>
        close-preview
      </button>
    </div>
  );

  const Select = ({ options = [], value, onChange }: any) => (
    <select
      value={value ?? ''}
      onChange={(event) => {
        const next = event.target.value;
        onChange?.(next);
      }}
    >
      <option value='' />
      {options.map((option: any) => (
        <option key={option.value ?? option.label} value={option.value}>
          {option.label ?? option.value}
        </option>
      ))}
    </select>
  );

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
    Image,
    Input,
    Select,
    Space,
    Upload,
    theme,
  };
});

describe('SourceForm component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsImage.mockReturnValue(true);
  });

  const renderForm = (props: Record<string, any> = {}) =>
    render(
      <SourceForm
        lang='en'
        activeTabKey='sourceInformation'
        formRef={React.createRef()}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        loadFiles={[]}
        setLoadFiles={jest.fn()}
        fileList={[]}
        setFileList={jest.fn()}
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

    screen.getAllByTestId('contact-select').forEach((button) => {
      fireEvent.click(button);
    });
    fireEvent.click(screen.getByTestId('source-select-ILCD format'));
    fireEvent.click(screen.getByTestId('source-select-none'));

    expect(onData).toHaveBeenCalledTimes(4);
  });

  it('handles file uploads and previews images', async () => {
    const setLoadFiles = jest.fn();
    const setFileList = jest.fn();

    renderForm({ setLoadFiles, setFileList });

    fireEvent.click(screen.getByTestId('upload-trigger'));

    expect(setLoadFiles).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'file-uid', name: 'example.png' }),
    ]);
    expect(setFileList).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'file-uid', name: 'example.png' }),
    ]);

    fireEvent.click(screen.getByTestId('preview-trigger'));

    await waitFor(() => {
      expect(mockIsImage).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockGetBase64).toHaveBeenCalled();
    });
  });

  it('applies validation rules when showRules is true', () => {
    renderForm({ showRules: true });

    const shortNameCall = mockLangTextItemForm.mock.calls.find(
      ([props]: any[]) =>
        Array.isArray(props?.name) &&
        props.name.join('.') === 'sourceInformation.dataSetInformation.common:shortName',
    );

    expect(shortNameCall).toBeDefined();
    expect(shortNameCall?.[0]?.rules?.length).toBeGreaterThan(0);
    expect(mockGetRules).toHaveBeenCalled();
  });
});
