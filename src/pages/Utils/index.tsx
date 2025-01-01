import { FormattedMessage } from 'umi';

export function getDataTitle(dataSource: string) {
  if (dataSource === 'my') {
    return <FormattedMessage id="menu.mydata" defaultMessage="My Data" />;
  } else if (dataSource === 'tg') {
    return <FormattedMessage id="menu.tgdata" defaultMessage="Open Data" />;
  } else if (dataSource === 'co') {
    return <FormattedMessage id="menu.codata" defaultMessage="Commercial Data" />;
  }
  return '';
}
