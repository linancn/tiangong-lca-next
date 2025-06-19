import { getReferenceUnitGroups } from '@/services/flowproperties/api';
import { getFlowProperties } from '@/services/flows/api';
import { getReferenceUnits } from '@/services/unitgroups/api';
import { Classification } from './data';
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

export async function getUnitData(idType: string, data: any) {
  return new Promise((resolve) => {
    if (idType === 'flow') {
      const flowPropertiesParams = data?.map((item: any) => {
        return {
          id: item?.referenceToFlowDataSetId,
          version: item?.referenceToFlowDataSetVersion,
        };
      });
      getFlowProperties(flowPropertiesParams).then((flowPropertiesRes: any) => {
        const params = flowPropertiesRes?.data?.map((item: any) => {
          return {
            id: item?.refFlowPropertytId,
            version: item?.version,
          };
        });
        getReferenceUnitGroups(params).then((unitGroupsRes: any) => {
          const unitParams = unitGroupsRes?.data?.map((item: any) => {
            return {
              id: item?.refUnitGroupId,
              version: item?.version,
            };
          });
          getReferenceUnits(unitParams).then((unitsRes: any) => {
            data.forEach((item: any) => {
              let flowProperty = flowPropertiesRes?.data.find(
                (flowProperty: any) =>
                  flowProperty?.id === item?.referenceToFlowDataSetId &&
                  flowProperty?.version === item?.referenceToFlowDataSetVersion,
              );
              if (!flowProperty) {
                flowProperty = flowPropertiesRes?.data.find(
                  (flowProperty: any) => flowProperty?.id === item?.referenceToFlowDataSetId,
                );
              }

              let unitGroup = unitGroupsRes?.data.find(
                (group: any) =>
                  group?.id === flowProperty?.refFlowPropertytId &&
                  group?.version === flowProperty?.version,
              );
              if (!unitGroup) {
                unitGroup = unitGroupsRes?.data.find(
                  (group: any) => group?.id === flowProperty?.refFlowPropertytId,
                );
              }

              if (unitGroup) {
                let unit = unitsRes?.data.find(
                  (unit: any) =>
                    unit?.id === unitGroup?.refUnitGroupId && unit?.version === unitGroup?.version,
                );
                if (!unit) {
                  unit = unitsRes?.data.find((unit: any) => unit?.id === unitGroup?.refUnitGroupId);
                }

                if (unit) {
                  item['refUnitRes'] = unit;
                }
              }
            });
            resolve(data);
          });
        });
      });
    }

    if (idType === 'unitgroup') {
      const unitParams = data?.map((item: any) => {
        return {
          id: item?.refUnitGroupId,
          version: item?.version,
        };
      });
      getReferenceUnits(unitParams).then((unitsRes: any) => {
        data.forEach((item: any) => {
          let unit = unitsRes?.data?.find(
            (e: any) => e?.id === item?.refUnitGroupId && e?.version === item?.version,
          );
          if (!unit) {
            unit = unitsRes?.data?.find((e: any) => e?.id === item?.refUnitGroupId);
          }
          if (unit) {
            item['refUnitRes'] = unit;
          }
        });
        resolve(data);
      });
    }
    if (idType === 'flowproperty') {
      const params = data?.map((item: any) => {
        return {
          id: item?.referenceToFlowPropertyDataSetId,
          version: item?.referenceToFlowPropertyDataSetVersion,
        };
      });
      getReferenceUnitGroups(params).then((unitGroupsRes: any) => {
        const unitParams = unitGroupsRes?.data?.map((item: any) => {
          return {
            id: item?.refUnitGroupId,
            version: item?.version,
          };
        });
        getReferenceUnits(unitParams).then((unitsRes: any) => {
          data.forEach((item: any) => {
            let unitGroup = unitGroupsRes?.data.find(
              (group: any) =>
                group?.id === item?.referenceToFlowPropertyDataSetId &&
                group?.version === item?.referenceToFlowPropertyDataSetVersion,
            );
            if (!unitGroup) {
              unitGroup = unitGroupsRes?.data.find(
                (group: any) => group?.id === item?.referenceToFlowPropertyDataSetId,
              );
            }
            if (unitGroup) {
              let unit = unitsRes?.data.find(
                (unit: any) =>
                  unit?.id === unitGroup?.refUnitGroupId && unit?.version === unitGroup?.version,
              );
              if (!unit) {
                unit = unitsRes?.data.find((unit: any) => unit?.id === unitGroup?.refUnitGroupId);
              }
              if (unit) {
                item['refUnitRes'] = unit;
              }
            }
          });
          resolve(data);
        });
      });
    }
  });
}

