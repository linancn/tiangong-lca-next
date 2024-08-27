import { GetProp, UploadFile, UploadProps } from 'antd';
import path from 'path';
import { supabase } from '../supabase';
import { supabaseStorageBucket, supabaseUrl } from '../supabase/key';

const imageExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'];

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

export async function getFileUrls(fileList: any) {
  const session = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No session');
  }

  if (!fileList) {
    return [];
  }

  const urls = await Promise.all(
    fileList.map(async (fileJson: any, index: number) => {
      const file = fileJson?.['@uri'];
      if (file) {
        const fileUrl = `${supabaseUrl}/storage/v1/object/authenticated${file.replace('..', '')}`;
        try {
          const response = await fetch(fileUrl, {
            headers: {
              Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
            },
          });
          if (!response.ok) {
            return { uid: file, status: 'error', name: `${index}` };
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const thumbUrl = imageExtensions.includes(path.extname(file)) ? blobUrl : '/file.png';
          return {
            uid: file,
            status: 'done',
            name: `${index}${path.extname(file)}`,
            thumbUrl: thumbUrl,
            url: blobUrl,
          };
        } catch (e) {
          return { uid: file, status: 'error', name: `${index}${path.extname(file)}` };
        }
      }
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
