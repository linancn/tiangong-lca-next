import { ListPagination } from '@/services/general/data';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card } from 'antd';
// import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { FormattedMessage,  } from 'umi';
import { getVersionsById } from '@/services/general/api';
// const { Search } = Input;

interface AllVersionsListProps {
  searchTableName: string;
  id: string;
}

const AllVersionsList: FC<AllVersionsListProps> = ({ searchTableName, id }) => {
//   const intl = useIntl();
  const actionRef = useRef<ActionType>();
//   const [keyWord, setKeyWord] = useState<any>('');

  const versionColumns: ProColumns<any>[] = [
    {
      title: <FormattedMessage id="component.allVersions.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="component.allVersions.table.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="component.allVersions.table.date" defaultMessage="Release Date" />,
      dataIndex: 'created_at',
      sorter: true,
      search: false,
      render: (text: any) => {
        const date = new Date(text);
        return date.toLocaleString();
      }
    },
  ];

//   const onSearch: SearchProps['onSearch'] = (value) => {
//     setKeyWord(value);
//     actionRef.current?.setPageInfo?.({ current: 1 });
//     actionRef.current?.reload();
//   };

  useEffect(() => {
    actionRef.current?.reload();
  });

  return (
    <>
      {/* <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card> */}
      <Card>
        <ProTable<any, ListPagination>
          rowKey="version"
          headerTitle={
            <FormattedMessage 
              id="component.allVersions.table.title" 
              defaultMessage="All Versions" 
            />
          }
          actionRef={actionRef}
          search={false}
          options={{ fullScreen: true }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async (params: { pageSize: number; current: number }, sort) => {
            return getVersionsById(searchTableName,id,params,sort);
          }}
          columns={versionColumns}
        />
      </Card>
    </>
  );
};

export default AllVersionsList;
