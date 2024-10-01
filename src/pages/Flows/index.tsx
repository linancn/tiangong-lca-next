import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Card, Input, Space, Tooltip } from 'antd';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getFlowTableAll, getFlowTablePgroongaSearch } from '@/services/flows/api';
import { useRef, useState } from 'react';

import type { FC } from 'react';
import FlowModel from './Components/model';
import { FlowTable } from '@/services/flows/data';
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import FlowsView from './Components/view';
import { ListPagination } from '@/services/general/data';
import { PageContainer } from '@ant-design/pro-components';
import ProTable from '@ant-design/pro-table';
import { SearchProps } from 'antd/es/input/Search';
import { flowTypeOptions } from './Components/optiondata';
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
  const flowsColumns: ProColumns<FlowTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Base name" />,
      dataIndex: 'baseName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.synonyms}>
          {row.baseName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.flow.flowType" defaultMessage="Flow type" />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
      filters: flowTypeOptions.map(option => ({ text: option.label, value: option.value })),
      render: (_, row) => {
        const flowType = flowTypeOptions.find((i) => i.value === row.flowType);
        if (flowType) {
          return flowType.label;
        }
        return row.flowType;
      },
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
      title: <FormattedMessage id="pages.flow.CASNumber" defaultMessage="CAS Number" />,
      dataIndex: 'CASNumber',
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
    // {
    //   title: (
    //     <FormattedMessage
    //       id="pages.flowproperty.referenceToReferenceUnitGroup"
    //       defaultMessage="Reference Unit Group"
    //     />
    //   ),
    //   dataIndex: 'refUnitGroup',
    //   sorter: false,
    //   search: false,
    //   render: (_, row) => {
    //     return [
    //         <ReferenceUnit key={0} id={row.refFlowPropertyId} idType={'flowproperty'} lang={lang} />,
    //     ];
    //   },
    // },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowModel buttonType={'icon'} flowId={row.id} lang={lang} dataSource={dataSource} />
              <FlowsView buttonType={'icon'} id={row.id} lang={lang} />
              <FlowsEdit id={row.id} lang={lang} buttonType={'icon'} actionRef={actionRef} />
              <FlowsDelete
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
            <FlowModel buttonType={'icon'} flowId={row.id} lang={lang} dataSource={dataSource} />
            <FlowsView buttonType={'icon'} id={row.id} lang={lang} />
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
      <ProTable<FlowTable, ListPagination>
        actionRef={actionRef}
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [<FlowsCreate key={0} lang={lang} actionRef={actionRef} />];
          }
          return [];
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
          filter,
        ) => {
          const flowTypeFilter = filter?.flowType ? filter.flowType.join(',') : '';
          if (keyWord.length > 0) {
            return getFlowTablePgroongaSearch(params, lang, dataSource, keyWord, { flowType: flowTypeFilter });
          }
          return getFlowTableAll(params, sort, lang, dataSource, { flowType: flowTypeFilter });
        }}
        columns={flowsColumns}
      />
    </PageContainer>
  );
};

export default TableList;
