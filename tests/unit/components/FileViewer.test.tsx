/**
 * Tests for FileViewer components
 * Path: src/components/FileViewer
 */

import FileGallery from '@/components/FileViewer/gallery';
import { UploadButton } from '@/components/FileViewer/upload';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

let mockSpinRenderHistory: boolean[] = [];

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  FileTwoTone: () => <span data-testid='file-gallery-icon' />,
  LoadingOutlined: () => <span data-testid='upload-loading-icon' />,
  PlusOutlined: () => <span data-testid='upload-plus-icon' />,
}));

type SpinProps = {
  spinning: boolean;
  children?: ReactNode;
};

type SpaceProps = {
  children?: ReactNode;
};

type CardProps = {
  children?: ReactNode;
};

type ImagePreviewProps = {
  onOpenChange?: (open: boolean) => void;
  src?: string;
};

type ImageProps = {
  src?: string;
  preview?: ImagePreviewProps;
  children?: ReactNode;
};

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');

  const Spin = ({ spinning, children }: SpinProps) => {
    mockSpinRenderHistory.push(spinning);
    return (
      <div data-testid='file-gallery-spin' data-spinning={spinning ? 'true' : 'false'}>
        {children}
      </div>
    );
  };

  const Space = ({ children }: SpaceProps) => (
    <div data-testid='file-gallery-space'>{children}</div>
  );

  const Card = ({ children }: CardProps) => <div data-testid='file-gallery-card'>{children}</div>;

  const Image = ({ src, preview }: ImageProps) => (
    <div
      data-testid='file-gallery-image'
      data-thumb-src={src ?? ''}
      data-preview-src={preview?.src ?? ''}
    >
      {preview ? (
        <button
          type='button'
          data-testid='file-gallery-preview-trigger'
          onClick={() => preview.onOpenChange?.(true)}
        >
          preview
        </button>
      ) : null}
    </div>
  );

  return {
    ...actual,
    Spin,
    Space,
    Card,
    Image,
  };
});

jest.mock('@/services/supabase/storage', () => ({
  getThumbFileUrls: jest.fn(),
  getOriginalFileUrl: jest.fn(),
  isImage: jest.fn(),
}));

import { getOriginalFileUrl, getThumbFileUrls, isImage } from '@/services/supabase/storage';

const mockedGetThumbFileUrls = jest.mocked(getThumbFileUrls);
const mockedGetOriginalFileUrl = jest.mocked(getOriginalFileUrl);
const mockedIsImage = jest.mocked(isImage);

