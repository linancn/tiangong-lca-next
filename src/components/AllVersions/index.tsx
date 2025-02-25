import { getVersionsById } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { CloseOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

interface AllVersionsListProps {
  searchTableName: string;
  id: string;
  children: React.ReactNode;
}

const AllVersionsList: FC<AllVersionsListProps> = ({ searchTableName, id, children }) => {
  const actionRef = useRef<ActionType>();
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);

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
      title: (
        <FormattedMessage id="component.allVersions.table.date" defaultMessage="Release Date" />
      ),
      dataIndex: 'created_at',
      sorter: true,
      search: false,
      render: (text: any) => {
        const date = new Date(text);
        return date.toLocaleString();
      },
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

      <Tooltip
        title={<FormattedMessage id="pages.button.allVersion" defaultMessage="All version" />}
      >
        <Button
          size="small"
          shape="circle"
          icon={<UnorderedListOutlined />}
          onClick={() => setShowAllVersionsModal(true)}
        ></Button>
      </Tooltip>

      <Drawer
        title={<FormattedMessage id="pages.button.allVersion" defaultMessage="All version" />}
        width={'90%'}
        open={showAllVersionsModal}
        onClose={() => setShowAllVersionsModal(false)}
        footer={null}
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setShowAllVersionsModal(false)}
          />
        }
        maskClosable={true}
      >
        <Card>
          <ProTable<any, ListPagination>
            rowKey="version"
            // headerTitle={
            //     <FormattedMessage
            //         id="component.allVersions.table.title"
            //         defaultMessage="All Versions"
            //     />
            // }
            actionRef={actionRef}
            search={false}
            options={{ fullScreen: true }}
            pagination={{
              showSizeChanger: false,
              pageSize: 10,
            }}
            toolBarRender={() => {
              return [children];
            }}
            request={async (params: { pageSize: number; current: number }, sort) => {
              return getVersionsById(searchTableName, id, params, sort);
            }}
            columns={versionColumns}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default AllVersionsList;
