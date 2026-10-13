import { GetProp, UploadFile, UploadProps } from 'antd';
import path from 'path';
import { v4 } from 'uuid';
import { supabase } from '../supabase';
import { supabaseStorageBucket } from '../supabase/key';
import { isStorageObjectKey, resolveFileLocator } from './fileLocator';

const imageExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.svg'];

export type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

export const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const isImage = (file: UploadFile) => {
  return imageExtensions.includes(path.extname(file.name).toLowerCase());
};

export type FilePreviewState = 'unchecked' | 'resolved' | 'unavailable' | 'unsupported';
export type StorageFilePreview = UploadFile & {
  previewState?: FilePreviewState;
  previewError?: 'permission' | 'not-found' | 'transport' | 'unknown';
};

// A completed thumbnail is created only after downloading Blob bytes and always has a URL.
export type StorageFileThumbnail =
  | (StorageFilePreview & { status: 'done'; thumbUrl: string })
  | (StorageFilePreview & { status?: Exclude<UploadFile['status'], 'done'> });

const previewErrorKind = (error: unknown): StorageFilePreview['previewError'] => {
  const status = String((error as { statusCode?: unknown } | null)?.statusCode ?? '');
  if (status === '401' || status === '403') return 'permission';
  if (status === '404') return 'not-found';
  return error instanceof Error ? 'transport' : 'unknown';
};

export async function getOriginalFileUrl(
  file: string,
  name: string,
): Promise<Partial<StorageFilePreview>> {
  if (!file) return {};
  const locator = resolveFileLocator(file);
  if (locator.kind === 'external') {
    return { uid: file, name, url: locator.url, previewState: 'unchecked' };
  }
  if (locator.kind === 'opaque') {
    return { uid: file, name, url: '', previewState: 'unsupported' };
  }
  try {
    const { data, error } = await supabase.storage
      .from(locator.bucketName)
      .download(locator.filePath);
    if (error || !data) {
      return {
        uid: file,
        status: 'error',
        name,
        url: '',
        previewState: 'unavailable',
        previewError: previewErrorKind(error),
      };
    }
    return {
      uid: file,
      status: 'done',
      name,
      url: URL.createObjectURL(data),
      previewState: 'resolved',
    };
  } catch (error) {
    return {
      uid: file,
      status: 'error',
      name,
      url: '',
      previewState: 'unavailable',
      previewError: previewErrorKind(error),
    };
  }
}

export async function getThumbFileUrls(fileList: any): Promise<StorageFileThumbnail[]> {
  if (!fileList) return [];
  const files = Array.isArray(fileList) ? fileList : [fileList];
  return Promise.all(
    files.map(async (fileJson: any, index: number): Promise<StorageFileThumbnail> => {
      const file = typeof fileJson?.['@uri'] === 'string' ? fileJson['@uri'] : '';
      const locator = resolveFileLocator(file);
      const extension = path
        .extname(locator.kind === 'external' ? new URL(locator.url).pathname : file)
        .toLowerCase();
      const name = `${index + 1}${extension}`;
      if (locator.kind === 'external')
        return { uid: file, name, url: locator.url, previewState: 'unchecked' };
      if (locator.kind === 'opaque')
        return { uid: file, name, url: '', previewState: 'unsupported' };
      // Documents are checked on explicit open; a placeholder must not claim a successful download.
      if (!imageExtensions.includes(extension))
        return { uid: file, name, url: '', previewState: 'unchecked' };
      try {
        const { data, error } = await supabase.storage
          .from(locator.bucketName)
          .download(locator.filePath, {
            transform: { width: 100, height: 100, resize: 'contain' },
          });
        if (error || !data) {
          return {
            uid: file,
            status: 'error',
            name,
            url: '',
            previewState: 'unavailable',
            previewError: previewErrorKind(error),
          };
        }
        const url = URL.createObjectURL(data);
        return { uid: file, status: 'done', name, thumbUrl: url, url, previewState: 'resolved' };
      } catch (error) {
        return {
          uid: file,
          status: 'error',
          name,
          url: '',
          previewState: 'unavailable',
          previewError: previewErrorKind(error),
        };
      }
    }),
  );
}

export async function getSignedStorageFileUrl(file: string, expiresIn = 60 * 60) {
  const locator = resolveFileLocator(file);
  if (locator.kind !== 'managed') return '';
  try {
    const { data, error } = await supabase.storage
      .from(locator.bucketName)
      .createSignedUrl(locator.filePath, expiresIn);
    return error ? '' : (data?.signedUrl ?? '');
  } catch {
    return '';
  }
}

export async function uploadFile(name: string, file: any) {
  const result = await supabase.storage.from(supabaseStorageBucket).upload(name, file);
  return result;
}

export async function removeFile(files: string[]) {
  const keys = files.filter(isStorageObjectKey);
  if (!keys.length) return { data: [], error: null };
  return supabase.storage.from(supabaseStorageBucket).remove(keys);
}

export async function uploadLogoApi(name: string, file: File, suffix: string) {
  const res = await supabase.storage.from('sys-files').upload(`logo/${v4()}.${suffix}`, file);
  if (res.error) {
    throw res.error;
  } else {
    return res;
  }
}

export async function removeLogoApi(files: string[]) {
  const formattedFiles = files.map((file) => {
    let formattedPath = file.replace('../sys-files/', '');
    formattedPath = formattedPath.replace(/^\/+/, '');
    return formattedPath;
  });
  const keys = formattedFiles.filter(isStorageObjectKey);
  if (!keys.length) return { data: [], error: null };
  const res = await supabase.storage.from('sys-files').remove(keys);
  if (res.error) {
    throw res.error;
  } else {
    return res;
  }
}
