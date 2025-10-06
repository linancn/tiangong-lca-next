import { act, render, screen, waitFor } from '@testing-library/react';

type MockUploadEntry = {
  beforeUpload?: (file: any) => unknown;
  onRemove?: () => void;
  fileList?: Array<{ uid?: string; url?: string; name?: string }>;
  labelText?: string;
};

const uploadRegistry: Record<string, MockUploadEntry> = {};

const extractText = (node: any): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (typeof node === 'object') {
    const props = (node as { props?: Record<string, any> }).props ?? {};
    return (
      extractText(props.children) ||
      extractText(props.defaultMessage) ||
      extractText(props.title) ||
      extractText(props.label) ||
      ''
    );
  }
  return '';
};

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage?: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

jest.mock('@ant-design/icons', () => ({
  PlusOutlined: () => (
    <span role='img' aria-label='Add icon'>
      +
    </span>
  ),
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: ({ name, label }: { name: string; label: any }) => {
    const labelText = extractText(label) || name;
    return (
      <label htmlFor={`field-${name}`} data-testid={`lang-text-${name}`}>
        {labelText}
        <input id={`field-${name}`} aria-label={labelText} />
      </label>
    );
  },
}));

jest.mock('antd', () => {
  const React = require('react') as typeof import('react');

  const FormItemContext = React.createContext<{ name?: string; labelText?: string }>({});

  const Space = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  const Card = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <section>
      <h2>{extractText(title)}</h2>
      <div>{children}</div>
    </section>
  );

  const FormComponent = ({ children }: { children: React.ReactNode }) => <form>{children}</form>;

  const FormItem = ({
    label,
    name,
    children,
  }: {
    label: React.ReactNode;
    name?: string;
    children: React.ReactNode;
  }) => {
    const labelText = extractText(label) || name || 'Field';
    return (
      <FormItemContext.Provider value={{ name, labelText }}>
        <div data-testid={`form-item-${name ?? labelText}`}>
          <span>{labelText}</span>
          {children}
        </div>
      </FormItemContext.Provider>
    );
  };

  (FormComponent as any).Item = FormItem;

  let uploadKeyCounter = 0;

  const Upload = ({
    beforeUpload,
    onRemove,
    fileList,
    children,
  }: {
    beforeUpload?: (file: any) => unknown;
    onRemove?: () => void;
    fileList?: Array<{ uid?: string; url?: string; name?: string }>;
    children?: React.ReactNode;
  }) => {
    const ctx = React.useContext(FormItemContext);
    const keyRef = React.useRef<string>(ctx.name ?? `upload-${uploadKeyCounter++}`);
    const key = keyRef.current;
    const labelText = ctx.labelText ?? key;

    React.useEffect(() => {
      uploadRegistry[key] = {
        beforeUpload,
        onRemove,
        fileList,
        labelText,
      };
      return () => {
        delete uploadRegistry[key];
      };
    }, [beforeUpload, onRemove, fileList, key, labelText]);

    const previewItems = fileList ?? [];

    return (
      <div data-testid={`upload-${key}`}>
        <div role='img' aria-label={`${labelText} preview`} data-testid={`preview-${key}`}>
          {previewItems.map((file) => (
            <span key={file.uid ?? file.url ?? file.name}>{file.url ?? file.name ?? ''}</span>
          ))}
        </div>
        {previewItems.length === 0 && (
          <span
            role='img'
            aria-label={`${labelText} placeholder`}
            data-testid={`placeholder-${key}`}
          >
            {children}
          </span>
        )}
      </div>
    );
  };

  return {
    __esModule: true,
    Card,
    Form: FormComponent,
    Space,
    Upload,
  };
});

jest.mock('@/services/supabase/storage', () => ({
  getBase64: jest.fn(),
  getThumbFileUrls: jest.fn(),
}));

import TeamForm from '@/components/AllTeams/form';
import { getBase64, getThumbFileUrls } from '@/services/supabase/storage';

const mockGetBase64 = getBase64 as jest.MockedFunction<any>;
const mockGetThumbFileUrls = getThumbFileUrls as jest.MockedFunction<any>;

