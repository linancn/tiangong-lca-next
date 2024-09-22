import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Card, Input, Space, Tooltip } from 'antd';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import {
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
} from '@/services/flowproperties/api';
import { useRef, useState } from 'react';

import type { FC } from 'react';
import FlowpropertiesCreate from './Components/create';
import FlowpropertiesDelete from './Components/delete';
import FlowpropertiesEdit from './Components/edit';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import FlowpropertyView from './Components/view';
import { ListPagination } from '@/services/general/data';
import { PageContainer } from '@ant-design/pro-components';
import ProTable from '@ant-design/pro-table';
import ReferenceUnit from '../Unitgroups/Components/Unit/reference';
import { SearchProps } from 'antd/es/input/Search';
import { getLang } from '@/services/general/util';

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
  const flowpropertiesColumns: ProColumns<FlowpropertyTable>[] = [
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
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.name}
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
      title: (
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference unit"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<ReferenceUnit key={0} id={row.refUnitGroupId} idType={'unitgroup'} lang={lang} />];
      },
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
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} />
              <FlowpropertiesEdit
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                lang={lang}
              />
              <FlowpropertiesDelete
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
            <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} />
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
      <ProTable<FlowpropertyTable, ListPagination>
        actionRef={actionRef}
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [<FlowpropertiesCreate lang={lang} key={0} actionRef={actionRef} />];
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
            return getFlowpropertyTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getFlowpropertyTableAll(params, sort, lang, dataSource);
        }}
        columns={flowpropertiesColumns}
      />
    </PageContainer>
  );
};

export default TableList;
