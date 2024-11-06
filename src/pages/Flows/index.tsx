import { getFlowTableAll, getFlowTablePgroongaSearch } from '@/services/flows/api';
import { Card, Input, Space, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import { FlowTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import { flowTypeOptions } from './Components/optiondata';
import FlowsView from './Components/view';

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
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'baseName',
      sorter: false,
      search: false,
      render: (_, row) => {
        let name = (
          row.baseName +
          '; ' +
          row.treatmentStandardsRoutes +
          '; ' +
          row.mixAndLocationTypes +
          '; ' +
          row.flowProperties +
          '; '
        ).replace(/-; /g, '');
        if (name.endsWith('; ')) {
          name = name.slice(0, -2);
        }
        if (name.length === 0) {
          name = '-';
        }
        return [
          <Tooltip key={0} placement="topLeft" title={row.synonyms}>
            {name}
          </Tooltip>,
        ];
      },
    },
    {
      title: <FormattedMessage id="pages.flow.flowType" defaultMessage="Flow type" />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
      filters: flowTypeOptions.map((option) => ({ text: option.label, value: option.value })),
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
      title: (
        <FormattedMessage id="pages.flow.locationOfSupply" defaultMessage="Location of supply" />
      ),
      dataIndex: 'locationOfSupply',
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
            <FlowsView buttonType={'icon'} id={row.id} lang={lang} />
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
      <ProTable<FlowTable, ListPagination>
        headerTitle={<FormattedMessage id="menu.tgdata.flows" defaultMessage="Flows" />}
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
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
            return getFlowTablePgroongaSearch(params, lang, dataSource, keyWord, {
              flowType: flowTypeFilter,
            });
          }
          return getFlowTableAll(params, sort, lang, dataSource, { flowType: flowTypeFilter });
        }}
        columns={flowsColumns}
      />
    </PageContainer>
  );
};

export default TableList;
