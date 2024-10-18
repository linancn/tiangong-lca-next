import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getLifeCycleModelTableAll } from '@/services/lifeCycleModels/api';
import { LifeCycleModelTable } from '@/services/lifeCycleModels/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import LifeCycleModelCreate from './Components/create';
import LifeCycleModelDelete from './Components/delete';
import LifeCycleModelEdit from './Components/edit';
import LifeCycleModelView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  // const [keyWord, setKeyWord] = useState<any>('');

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
  const processColumns: ProColumns<LifeCycleModelTable>[] = [
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
          row.functionalUnitFlowProperties +
          '; '
        ).replace(/-; /g, '');

        if (name.endsWith('; ')) {
          name = name.slice(0, -2);
        }
        if (name.length === 0) {
          name = '-';
        }
        return [
          <Tooltip key={0} placement="topLeft" title={row.generalComment}>
            {name}
          </Tooltip>,
        ];
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
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.updatedAt" defaultMessage="Updated at" />,
      dataIndex: 'updatedAt',
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
              <LifeCycleModelView id={row.id} lang={lang} buttonType={'icon'} />
              <LifeCycleModelEdit
                id={row.id}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />
              <LifeCycleModelDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </Space>,
          ];
        }
        return [<Space size={'small'} key={0}></Space>];
      },
    },
  ];

  // const onSearch: SearchProps['onSearch'] = (value) => {
  // setKeyWord(value);
  // actionRef.current?.setPageInfo?.({ current: 1 });
  // actionRef.current?.reload();
  // };

  return (
    <PageContainer header={{ title: false }}>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          // onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<LifeCycleModelTable, ListPagination>
        headerTitle={<FormattedMessage id="menu.tgdata.products" defaultMessage="Product Models" />}
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [
              <LifeCycleModelCreate
                key={0}
                id={undefined}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />,
            ];
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
          // if (keyWord.length > 0) {
          //   return getProductTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          // }
          return getLifeCycleModelTableAll(params, sort, lang, dataSource);
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