const clearUploadRegistry = () => {
  Object.keys(uploadRegistry).forEach((key) => {
    delete uploadRegistry[key];
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  clearUploadRegistry();
  mockGetBase64.mockImplementation(
    async (file: { name?: string }) => `data-url-${file?.name ?? 'file'}`,
  );
});

describe('TeamForm component', () => {
  it('renders form fields and loads existing logo previews', async () => {
    mockGetThumbFileUrls
      .mockResolvedValueOnce([
        { status: 'done', thumbUrl: 'https://cdn.example.com/light-thumb.png' },
      ])
      .mockResolvedValueOnce([
        { status: 'done', thumbUrl: 'https://cdn.example.com/dark-thumb.png' },
      ]);

    const onLogoChange = jest.fn();

    render(
      <TeamForm
        onLogoChange={onLogoChange}
        lightLogoProps='existing/light.png'
        darkLogoProps='existing/dark.png'
      />,
    );

    expect(screen.getByRole('heading', { name: 'Team Name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Team Description' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetThumbFileUrls).toHaveBeenNthCalledWith(1, [{ '@uri': 'existing/light.png' }]);
    });
    await waitFor(() => {
      expect(mockGetThumbFileUrls).toHaveBeenNthCalledWith(2, [{ '@uri': 'existing/dark.png' }]);
    });

    await waitFor(() => {
      const lightPreview = screen.getByRole('img', { name: /light logo preview/i });
      expect(lightPreview).toHaveTextContent('https://cdn.example.com/light-thumb.png');
    });
    const darkPreview = screen.getByRole('img', { name: /dark logo preview/i });
    expect(darkPreview).toHaveTextContent('https://cdn.example.com/dark-thumb.png');
    expect(screen.queryByRole('img', { name: /light logo placeholder/i })).not.toBeInTheDocument();

    expect(onLogoChange).toHaveBeenCalledWith({ lightLogo: [], darkLogo: [] });
  });

  it('notifies caller when logos are uploaded and allows removal', async () => {
    mockGetThumbFileUrls.mockResolvedValue([{ status: 'error' }]);
    const onLogoChange = jest.fn();

    render(<TeamForm onLogoChange={onLogoChange} lightLogoProps='' darkLogoProps='' />);

    await waitFor(() => {
      expect(onLogoChange).toHaveBeenCalledWith({ lightLogo: [], darkLogo: [] });
    });
    onLogoChange.mockClear();

    await waitFor(() => {
      expect(uploadRegistry.lightLogo?.beforeUpload).toBeDefined();
    });

    const lightFile = { name: 'light.png' } as any;
    await act(async () => {
      await uploadRegistry.lightLogo?.beforeUpload?.(lightFile);
    });

    expect(mockGetBase64).toHaveBeenCalledWith(lightFile);
    await waitFor(() => {
      const lightPreview = screen.getByRole('img', { name: /light logo preview/i });
      expect(lightPreview).toHaveTextContent('data-url-light.png');
    });
    await waitFor(() => {
      expect(onLogoChange).toHaveBeenCalled();
      const calls = onLogoChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toEqual({
        lightLogo: [lightFile],
        darkLogo: [],
      });
    });

    onLogoChange.mockClear();
    await waitFor(() => {
      expect(uploadRegistry.darkLogo?.beforeUpload).toBeDefined();
    });
    const darkFile = { name: 'dark.png' } as any;
    await act(async () => {
      await uploadRegistry.darkLogo?.beforeUpload?.(darkFile);
    });

    expect(mockGetBase64).toHaveBeenCalledWith(darkFile);
    await waitFor(() => {
      const darkPreview = screen.getByRole('img', { name: /dark logo preview/i });
      expect(darkPreview).toHaveTextContent('data-url-dark.png');
    });
    await waitFor(() => {
      expect(onLogoChange).toHaveBeenCalled();
      const calls = onLogoChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toEqual({
        lightLogo: [lightFile],
        darkLogo: [darkFile],
      });
    });

    onLogoChange.mockClear();
    await waitFor(() => {
      expect(uploadRegistry.lightLogo?.onRemove).toBeDefined();
    });
    await act(async () => {
      uploadRegistry.lightLogo?.onRemove?.();
    });

    await waitFor(() => {
      const lightPreview = screen.getByRole('img', { name: /light logo preview/i });
      expect(lightPreview).toBeEmptyDOMElement();
    });
    expect(screen.getByRole('img', { name: /light logo placeholder/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(onLogoChange).toHaveBeenCalled();
      const calls = onLogoChange.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toEqual({
        lightLogo: [],
        darkLogo: [darkFile],
      });
    });
  });

  it('keeps placeholders visible when previews are unavailable', async () => {
    mockGetThumbFileUrls.mockResolvedValue([{ status: 'pending' }]);
    const onLogoChange = jest.fn();

    render(
      <TeamForm
        onLogoChange={onLogoChange}
        lightLogoProps='missing/light.png'
        darkLogoProps='missing/dark.png'
      />,
    );

    await waitFor(() => {
      expect(mockGetThumbFileUrls).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByRole('img', { name: /light logo placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /dark logo placeholder/i })).toBeInTheDocument();
  });
});
