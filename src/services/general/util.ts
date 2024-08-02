import { GetProp, UploadProps } from 'antd';
import { supabase } from '../supabase';
import { supabaseStorageBucket, supabaseUrl } from '../supabase/key';

export type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

export const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export function removeEmptyObjects(obj: any) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object') {
      removeEmptyObjects(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  });
  return obj;
}

export function getLang(locale: string) {
  if (locale === 'zh-CN') {
    return 'zh';
  } else {
    return 'en';
  }
}

export function getLangText(langTexts: any, lang: string) {
  let text = '-';
  try {
    if (Array.isArray(langTexts)) {
      const filterList = langTexts.filter((i) => i['@xml:lang'] === lang);
      if (filterList.length > 0) {
        text = filterList[0]['#text'] ?? '-';
      } else {
        const filterList = langTexts.filter((i) => i['@xml:lang'] === 'en');
        if (filterList.length > 0) {
          text = filterList[0]['#text'] ?? '-';
        } else {
          text = langTexts[0]['#text'] ?? '-';
        }
      }
    } else {
      text = langTexts?.['#text'] ?? '-';
    }
  } catch (e) {
    console.log(e);
  }
  return text;
}

export function getLangJson(langTexts: any) {
  if (langTexts) {
    if (langTexts.length === 1) {
      return langTexts[0];
    } else if (langTexts.length > 1) {
      return langTexts;
    }
  }
  return {};
}

export function getLangList(langTexts: any) {
  if (!langTexts) {
    return [];
  }
  if (Array.isArray(langTexts)) {
    return langTexts;
  } else {
    return [langTexts];
  }
}

export function classificationToString(classifications: any) {
  let classificationStr = '-';
  try {
    if (Array.isArray(classifications)) {
      const filterList0 = classifications.filter((i) => i['@level'].toString() === '0');
      if (filterList0.length > 0) {
        classificationStr = filterList0[0]['#text'] ?? '-';
        const filterList1 = classifications.filter((i) => i['@level'].toString() === '1');
        if (filterList1.length > 0) {
          classificationStr = classificationStr + ' > ' + filterList1[0]['#text'] ?? '-';
          const filterList2 = classifications.filter((i) => i['@level'].toString() === '2');
          if (filterList2.length > 0) {
            classificationStr = classificationStr + ' > ' + filterList2[0]['#text'] ?? '-';
          }
        }
      }
    } else {
      classificationStr = classifications['#text'] ?? '-';
    }
  } catch (e) {
    console.log(e);
  }
  return classificationStr;
}

export function classificationToJson(classifications: any) {
  let classificationJson = {};
  if (Array.isArray(classifications)) {
    const filterList0 = classifications.filter((i) => i['@level'].toString() === '0');
    if (filterList0.length > 0) {
      classificationJson = { '@level_0': filterList0[0]['#text'] ?? '-' };
      const filterList1 = classifications.filter((i) => i['@level'].toString() === '1');
      if (filterList1.length > 0) {
        classificationJson = { ...classificationJson, '@level_1': filterList1[0]['#text'] ?? '-' };
        const filterList2 = classifications.filter((i) => i['@level'].toString() === '2');
        if (filterList2.length > 0) {
          classificationJson = {
            ...classificationJson,
            '@level_2': filterList2[0]['#text'] ?? {},
          };
        }
      }
    }
  } else {
    classificationJson = { '@level_0': classifications?.['#text'] ?? {} };
  }
  return removeEmptyObjects(classificationJson);
}

export function classificationToList(classifications: any) {
  let common_class = {};
  if ((classifications?.['@level_0'] ?? '').trim() !== '') {
    common_class = {
      '@level': '0',
      '#text': classifications['@level_0'],
    };
    if ((classifications?.['@level_1'] ?? '').trim() !== '') {
      common_class = [
        {
          '@level': '0',
          '#text': classifications['@level_0'],
        },
        {
          '@level': '1',
          '#text': classifications['@level_1'],
        },
      ];
      if ((classifications?.['@level_2'] ?? '').trim() !== '') {
        common_class = [
          {
            '@level': '0',
            '#text': classifications['@level_0'],
          },
          {
            '@level': '1',
            '#text': classifications['@level_1'],
          },
          {
            '@level': '2',
            '#text': classifications['@level_2'],
          },
        ];
      }
    }
  }
  return removeEmptyObjects(common_class);
}

export async function getFileUrls(filePaths: string) {
  const session = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No session');
  }

  if (!filePaths) {
    return [];
  }

  const fileList = filePaths.split(',');

  const urls = await Promise.all(
    fileList.map(async (file: string, index: number) => {
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
        return { uid: file, status: 'done', name: `${index}`, url: blobUrl };
      } catch (e) {
        return { uid: file, status: 'error', name: `${index}` };
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
