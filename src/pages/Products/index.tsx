import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getProductTableAll, getProductTablePgroongaSearch } from '@/services/products/api';
import { ProductTable } from '@/services/products/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Card, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import FlowModelDelete from '../Flows/Components/model/delete';
import FlowModelEdit from '../Flows/Components/model/edit';
import FlowModelView from '../Flows/Components/model/view';
import FlowsView from '../Flows/Components/view';

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
  const processColumns: ProColumns<ProductTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment ?? '-'}>
          {row.name}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id="pages.product.belongToFlow" defaultMessage="Belong to The Flow" />
      ),
      dataIndex: 'flowName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Space key={0}>
          <Tooltip placement="topLeft" title={row.flowGeneralComment ?? '-'}>
            {row.flowName}
          </Tooltip>
          <FlowsView buttonType={'icon'} id={row.flowId} lang={lang} />
        </Space>,
      ],
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
              <FlowModelView id={row.id} flowId={row.flowId} buttonType={'icon'} lang={lang} />
              <FlowModelEdit
                id={row.id}
                flowId={row.flowId}
                buttonType={'icon'}
                lang={lang}
                actionRef={actionRef}
              />
              <FlowModelDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <FlowModelView id={row.id} flowId={row.flowId} buttonType={'icon'} lang={lang} />
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
    <PageContainer header={{ title: false }}>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<ProductTable, ListPagination>
        headerTitle={<FormattedMessage id="menu.tgdata.products" defaultMessage="Product Models" />}
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          // if (dataSource === 'my') {
          //   return [<ProcessCreate key={0} lang={lang} actionRef={actionRef} />];
          // }
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
            return getProductTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getProductTableAll(params, sort, lang, dataSource);
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
