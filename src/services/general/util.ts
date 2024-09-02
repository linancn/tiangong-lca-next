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

export function genClassificationZH(classifications: any, categoryData: any) {
  let classificationZH: any[] = [];
  const filterList0 = classifications.find((i: any) => i?.['@level'] === '0');
  if (filterList0) {
    const filterList0_zh = categoryData?.find((i: any) => i?.['@name'] === filterList0?.['#text']);
    classificationZH = [
      {
        '@level': '0',
        '#text': filterList0_zh?.['@nameZH'] ?? filterList0?.['#text'],
      },
    ];
    const filterList1 = classifications.find((ii: any) => ii?.['@level'] === '1');
    if (filterList1) {
      const filterList1_zh = filterList0_zh?.category?.find(
        (ii: any) => ii?.['@name'] === filterList1?.['#text'],
      );
      classificationZH = [
        ...classificationZH,
        {
          '@level': '1',
          '#text': filterList1_zh?.['@nameZH'] ?? filterList1?.['#text'],
        },
      ];
      const filterList2 = classifications.find((ii: any) => ii?.['@level'] === '2');
      if (filterList2) {
        const filterList2_zh = filterList1_zh?.category?.find(
          (ii: any) => ii?.['@name'] === filterList2?.['#text'],
        );
        classificationZH = [
          ...classificationZH,
          {
            '@level': '2',
            '#text': filterList2_zh?.['@nameZH'] ?? filterList2?.['#text'],
          },
        ];
      }
    }
  }
  return classificationZH;
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