export function genClassStr(
  data: string[],
  index: number,
  classification: Classification[],
): string {
  const c = classification?.find((i) => i?.value === data?.[index]);
  if (c) {
    if (data.length > index + 1) {
      return c?.label + ' / ' + genClassStr(data, index + 1, c?.children);
    } else {
      return c?.label;
    }
  } else {
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

export function genClassIdList(
  data: any[],
  index: number,
  classification: Classification[],
): string[] {
  const c = classification?.find((i) => i?.value === data?.[index]);
  if (c) {
    const newId = c?.id ?? '';
    if (data.length > index + 1) {
      return [newId, ...genClassIdList(data, index + 1, c?.children)];
    }
    return [newId];
  } else {
    const newId = '';
    if (data.length > index + 1) {
      return [newId, ...genClassIdList(data, index + 1, [])];
    }
    return [newId];
  }
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
  } else {
    if (d) {
      const newD = {
        '@level': index.toString(),
        '#text': d?.['#text'],
      };
      return [newD, ...genClassJsonZH(data, index + 1, [])];
    } else {
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
    if (classifications && classifications.length > 0) {
      for (let i = 0; i < classifications.length; i++) {
        const filterList = classifications.find((c) => c['@level'] === i.toString());
        classificationStr += filterList?.['#text'] + ' / ';
      }
      classificationStr = classificationStr.slice(0, -3);
    } else {
      classificationStr = '-';
    }
  } catch (e) {
    console.log(e);
  }
  return classificationStr;
}

export function classificationToStringList(classifications: any, elementaryFlow: boolean = false) {
  let idStrList = [];
  let valueStrList = [];
  try {
    if (Array.isArray(classifications)) {
      for (let i = 0; i < classifications.length; i++) {
        const filterList = classifications.find((c) => c['@level'] === i.toString());
        if (filterList) {
          if (elementaryFlow) {
            idStrList.push(filterList?.['@catId']);
            valueStrList.push(filterList?.['#text']);
          } else {
            idStrList.push(filterList?.['@classId']);
            valueStrList.push(filterList?.['#text']);
          }
        }
      }
    } else {
      if (elementaryFlow) {
        idStrList = [classifications?.['@catId']];
        valueStrList = [classifications?.['#text']];
      } else {
        idStrList = [classifications?.['@classId']];
        valueStrList = [classifications?.['#text']];
      }
    }
  } catch (e) {
    console.log(e);
  }
  return { id: idStrList, value: valueStrList };
}

export function classificationToJsonList(classifications: any, elementaryFlow: boolean = false) {
  let common_class = {};
  if (
    classifications &&
    classifications?.value &&
    Array.isArray(classifications?.value) &&
    classifications?.value.length > 0
  ) {
    if (classifications.value.length === 1) {
      if (elementaryFlow) {
        common_class = {
          '@level': '0',
          '@catId': classifications?.id?.[0] ?? '',
          '#text': classifications.value[0],
        };
      } else {
        common_class = {
          '@level': '0',
          '@classId': classifications?.id?.[0] ?? '',
          '#text': classifications.value[0],
        };
      }
    } else {
      common_class = classifications?.value.map((value: any, index: number) => {
        if (elementaryFlow) {
          return {
            '@level': index.toString(),
            '@catId': classifications?.id?.[index] ?? '',
            '#text': value,
          };
        } else {
          return {
            '@level': index.toString(),
            '@classId': classifications?.id?.[index] ?? '',
            '#text': value,
          };
        }
      });
    }
  }
  return removeEmptyObjects(common_class);
}

// export function classificationToJson(classifications: any) {
//   let classificationJson = {};
//   if (Array.isArray(classifications)) {
//     const filterList0 = classifications.filter((i) => i['@level'].toString() === '0');
//     if (filterList0.length > 0) {
//       classificationJson = {
//         '@level_0': filterList0[0]?.['#text'],
//         '@catId_0': filterList0[0]?.['@catId'],
//       };
//       const filterList1 = classifications.filter((i) => i['@level'].toString() === '1');
//       if (filterList1.length > 0) {
//         classificationJson = {
//           ...classificationJson,
//           '@level_1': filterList1[0]?.['#text'],
//           '@catId_1': filterList1[0]?.['@catId'],
//         };
//         const filterList2 = classifications.filter((i) => i['@level'].toString() === '2');
//         if (filterList2.length > 0) {
//           classificationJson = {
//             ...classificationJson,
//             '@level_2': filterList2[0]?.['#text'],
//             '@catId_2': filterList2[0]?.['@catId'],
//           };
//         }
//       }
//     }
//   } else {
//     classificationJson = {
//       '@level_0': classifications?.['#text'],
//       '@catId_0': classifications?.['@catId'],
//     };
//   }
//   return removeEmptyObjects(classificationJson);
// }

// export function classificationToList(classifications: any) {
//   let common_class = {};
//   if ((classifications?.['@level_0'] ?? '').trim() !== '') {
//     common_class = {
//       '@level': '0',
//       '@catId': classifications?.['@catId_0'],
//       '#text': classifications['@level_0'],
//     };
//     if ((classifications?.['@level_1'] ?? '').trim() !== '') {
//       common_class = [
//         {
//           '@level': '0',
//           '@catId': classifications?.['@catId_0'],
//           '#text': classifications['@level_0'],
//         },
//         {
//           '@level': '1',
//           '@catId': classifications?.['@catId_1'],
//           '#text': classifications['@level_1'],
//         },
//       ];
//       if ((classifications?.['@level_2'] ?? '').trim() !== '') {
//         common_class = [
//           {
//             '@level': '0',
//             '@catId': classifications?.['@catId_0'],
//             '#text': classifications['@level_0'],
//           },
//           {
//             '@level': '1',
//             '@catId': classifications?.['@catId_1'],
//             '#text': classifications['@level_1'],
//           },
//           {
//             '@level': '2',
//             '@catId': classifications?.['@catId_2'],
//             '#text': classifications['@level_2'],
//           },
//         ];
//       }
//     }
//   }
//   return removeEmptyObjects(common_class);
// }

export function genClassificationZH(classifications: any[], categoryData: any[]) {
  if (classifications.length > 0) {
    const classificationsZH = genClassJsonZH(classifications, 0, categoryData);
    return classificationsZH;
  } else {
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

export function toAmountNumber(amount: string) {
  let thisAmount = Number(amount);
  if (isNaN(thisAmount)) {
    return 0;
  } else {
    return thisAmount;
  }
}

export function getDataSource(pathname: string) {
  if (pathname.includes('/mydata')) {
    return 'my';
  } else if (pathname.includes('/tgdata')) {
    return 'tg';
  } else if (pathname.includes('/codata')) {
    return 'co';
  } else if (pathname.includes('/tedata')) {
    return 'te';
  }
  return '';
}

export function getRuleVerification(schema: any, data: any) {
  const result: any = { valid: true, errors: [] };
  const requiredPaths: Array<{ path: string; rule: any }> = [];

  const collectRequiredPaths = (schemaObj: any, path: string = '') => {
    if (!schemaObj || typeof schemaObj !== 'object') return;

    Object.keys(schemaObj).forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const schemaValue = schemaObj[key];

      if (schemaValue && schemaValue.rules) {
        const rules = schemaValue.rules;
        for (const rule of rules) {
          if (rule.required) {
            requiredPaths.push({
              path: currentPath,
              rule: rule,
            });
            break;
          }
        }
      }

      if (schemaValue && typeof schemaValue === 'object' && !schemaValue.rules) {
        collectRequiredPaths(schemaValue, currentPath);
      }
    });
  };

  const getValueByPath = (obj: any, path: string) => {
    if (!obj) return undefined;

    if (path.includes(':') && !path.includes('.')) {
      return obj[path];
    }

    if (path.includes('.')) {
      const parts = path.split('.');
      let current = obj;

      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
      }

      return current;
    }

    return obj[path];
  };

  const isEmpty = (value: any) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  collectRequiredPaths(schema);

  requiredPaths.forEach(({ path, rule }) => {
    let value = getValueByPath(data, path);

    if (value && typeof value === 'object' && value.value !== undefined) {
      value = value.value;
    }

    if (path.includes('common:class')) {
      if (!value) {
        const classPath = path.includes('common:class.0')
          ? path.replace('common:class.0', 'common:class')
          : path.replace('common:class', 'common:class.0');
        value = getValueByPath(data, classPath);
      }
    }

    const baseProcessInstancePath =
      'lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance';
    if (path.includes(`${baseProcessInstancePath}.0.connections`)) {
      if (!value) {
        value = getValueByPath(data, `${baseProcessInstancePath}`)?.find(
          (item: any) => item.connections,
        );
      }
    }

    if (
      isEmpty(value) &&
      !path.includes('modellingAndValidation.validation.review') &&
      !path.includes('modellingAndValidation.complianceDeclarations.compliance')
    ) {
      result.valid = false;
      result.errors.push({
        path,
        message: rule.defaultMessage || rule.messageKey,
        rule: 'required',
      });
    }
  });

  if (!result.valid) {
    console.log('getRuleVerificationFalse', result);
  }

  return result.valid;
}
