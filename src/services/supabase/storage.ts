import { GetProp, UploadFile, UploadProps } from 'antd';
import path from 'path';
import { v4 } from 'uuid';
import { supabase } from '../supabase';
import { supabaseStorageBucket } from '../supabase/key';

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
  return imageExtensions.includes(path.extname(file.name));
};

export async function getOriginalFileUrl(file: string, name: string) {
  if (!file) {
    return {};
  }
  const filePaths = file.split('/');
  if (filePaths.length === 3) {
    try {
      const originalFile = await supabase.storage.from(filePaths[1]).download(filePaths[2]);

      if (!originalFile.data) {
        return { uid: file, status: 'error', name: name, url: '' };
      }

      const originalFileUrl = URL.createObjectURL(originalFile.data);
      return {
        uid: file,
        status: 'done',
        name: name,
        url: originalFileUrl,
      };
    } catch (e) {
      return { uid: file, status: 'error', name: name, url: '' };
    }
  }
  return { uid: file, status: 'error', name: name, url: '' };
}

export async function getThumbFileUrls(fileList: any) {
  if (!fileList) {
    return [];
  }

  const urls = await Promise.all(
    fileList.map(async (fileJson: any, index: number) => {
      const file = fileJson?.['@uri'];
      if (file) {
        const filePaths = file.split('/');
        if (filePaths.length === 3) {
          try {
            let thumbFileUrl = '.';
            if (imageExtensions.includes(path.extname(file))) {
              const thumbFile = await supabase.storage.from(filePaths[1]).download(filePaths[2], {
                transform: {
                  width: 100,
                  height: 100,
                  resize: 'contain',
                },
              });
              if (thumbFile.data) {
                thumbFileUrl = URL.createObjectURL(thumbFile.data);
              }
            }
            return {
              uid: file,
              status: 'done',
              name: `${index + 1}${path.extname(file)}`,
              thumbUrl: thumbFileUrl,
              url: thumbFileUrl,
            };
          } catch (e) {
            return { uid: file, status: 'error', name: `${index + 1}${path.extname(file)}` };
          }
        }
        if (filePaths.length === 4) {
          try {
            let thumbFileUrl = '.';
            if (imageExtensions.includes(path.extname(file))) {
              const bucketName = filePaths[1];
              const filePath = `${filePaths[2]}/${filePaths[3]}`;
              const thumbFile = await supabase.storage.from(bucketName).download(filePath, {
                transform: {
                  width: 100,
                  height: 100,
                  resize: 'contain',
                },
              });
              if (thumbFile.data) {
                thumbFileUrl = URL.createObjectURL(thumbFile.data);
              }
            }
            return {
              uid: file,
              status: 'done',
              name: `${index + 1}${path.extname(file)}`,
              thumbUrl: thumbFileUrl,
              url: thumbFileUrl,
            };
          } catch (e) {
            return { uid: file, status: 'error', name: `${index + 1}${path.extname(file)}` };
          }
        }
      }
      return { uid: file, status: 'error', name: `${index + 1}${path.extname(file)}` };
    }),
  );
  return urls;
}

export async function uploadFile(name: string, file: any) {
  const result = await supabase.storage.from(supabaseStorageBucket).upload(name, file);
  return result;
}

export async function removeFile(files: string[]) {
  const result = await supabase.storage.from(supabaseStorageBucket).remove(files);
  return result;
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
  const res = await supabase.storage.from('sys-files').remove(formattedFiles);
  if (res.error) {
    throw res.error;
  } else {
    return res;
  }
}
