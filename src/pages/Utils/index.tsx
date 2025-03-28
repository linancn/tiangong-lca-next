import { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from 'umi';
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
  return rules.map((rule) => ({
    ...rule,
    message: <FormattedMessage id={rule.messageKey} defaultMessage={rule.defaultMessage} />,
  }));
}

export const validateRefObjectId = (
  formRef: React.MutableRefObject<ProFormInstance | undefined>,
  parentName: string[],
  name: string[],
) => {
  if (parentName) {
    formRef.current?.validateFields([[...parentName, ...name, '@refObjectId']]);
  } else {
    formRef.current?.validateFields([[...name, '@refObjectId']]);
  }
};

export const getLocalValueProps = (value: string) => ({
  value: value === 'en' ? 'English' : value === 'zh' ? '简体中文' : value,
});
