import { getContactTableAll, getContactTablePgroongaSearch } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang } from '@/services/general/util';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getDataTitle } from '../Utils';
import ContactCreate from './Components/create';
import ContactDelete from './Components/delete';
import ContactEdit from './Components/edit';
import ContactView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');

  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tname = searchParams.get('tname');
  const tid = searchParams.get('tid');
  const tids = tid ? tid.split(',') : [];

  const intl = useIntl();

  const lang = getLang(intl.locale);
  const actionRef = useRef<ActionType>();
  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'shortName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.classification" defaultMessage="Classification" />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.email" defaultMessage="E-mail" />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.updatedAt" defaultMessage="Updated at" />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <ContactView
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType="icon"
                // actionRef={actionRef}
              />
              <ContactEdit
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <ContactDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <ContactView
              id={row.id}
              version={row.version}
              lang={lang}
              buttonType="icon"
              // actionRef={actionRef}
            />
          </Space>,
        ];
      },
    },
  ];

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  return (
    <PageContainer header={{ title: tname ?? false, breadcrumb: {} }}>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<ContactTable, ListPagination>
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id="menu.tgdata.contacts" defaultMessage="Contacts" />
          </>
        }
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [<ContactCreate lang={lang} key={0} actionRef={actionRef} />];
          }
          return [];
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          if (keyWord.length > 0) {
            return getContactTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getContactTableAll(params, sort, lang, dataSource, tids);
        }}
        columns={contactColumns}
      />
    </PageContainer>
  );
};

export default TableList;
