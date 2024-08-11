import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getProcessTableAll, getProcessTablePgroongaSearch } from '@/services/processes/api';
import { ProcessTable } from '@/services/processes/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Card, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import ProcessCreate from './Components/create';
import ProcessDelete from './Components/delete';
import ProcessEdit from './Components/edit';
import ProcessView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');

  const location = useLocation();
  let dataSource = '';
  if (location.pathname.includes('/mydata')) {
    dataSource = 'my';
  } else if (location.pathname.includes('/tgdata')) {
    dataSource = 'tg';
  }

  const intl = useIntl();

  const lang = getLang(intl.locale);
  const actionRef = useRef<ActionType>();
  const processColumns: ProColumns<ProcessTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'baseName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment ?? '-'}>
          {row.baseName}
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
      title: <FormattedMessage id="pages.process.referenceYear" defaultMessage="Reference Year" />,
      dataIndex: 'referenceYear',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.process.location" defaultMessage="Location" />,
      dataIndex: 'location',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
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
              <ProcessView id={row.id} dataSource={dataSource} buttonType={'icon'} lang={lang}  disabled={false} />
              <ProcessEdit
                id={row.id}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              />
              <ProcessDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <ProcessView id={row.id} dataSource={dataSource} buttonType={'icon'} lang={lang} disabled={false} />
          </Space>,
        ];
      },
    },
  ];

  const onSearch: SearchProps['onSearch'] = async (value) => {
    await setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<ProcessTable, ListPagination>
        actionRef={actionRef}
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [<ProcessCreate key={0} lang={lang} actionRef={actionRef} />];
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
            return getProcessTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getProcessTableAll(params, sort, lang, dataSource);
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
