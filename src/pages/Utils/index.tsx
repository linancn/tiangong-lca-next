import { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from 'umi';

import { getLanguageDisplayName } from '@/services/general/contentLanguageRegistry';

export function getDataTitle(dataSource: string) {
  if (dataSource === 'my') {
    return <FormattedMessage id='menu.mydata' defaultMessage='My Data' />;
  } else if (dataSource === 'tg') {
    return <FormattedMessage id='menu.tgdata' defaultMessage='Open Data' />;
  } else if (dataSource === 'co') {
    return <FormattedMessage id='menu.codata' defaultMessage='Commercial Data' />;
  } else if (dataSource === 'te') {
    return <FormattedMessage id='menu.tedata' defaultMessage='Team Data' />;
  }
  return '';
}

export function getAllVersionsColumns(columns: ProColumns<any>[], versionIndex: number) {
  const newColumns = [...columns];
  newColumns[versionIndex] = {
    ...newColumns[versionIndex],
    render: undefined,
  };

  newColumns.pop();
  return newColumns;
}

export function getRules(rules: any[]) {
  return rules.map((rule) => {
    let _rule = { ...rule };
    if (rule.hasOwnProperty('pattern')) {
      if (rule.pattern === 'dataSetVersion') {
        _rule.pattern = /^\d{2}\.\d{2}\.\d{3}$/;
      }
      if (rule.pattern === 'CASNumber') {
        _rule.pattern = /^\d{2,7}-\d{2}-\d$/;
      }
      if (rule.pattern === 'year') {
        _rule.pattern = /^[0-9]{4}$/;
      }
    }
    const result = {
      ..._rule,
      message: <FormattedMessage id={rule.messageKey} defaultMessage={rule.defaultMessage} />,
    };
    delete result.defaultMessage;
    delete result.messageKey;
    return result;
  });
}

export const validateRefObjectId = (
  formRef: React.MutableRefObject<ProFormInstance | undefined>,
  name: Array<string | number>,
  parentName?: Array<string | number>,
) => {
  const refObjectIdPath = parentName
    ? [...parentName, ...name, '@refObjectId']
    : [...name, '@refObjectId'];
  const versionPath = parentName ? [...parentName, ...name, '@version'] : [...name, '@version'];
  const refObjectId = formRef.current?.getFieldValue?.(refObjectIdPath);
  const version = formRef.current?.getFieldValue?.(versionPath);
  const fieldsToClear = [{ name: refObjectIdPath, errors: [] as string[] }];

  if (version || !refObjectId) {
    fieldsToClear.push({ name: versionPath, errors: [] });
  }

  formRef.current?.setFields?.(fieldsToClear);
  formRef.current?.validateFields([refObjectIdPath]);
};

export const getLocalValueProps = (value: string) => ({
  value: getLanguageDisplayName(value),
});

export const getClassificationValues = (value: unknown): string[] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (!('value' in value)) {
    return undefined;
  }
  const raw = (value as { value?: unknown }).value;
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return raw.filter((item): item is string => typeof item === 'string');
};
