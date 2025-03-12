import { ProColumns } from '@ant-design/pro-components';
import { FormattedMessage } from 'umi';
export function getDataTitle(dataSource: string) {
  if (dataSource === 'my') {
    return <FormattedMessage id="menu.mydata" defaultMessage="My Data" />;
  } else if (dataSource === 'tg') {
    return <FormattedMessage id="menu.tgdata" defaultMessage="Open Data" />;
  } else if (dataSource === 'co') {
    return <FormattedMessage id="menu.codata" defaultMessage="Commercial Data" />;
  } else if (dataSource === 'te') {
    return <FormattedMessage id="menu.tedata" defaultMessage="Team Data" />;
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
