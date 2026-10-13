/**
 * Tests for Supabase storage utility functions
 * Path: src/services/supabase/storage.ts
 *
 * Coverage focuses on:
 * - File upload/download operations (used in external docs, logos)
 * - Image detection and thumbnail generation (used in file preview components)
 * - Base64 conversion (used in image upload forms)
 */

import {
  getBase64,
  getOriginalFileUrl,
  getSignedStorageFileUrl,
  getThumbFileUrls,
  isImage,
  removeFile,
  removeLogoApi,
  uploadFile,
  uploadLogoApi,
} from '@/services/supabase/storage';

jest.mock('@/services/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

const {
  supabase: {
    storage: { from: mockStorageFrom },
  },
} = jest.requireMock('@/services/supabase');

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

describe('Supabase Storage service (src/services/supabase/storage.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Source locator regressions', () => {
    it.each([
      'http://lca.jrc.ec.europa.eu',
      'https://example.org/example.jpg',
      'https://example.org/reports/example.pdf',
    ])('keeps external reference %s out of authenticated Storage operations', async (uri) => {
      mockStorageFrom.mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        createSignedUrl: jest.fn(),
        remove: jest.fn(),
      });
      const thumbs = await getThumbFileUrls([{ '@uri': uri }]);
      const original = await getOriginalFileUrl(uri, 'external');
      expect(thumbs[0]).toMatchObject({ uid: uri, previewState: 'unchecked' });
      expect(thumbs[0].thumbUrl).toBeUndefined();
      expect(original.url).toBe(uri);
      expect(await getSignedStorageFileUrl(uri)).toBe('');
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });
    it('supports deep managed keys without changing their bytes', async () => {
      const download = jest.fn().mockResolvedValue({ data: new Blob(), error: null });
      mockStorageFrom.mockReturnValue({ download });
      const result = await getThumbFileUrls([{ '@uri': '../external_docs/a/b/example.jpg' }]);
      expect(download).toHaveBeenCalledWith('a/b/example.jpg', expect.any(Object));
      expect(result[0]).toMatchObject({
        uid: '../external_docs/a/b/example.jpg',
        status: 'done',
        previewState: 'resolved',
      });
    });
    it.each([403, 404, 500])(
      'does not mark a failed managed image as done (HTTP %s)',
      async (statusCode) => {
        mockStorageFrom.mockReturnValue({
          download: jest
            .fn()
            .mockResolvedValue({ data: null, error: { statusCode, message: 'unavailable' } }),
        });
        const [result] = await getThumbFileUrls([{ '@uri': '../external_docs/missing.jpg' }]);
        expect(result).toMatchObject({ status: 'error', previewState: 'unavailable' });
        expect(result.url).toBe('');
      },
    );
    it('leaves a managed document unchecked until explicitly opened', async () => {
      const [result] = await getThumbFileUrls([{ '@uri': '../external_docs/missing.pdf' }]);
      expect(result).toMatchObject({
        uid: '../external_docs/missing.pdf',
        previewState: 'unchecked',
      });
      expect(result.status).not.toBe('done');
      expect(result.url).not.toBe('.');
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });
    it.each([
      'javascript:alert(1)',
      'data:text/html,hello',
      'blob:old-preview',
      './relative/document.pdf',
    ])(
      'preserves opaque locator %s without treating it as Schema failure or requesting Storage',
      async (uri) => {
        const [result] = await getThumbFileUrls([{ '@uri': uri }]);
        expect(result).toMatchObject({ uid: uri, previewState: 'unsupported' });
        expect(result.status).not.toBe('error');
        expect((await getOriginalFileUrl(uri, 'reference')).url).toBe('');
        expect(mockStorageFrom).not.toHaveBeenCalled();
      },
    );
  });

  it('does not trust Blob data accompanying a returned Storage error', async () => {
    mockStorageFrom.mockReturnValue({
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: { statusCode: '403' } }),
    });
    const result = await getOriginalFileUrl('../external_docs/a.png', 'a.png');
    expect(result).toMatchObject({
      status: 'error',
      previewState: 'unavailable',
      previewError: 'permission',
      url: '',
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it.each([
    'https://example.org/a',
    'http://lca.jrc.ec.europa.eu',
    'javascript:alert(1)',
    '../sys-files/a',
  ])('does not send non-object removal input %s to Storage', async (uri) => {
    expect(await removeFile([uri])).toMatchObject({ error: null });
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
  it('does not send an external logo reference to Storage removal', async () => {
    expect(await removeLogoApi(['https://example.org/a.png'])).toMatchObject({ error: null });
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });

  it('accepts singleton references and leaves malformed entries unsupported without a request', async () => {
    expect((await getThumbFileUrls({ '@uri': './opaque.pdf' }))[0]).toMatchObject({
      uid: './opaque.pdf',
      previewState: 'unsupported',
    });
    expect(
      (await getThumbFileUrls([null, { '@uri': 10 }])).map((file) => file.previewState),
    ).toEqual(['unsupported', 'unsupported']);
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
  it('refuses a signed URL returned together with a permission error', async () => {
    mockStorageFrom.mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.org/signed' },
        error: { statusCode: '403' },
      }),
    });
    expect(await getSignedStorageFileUrl('../sys-files/video/a.mp4')).toBe('');
  });

  describe('getBase64', () => {
    it('converts a file to base64 string', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockBase64 = 'data:text/plain;base64,dGVzdCBjb250ZW50';

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        result: mockBase64,
      };

      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);

      const promise = getBase64(mockFile as any);

      // Trigger onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({} as any);
        }
      }, 0);

      const result = await promise;

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(mockBase64);
    });

    it('rejects when file read fails', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockError = new Error('Read failed');

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
      };

      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);

      const promise = getBase64(mockFile as any);

      // Trigger onerror
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror(mockError as any);
        }
      }, 0);

      await expect(promise).rejects.toEqual(mockError);
    });
  });

  describe('isImage', () => {
    it('returns true for image file extensions', () => {
      const imageExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.svg'];

      imageExtensions.forEach((ext) => {
        const file = { name: `test${ext}` } as any;
        expect(isImage(file)).toBe(true);
      });
    });

    it('returns false for non-image file extensions', () => {
      const nonImageFiles = [
        { name: 'document.pdf' },
        { name: 'data.csv' },
        { name: 'script.js' },
        { name: 'file.txt' },
      ];

      nonImageFiles.forEach((file) => {
        expect(isImage(file as any)).toBe(false);
      });
    });
  });

  describe('getOriginalFileUrl', () => {
    it('downloads and creates URL for valid file path', async () => {
      const mockBlob = new Blob(['file content'], { type: 'image/png' });
      const mockDownload = jest.fn().mockResolvedValue({ data: mockBlob, error: null });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const result = await getOriginalFileUrl('storage/bucket-name/file.png', 'test.png');

      expect(mockStorageFrom).toHaveBeenCalledWith('bucket-name');
      expect(mockDownload).toHaveBeenCalledWith('file.png');
      expect(result).toMatchObject({
        uid: 'storage/bucket-name/file.png',
        status: 'done',
        name: 'test.png',
        url: 'blob:mock-url',
      });
    });

    it('returns error status when file download fails', async () => {
      const mockDownload = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Not found' } });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const result = await getOriginalFileUrl('storage/bucket-name/file.png', 'test.png');

      expect(result).toMatchObject({
        uid: 'storage/bucket-name/file.png',
        status: 'error',
        name: 'test.png',
        url: '',
      });
    });

    it('keeps unsupported opaque file locators separate from download errors', async () => {
      const result = await getOriginalFileUrl('invalid-path', 'test.png');

      expect(result).toMatchObject({
        uid: 'invalid-path',
        previewState: 'unsupported',
        name: 'test.png',
        url: '',
      });
    });

    it('returns empty object when file path is empty', async () => {
      const result = await getOriginalFileUrl('', 'test.png');

      expect(result).toMatchObject({});
    });

    it('handles download exceptions gracefully', async () => {
      const mockDownload = jest.fn().mockRejectedValue(new Error('Network error'));

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const result = await getOriginalFileUrl('storage/bucket-name/file.png', 'test.png');

      expect(result).toMatchObject({
        uid: 'storage/bucket-name/file.png',
        status: 'error',
        name: 'test.png',
        url: '',
      });
    });
  });

  describe('getThumbFileUrls', () => {
    it('returns empty array when fileList is null or undefined', async () => {
      expect(await getThumbFileUrls(null)).toEqual([]);
      expect(await getThumbFileUrls(undefined)).toEqual([]);
    });

    it('generates thumbnail URLs for image files', async () => {
      const mockBlob = new Blob(['image content'], { type: 'image/png' });
      const mockDownload = jest.fn().mockResolvedValue({ data: mockBlob, error: null });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const fileList = [{ '@uri': 'storage/bucket-name/image.png' }];

      const result = await getThumbFileUrls(fileList);

      expect(mockStorageFrom).toHaveBeenCalledWith('bucket-name');
      expect(mockDownload).toHaveBeenCalledWith('image.png', {
        transform: {
          width: 100,
          height: 100,
          resize: 'contain',
        },
      });
      expect(result).toMatchObject([
        {
          uid: 'storage/bucket-name/image.png',
          status: 'done',
          name: '1.png',
          thumbUrl: 'blob:mock-url',
          url: 'blob:mock-url',
        },
      ]);
    });

    it('does not claim a resolved preview for unchecked documents', async () => {
      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      });

      const fileList = [{ '@uri': 'storage/bucket-name/document.pdf' }];

      const result = await getThumbFileUrls(fileList);

      expect(result).toMatchObject([
        {
          uid: 'storage/bucket-name/document.pdf',
          previewState: 'unchecked',
          name: '1.pdf',
          url: '',
        },
      ]);
    });

    it('handles 4-part file paths correctly', async () => {
      const mockBlob = new Blob(['image content'], { type: 'image/png' });
      const mockDownload = jest.fn().mockResolvedValue({ data: mockBlob, error: null });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const fileList = [{ '@uri': 'storage/bucket-name/folder/image.png' }];

      const result = await getThumbFileUrls(fileList);

      expect(mockStorageFrom).toHaveBeenCalledWith('bucket-name');
      expect(mockDownload).toHaveBeenCalledWith('folder/image.png', expect.any(Object));
      expect(result[0].status).toBe('done');
    });

    it('returns error status when thumbnail generation fails', async () => {
      const mockDownload = jest.fn().mockRejectedValue(new Error('Network error'));

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const fileList = [{ '@uri': 'storage/bucket-name/image.png' }];

      const result = await getThumbFileUrls(fileList);

      expect(result).toMatchObject([
        {
          uid: 'storage/bucket-name/image.png',
          status: 'error',
          name: '1.png',
        },
      ]);
    });

    it('returns error status when thumbnail generation fails for 4-part paths', async () => {
      const mockDownload = jest.fn().mockRejectedValue(new Error('Nested network error'));

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const fileList = [{ '@uri': 'storage/bucket-name/folder/image.png' }];

      const result = await getThumbFileUrls(fileList);

      expect(result).toMatchObject([
        {
          uid: 'storage/bucket-name/folder/image.png',
          status: 'error',
          name: '1.png',
        },
      ]);
    });

    it('preserves unsupported opaque locators without a storage error', async () => {
      const result = await getThumbFileUrls([{ '@uri': 'invalid-path' }]);

      expect(result).toMatchObject([
        {
          uid: 'invalid-path',
          previewState: 'unsupported',
          name: '1',
        },
      ]);
    });
  });

  describe('getSignedStorageFileUrl', () => {
    it('returns a signed URL for a nested storage path', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: {
          signedUrl:
            'https://example.supabase.co/storage/v1/object/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=signed',
        },
      });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await getSignedStorageFileUrl(
        '../sys-files/video/platform_usage_process_first_matched.mp4',
      );

      expect(mockStorageFrom).toHaveBeenCalledWith('sys-files');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        'video/platform_usage_process_first_matched.mp4',
        3600,
      );
      expect(result).toBe(
        'https://example.supabase.co/storage/v1/object/sign/sys-files/video/platform_usage_process_first_matched.mp4?token=signed',
      );
    });

    it('returns an empty string for invalid storage paths', async () => {
      const result = await getSignedStorageFileUrl('invalid-path');

      expect(result).toBe('');
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });

    it('returns an empty string when storage does not provide a signed URL', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: {},
      });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await getSignedStorageFileUrl(
        '../sys-files/video/platform_usage_process_first_matched.mp4',
      );

      expect(mockStorageFrom).toHaveBeenCalledWith('sys-files');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        'video/platform_usage_process_first_matched.mp4',
        3600,
      );
      expect(result).toBe('');
    });

    it('returns an empty string when signed URL creation throws', async () => {
      const mockCreateSignedUrl = jest.fn().mockRejectedValue(new Error('Bucket not found'));

      (mockStorageFrom as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await getSignedStorageFileUrl(
        '../sys-files/video/platform_usage_process_first_matched.mp4',
      );

      expect(result).toBe('');
    });

    it('returns an empty string for empty storage paths', async () => {
      const result = await getSignedStorageFileUrl('');

      expect(result).toBe('');
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('uploads file to storage bucket', async () => {
      const mockFile = new File(['content'], 'test.txt');
      const mockResult = { data: { path: 'test.txt' }, error: null };
      const mockUpload = jest.fn().mockResolvedValue(mockResult);

      (mockStorageFrom as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      const result = await uploadFile('test.txt', mockFile);

      expect(mockStorageFrom).toHaveBeenCalledWith('external_docs');
      expect(mockUpload).toHaveBeenCalledWith('test.txt', mockFile);
      expect(result).toMatchObject(mockResult);
    });
  });

  describe('removeFile', () => {
    it('removes multiple files from storage', async () => {
      const mockResult = { data: null, error: null };
      const mockRemove = jest.fn().mockResolvedValue(mockResult);

      (mockStorageFrom as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const files = ['file1.txt', 'file2.txt'];
      const result = await removeFile(files);

      expect(mockStorageFrom).toHaveBeenCalledWith('external_docs');
      expect(mockRemove).toHaveBeenCalledWith(files);
      expect(result).toMatchObject(mockResult);
    });
  });

  describe('uploadLogoApi', () => {
    it('uploads logo file with generated UUID name', async () => {
      const mockFile = new File(['logo'], 'logo.png', { type: 'image/png' });
      const mockResult = { data: { path: 'logo/uuid.png' }, error: null };
      const mockUpload = jest.fn().mockResolvedValue(mockResult);

      (mockStorageFrom as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      const result = await uploadLogoApi('logo', mockFile, 'png');

      expect(mockStorageFrom).toHaveBeenCalledWith('sys-files');
      expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/^logo\/.*\.png$/), mockFile);
      expect(result).toMatchObject(mockResult);
    });

    it('throws error when upload fails', async () => {
      const mockFile = new File(['logo'], 'logo.png', { type: 'image/png' });
      const mockError = { message: 'Upload failed' };
      const mockUpload = jest.fn().mockResolvedValue({ data: null, error: mockError });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      await expect(uploadLogoApi('logo', mockFile, 'png')).rejects.toEqual(mockError);
    });
  });

  describe('removeLogoApi', () => {
    it('removes logo files with path normalization', async () => {
      const mockResult = { data: null, error: null };
      const mockRemove = jest.fn().mockResolvedValue(mockResult);

      (mockStorageFrom as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const files = ['../sys-files/logo/file1.png', '/logo/file2.png'];
      const result = await removeLogoApi(files);

      expect(mockStorageFrom).toHaveBeenCalledWith('sys-files');
      expect(mockRemove).toHaveBeenCalledWith(['logo/file1.png', 'logo/file2.png']);
      expect(result).toMatchObject(mockResult);
    });

    it('throws error when removal fails', async () => {
      const mockError = { message: 'Remove failed' };
      const mockRemove = jest.fn().mockResolvedValue({ data: null, error: mockError });

      (mockStorageFrom as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await expect(removeLogoApi(['file.png'])).rejects.toEqual(mockError);
    });
  });
});
