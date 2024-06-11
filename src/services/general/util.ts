export function getLang(locale: string) {
  if (locale === 'zh-CN') {
    return 'zh';
  } else {
    return 'en';
  }
}

export function getLangText(langTexts: any, lang: string) {
  let text = '-';
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
    text = langTexts['#text'] ?? '-';
  }
  return text;
}

export function getLangList(langTexts: any) {
  if (Array.isArray(langTexts)) {
    return langTexts;
  } else {
    return [langTexts];
  }
}

export function classificationToString(classifications: any) {
  let classificationStr = '-';
  if (Array.isArray(classifications)) {
    const filterList0 = classifications.filter((i) => i['@level'] === '0');
    if (filterList0.length > 0) {
      classificationStr = filterList0[0]['#text'] ?? '-';
      const filterList1 = classifications.filter((i) => i['@level'] === '1');
      if (filterList1.length > 0) {
        classificationStr = classificationStr + ' > ' + filterList1[0]['#text'] ?? '-';
        const filterList2 = classifications.filter((i) => i['@level'] === '2');
        if (filterList2.length > 0) {
          classificationStr = classificationStr + ' > ' + filterList2[0]['#text'] ?? '-';
        }
      }
    }
  } else {
    classificationStr = classifications['#text'] ?? '-';
  }
  console.log('classificationStr', classificationStr);
  return classificationStr;
}

export function classificationToJson(classifications: any) {
  let classificationJson = {};
  if (Array.isArray(classifications)) {
    const filterList0 = classifications.filter((i) => i['@level'] === 0);
    if (filterList0.length > 0) {
      classificationJson = { '@level_0': filterList0[0]['#text'] ?? '-' };
      const filterList1 = classifications.filter((i) => i['@level'] === 1);
      if (filterList1.length > 0) {
        classificationJson = { ...classificationJson, '@level_1': filterList1[0]['#text'] ?? '-' };
        const filterList2 = classifications.filter((i) => i['@level'] === 2);
        if (filterList2.length > 0) {
          classificationJson = {
            ...classificationJson,
            '@level_2': filterList2[0]['#text'] ?? '-',
          };
        }
      }
    }
  } else {
    classificationJson = { '@level_0': classifications['#text'] ?? '-' };
  }
  return classificationJson;
}
