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
  onVisibleChange?: (visible: boolean) => void;
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
          onClick={() => preview.onVisibleChange?.(true)}
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

  it('renders image thumbnails and updates preview URL when opened', async () => {
    const digitalFiles = [{ '@uri': '../bucket/file.png' }];
    const thumbEntry = {
      uid: '../bucket/file.png',
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
    const digitalFiles = [{ '@uri': '../bucket/file.pdf' }];
    const thumbEntry = {
      uid: '../bucket/file.pdf',
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
    const link = linkLabel.closest('a');
    expect(link).not.toBeNull();
    fireEvent.click(link!);

    await waitFor(() => {
      expect(mockedGetOriginalFileUrl).toHaveBeenCalledWith(thumbEntry.uid, thumbEntry.name);
    });

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank');
    });

    windowOpenSpy.mockRestore();
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
