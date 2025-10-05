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
      expect(result).toEqual({
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

      expect(result).toEqual({
        uid: 'storage/bucket-name/file.png',
        status: 'error',
        name: 'test.png',
        url: '',
      });
    });

    it('returns error status for invalid file path', async () => {
      const result = await getOriginalFileUrl('invalid-path', 'test.png');

      expect(result).toEqual({
        uid: 'invalid-path',
        status: 'error',
        name: 'test.png',
        url: '',
      });
    });

    it('returns empty object when file path is empty', async () => {
      const result = await getOriginalFileUrl('', 'test.png');

      expect(result).toEqual({});
    });

    it('handles download exceptions gracefully', async () => {
      const mockDownload = jest.fn().mockRejectedValue(new Error('Network error'));

      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: mockDownload,
      });

      const result = await getOriginalFileUrl('storage/bucket-name/file.png', 'test.png');

      expect(result).toEqual({
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
      expect(result).toEqual([
        {
          uid: 'storage/bucket-name/image.png',
          status: 'done',
          name: '1.png',
          thumbUrl: 'blob:mock-url',
          url: 'blob:mock-url',
        },
      ]);
    });

    it('uses dot placeholder for non-image files', async () => {
      (mockStorageFrom as jest.Mock).mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      });

      const fileList = [{ '@uri': 'storage/bucket-name/document.pdf' }];

      const result = await getThumbFileUrls(fileList);

      expect(result).toEqual([
        {
          uid: 'storage/bucket-name/document.pdf',
          status: 'done',
          name: '1.pdf',
          thumbUrl: '.',
          url: '.',
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

      expect(result).toEqual([
        {
          uid: 'storage/bucket-name/image.png',
          status: 'error',
          name: '1.png',
        },
      ]);
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
      expect(result).toEqual(mockResult);
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
      expect(result).toEqual(mockResult);
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
      expect(result).toEqual(mockResult);
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
      expect(result).toEqual(mockResult);
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
