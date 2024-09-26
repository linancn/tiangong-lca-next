import { Classification } from "./data";

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

export function genClassStr(data: string[], index: number, classification: Classification[]): string {
  const c = classification?.find((i) => i?.value === data?.[index]);
  if (c) {
    if (data.length > index + 1) {
      return c?.label + ' / ' + genClassStr(data, index + 1, c?.children);
    } else {
      return c?.label;
    }
  }
  else {
    if (data?.[index]) {
      if (data.length > index + 1) {
        return data?.[index] + ' / ' + genClassStr(data, index + 1, []);
      } else {
        return data?.[index];
      }
    }
  }
  return '';
}

export function genClassJsonZH(data: any[], index: number, classification: any[]): any {
  const d = data?.find((i) => i?.['@level'] === index.toString());
  const c = classification?.find((i) => i?.value === d?.['#text']);
  if (c) {
    const newC = {
      '@level': index.toString(),
      '#text': c?.label ?? c?.['#text'],
    };
    if (data.length > index + 1) {
      return [newC, ...genClassJsonZH(data, index + 1, c?.children)];
    }
    return [newC];
  }
  else {
    if (d) {
      const newD = {
        '@level': index.toString(),
        '#text': d?.['#text'],
      };
      return [newD, ...genClassJsonZH(data, index + 1, [])];
    }
    else {
      return [];
    }
  }
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

export function classificationToString(classifications: any[]) {
  let classificationStr = '';
  try {
    if (classifications.length > 0) {
      for (let i = 0; i < classifications.length; i++) {
        const filterList = classifications.find((c) => c['@level'] === i.toString());
        classificationStr += filterList?.['#text'] + ' / ';
      }
      classificationStr = classificationStr.slice(0, -3);
    }
    else {
      classificationStr = '-';
    }
  } catch (e) {
    console.log(e);
  }
  return classificationStr;
}

export function classificationToStringList(classifications: any) {
  let classificationStrList = [];
  try {
    if (Array.isArray(classifications)) {
      for (let i = 0; i < classifications.length; i++) {
        const filterList = classifications.find((c) => c['@level'] === i.toString());
        if (filterList) {
          classificationStrList.push(filterList?.['#text']);
        }
      }
    } else {
      classificationStrList = [classifications?.['#text']];
    }
  } catch (e) {
    console.log(e);
  }
  return classificationStrList;
}

export function classificationToJsonList(classifications: any) {
  let common_class = {};
  if (classifications && Array.isArray(classifications) && classifications.length > 0) {
    if (classifications.length === 1) {
      common_class = {
        '@level': '0',
        '#text': classifications[0],
      };
    } else {
      common_class = classifications.map((classification: any, index: number) => {
        return {
          '@level': index.toString(),
          '#text': classification,
        };
      });
    }
  }
  return removeEmptyObjects(common_class);
}

export function classificationToJson(classifications: any) {
  let classificationJson = {};
  if (Array.isArray(classifications)) {
    const filterList0 = classifications.filter((i) => i['@level'].toString() === '0');
    if (filterList0.length > 0) {
      classificationJson = {
        '@level_0': filterList0[0]?.['#text'],
        '@catId_0': filterList0[0]?.['@catId'],
      };
      const filterList1 = classifications.filter((i) => i['@level'].toString() === '1');
      if (filterList1.length > 0) {
        classificationJson = {
          ...classificationJson,
          '@level_1': filterList1[0]?.['#text'],
          '@catId_1': filterList1[0]?.['@catId'],
        };
        const filterList2 = classifications.filter((i) => i['@level'].toString() === '2');
        if (filterList2.length > 0) {
          classificationJson = {
            ...classificationJson,
            '@level_2': filterList2[0]?.['#text'],
            '@catId_2': filterList2[0]?.['@catId'],
          };
        }
      }
    }
  } else {
    classificationJson = {
      '@level_0': classifications?.['#text'],
      '@catId_0': classifications?.['@catId'],
    };
  }
  return removeEmptyObjects(classificationJson);
}

export function classificationToList(classifications: any) {
  let common_class = {};
  if ((classifications?.['@level_0'] ?? '').trim() !== '') {
    common_class = {
      '@level': '0',
      '@catId': classifications?.['@catId_0'],
      '#text': classifications['@level_0'],
    };
    if ((classifications?.['@level_1'] ?? '').trim() !== '') {
      common_class = [
        {
          '@level': '0',
          '@catId': classifications?.['@catId_0'],
          '#text': classifications['@level_0'],
        },
        {
          '@level': '1',
          '@catId': classifications?.['@catId_1'],
          '#text': classifications['@level_1'],
        },
      ];
      if ((classifications?.['@level_2'] ?? '').trim() !== '') {
        common_class = [
          {
            '@level': '0',
            '@catId': classifications?.['@catId_0'],
            '#text': classifications['@level_0'],
          },
          {
            '@level': '1',
            '@catId': classifications?.['@catId_1'],
            '#text': classifications['@level_1'],
          },
          {
            '@level': '2',
            '@catId': classifications?.['@catId_2'],
            '#text': classifications['@level_2'],
          },
        ];
      }
    }
  }
  return removeEmptyObjects(common_class);
}

export function genClassificationZH(classifications: any[], categoryData: any[]) {
  if (classifications.length > 0) {
    const classificationsZH = genClassJsonZH(classifications, 0, categoryData);
    return classificationsZH;
  }
  else {
    return [];
  }
}

export function isValidURL(url: string): boolean {
  if (!url || url === '') {
    return false;
  }
  const urlPattern = new RegExp(
    '^(https?:\\/\\/)?' +
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' +
    '((\\d{1,3}\\.){3}\\d{1,3}))' +
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
    '(\\?[;&a-z\\d%_.~+=-]*)?' +
    '(\\#[-a-z\\d_]*)?$',
    'i',
  );
  return !!urlPattern.test(url);
}

export function formatDateTime(date: any): string {
  const pad = (num: any) => (num < 10 ? '0' + num : num);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

export function validatePasswordStrength(_: any, value: string) {
  if (!value) {
    return Promise.reject(new Error(''));
  }
  if (value.length < 8) {
    return Promise.reject(new Error('Password must be at least 8 characters long!'));
  }
  if (!/[A-Z]/.test(value)) {
    return Promise.reject(new Error('Password must contain at least one uppercase letter!'));
  }
  if (!/[a-z]/.test(value)) {
    return Promise.reject(new Error('Password must contain at least one lowercase letter!'));
  }
  if (!/[0-9]/.test(value)) {
    return Promise.reject(new Error('Password must contain at least one number!'));
  }
  if (!/[!@#$%^&*]/.test(value)) {
    return Promise.reject(new Error('Password must contain at least one special character!'));
  }
  return Promise.resolve();
}

export function jsonToList(json: any) {
  if (json) {
    if (Array.isArray(json)) {
      return json;
    } else {
      return [json];
    }
  }
  return [];
}

export function listToJson(list: any) {
  if (list) {
    if (Array.isArray(list)) {
      if (list.length === 1) {
        return list[0];
      } else if (list.length > 1) {
        return list;
      }
    } else {
      return list;
    }
  }
  return {};
}