describe('FileGallery component', () => {
  beforeEach(() => {
    mockSpinRenderHistory = [];
    jest.clearAllMocks();
  });

  it('renders placeholder when no data provided', () => {
    render(<FileGallery data={undefined} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(mockedGetThumbFileUrls).not.toHaveBeenCalled();
  });

  it('renders placeholder when data is an empty array', async () => {
    mockedGetThumbFileUrls.mockResolvedValue([]);

    render(<FileGallery data={[]} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedGetThumbFileUrls).toHaveBeenCalledWith([]);
    });
  });

  it.each(['http://lca.jrc.ec.europa.eu', 'https://example.org/example.jpg'])(
    'shows an unchecked external reference as a native link without loading a remote thumbnail: %s',
    async (uri) => {
      mockedGetThumbFileUrls.mockResolvedValue([
        { uid: uri, name: 'external', url: uri, previewState: 'unchecked' },
      ]);
      mockedIsImage.mockReturnValue(true);
      render(<FileGallery data={[{ '@uri': uri }]} />);
      const label = await screen.findByText('external');
      expect(label.closest('a')).toHaveAttribute('href', uri);
      expect(label.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.getByText('File access not checked')).toBeInTheDocument();
      expect(screen.queryByTestId('file-gallery-image')).not.toBeInTheDocument();
      expect(mockedGetOriginalFileUrl).not.toHaveBeenCalled();
    },
  );
  it.each(['javascript:alert(1)', 'blob:expired', './opaque.pdf'])(
    'keeps opaque %s visible without an active link or false Schema error',
    async (uri) => {
      mockedGetThumbFileUrls.mockResolvedValue([
        { uid: uri, name: 'reference', url: '', previewState: 'unsupported' },
      ]);
      render(<FileGallery data={[{ '@uri': uri }]} />);
      const label = await screen.findByText('reference');
      expect(label.closest('a')).toBeNull();
      expect(label.closest('button')).toBeNull();
      expect(screen.getByText('Preview not supported for this reference')).toBeInTheDocument();
      expect(screen.queryByTestId('file-gallery-image')).not.toBeInTheDocument();
      expect(mockedGetOriginalFileUrl).not.toHaveBeenCalled();
    },
  );
  it('reports a failed document lookup without opening an empty URL', async () => {
    mockedGetThumbFileUrls.mockResolvedValue([
      { uid: '../external_docs/missing.pdf', name: 'missing', url: '', previewState: 'unchecked' },
    ]);
    mockedGetOriginalFileUrl.mockResolvedValue({
      uid: '../external_docs/missing.pdf',
      name: 'missing',
      url: '',
      status: 'error',
      previewState: 'unavailable',
    });
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<FileGallery data={[{ '@uri': '../external_docs/missing.pdf' }]} />);
    fireEvent.click((await screen.findByText('missing')).closest('button')!);
    expect(await screen.findByText('File preview unavailable')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('shows a preview failure when the resolver rejects instead of leaving a perpetual spinner', async () => {
    mockedGetThumbFileUrls.mockRejectedValueOnce(new Error('unavailable'));
    render(<FileGallery data={[{ '@uri': '../external_docs/a.pdf' }]} />);
    expect(await screen.findByText('File preview unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('file-gallery-spin')).toHaveAttribute('data-spinning', 'false');
  });
  it.each(['resolve', 'reject'] as const)(
    'ignores a stale %s after the reference list changes',
    async (outcome) => {
      let resolve: (value: any) => void = () => {};
      let reject: (error: Error) => void = () => {};
      mockedGetThumbFileUrls.mockReturnValueOnce(
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
      );
      const { rerender } = render(<FileGallery data={[{ '@uri': '../external_docs/old.pdf' }]} />);
      mockedGetThumbFileUrls.mockResolvedValueOnce([]);
      rerender(<FileGallery data={[]} />);
      if (outcome === 'resolve')
        resolve([{ uid: '../external_docs/old.pdf', name: 'stale', previewState: 'unchecked' }]);
      else reject(new Error('old failure'));
      await waitFor(() => expect(screen.getByText('-')).toBeInTheDocument());
      expect(screen.queryByText('stale')).not.toBeInTheDocument();
      expect(screen.queryByText('File preview unavailable')).not.toBeInTheDocument();
    },
  );

  it.each([
    [{ '@uri': '../external_docs/a.pdf' }, 'File preview unavailable'],
    [{ '@uri': 'https://example.org/a.pdf' }, 'File access not checked'],
    [{}, 'Preview not supported for this reference'],
  ])(
    'reports singleton resolver outcomes without changing URI meaning',
    async (reference, label) => {
      mockedGetThumbFileUrls.mockRejectedValueOnce(new Error('resolver unavailable'));
      render(<FileGallery data={reference} />);
      expect(await screen.findByText(label)).toBeInTheDocument();
      expect(screen.queryByTestId('file-gallery-image')).not.toBeInTheDocument();
    },
  );
  it('updates only the opened attachment and reports its resolved preview', async () => {
    mockedGetThumbFileUrls.mockResolvedValueOnce([
      { uid: '../external_docs/a.pdf', name: 'first', url: '', previewState: 'unchecked' },
      { uid: '../external_docs/b.pdf', name: 'second', url: '', previewState: 'unchecked' },
    ]);
    mockedGetOriginalFileUrl.mockResolvedValueOnce({
      uid: '../external_docs/a.pdf',
      name: 'first',
      status: 'done',
      url: 'blob:resolved',
      previewState: 'resolved',
    });
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <FileGallery
        data={[{ '@uri': '../external_docs/a.pdf' }, { '@uri': '../external_docs/b.pdf' }]}
      />,
    );
    fireEvent.click((await screen.findByText('first')).closest('button')!);
    expect(await screen.findByText('File preview ready')).toBeInTheDocument();
    expect(screen.getByText('File access not checked')).toBeInTheDocument();
    expect(open).toHaveBeenCalledWith('blob:resolved', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('renders image thumbnails and updates preview URL when opened', async () => {
    const digitalFiles = [{ '@uri': '../external_docs/file.png' }];
    const thumbEntry = {
      uid: '../external_docs/file.png',
      name: '1.png',
      thumbUrl: 'thumb-url',
      url: 'thumb-url',
    };

    mockedGetThumbFileUrls.mockResolvedValue([thumbEntry]);
    mockedIsImage.mockImplementation(() => true);
    mockedGetOriginalFileUrl.mockResolvedValue({
      uid: thumbEntry.uid,
      name: thumbEntry.name,
      status: 'done',
      url: 'original-url',
    });

    render(<FileGallery data={digitalFiles} />);

    await waitFor(() => {
      expect(mockedGetThumbFileUrls).toHaveBeenCalledWith(digitalFiles);
    });

    await waitFor(() => {
      expect(mockedIsImage).toHaveBeenCalledWith(expect.objectContaining({ uid: thumbEntry.uid }));
    });

    expect(mockSpinRenderHistory.some((value) => value)).toBe(true);

    await waitFor(() => {
      expect(screen.getByTestId('file-gallery-spin')).toHaveAttribute('data-spinning', 'false');
    });

    const image = screen.getByTestId('file-gallery-image');
    expect(image).toHaveAttribute('data-thumb-src', thumbEntry.thumbUrl);
    expect(image).toHaveAttribute('data-preview-src', thumbEntry.url);

    fireEvent.click(screen.getByTestId('file-gallery-preview-trigger'));

    await waitFor(() => {
      expect(mockedGetOriginalFileUrl).toHaveBeenCalledWith(thumbEntry.uid, thumbEntry.name);
    });

    await waitFor(() => {
      expect(screen.getByTestId('file-gallery-image')).toHaveAttribute(
        'data-preview-src',
        'original-url',
      );
    });
  });

  it('opens files with window.open for non-image entries', async () => {
    const digitalFiles = [{ '@uri': '../external_docs/file.pdf' }];
    const thumbEntry = {
      uid: '../external_docs/file.pdf',
      name: '1.pdf',
      thumbUrl: '.',
      url: '.',
    };

    mockedGetThumbFileUrls.mockResolvedValue([thumbEntry]);
    mockedIsImage.mockImplementation(() => false);
    mockedGetOriginalFileUrl.mockResolvedValue({
      uid: thumbEntry.uid,
      name: thumbEntry.name,
      status: 'done',
      url: 'https://example.com/file.pdf',
    });

    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<FileGallery data={digitalFiles} />);

    await waitFor(() => {
      expect(mockedGetThumbFileUrls).toHaveBeenCalledWith(digitalFiles);
    });

    const linkLabel = await screen.findByText(thumbEntry.name);
    const link = linkLabel.closest('button');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('title', 'Download file');
    fireEvent.click(link!);

    await waitFor(() => {
      expect(mockedGetOriginalFileUrl).toHaveBeenCalledWith(thumbEntry.uid, thumbEntry.name);
    });

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://example.com/file.pdf',
        '_blank',
        'noopener,noreferrer',
      );
    });

    windowOpenSpy.mockRestore();
  });

  it('shows an unavailable managed preview without issuing a fake image request', async () => {
    const digitalFiles = [{ '@uri': '../external_docs/broken-file.bin' }];

    mockedGetThumbFileUrls.mockResolvedValue([
      {
        uid: '../external_docs/broken-file.bin',
        name: 'broken-file.bin',
        previewState: 'unavailable',
        thumbUrl: '',
        url: '',
      },
    ]);

    render(<FileGallery data={digitalFiles} />);

    await waitFor(() => {
      expect(mockedGetThumbFileUrls).toHaveBeenCalledWith(digitalFiles);
    });

    expect(screen.queryByTestId('file-gallery-image')).not.toBeInTheDocument();
    expect(screen.getByText('File preview unavailable')).toBeInTheDocument();
  });
});

describe('UploadButton component', () => {
  it('shows plus icon and upload label', () => {
    render(<UploadButton />);

    expect(screen.getByTestId('upload-plus-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-loading-icon')).not.toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });
});
