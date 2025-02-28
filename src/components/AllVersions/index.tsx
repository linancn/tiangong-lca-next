import { getVersionsById } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getLang, getLangText } from '@/services/general/util';
import { CloseOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

interface AllVersionsListProps {
  searchTableName: string;
  nameColume: string;
  id: string;
  children: React.ReactNode;
}

const AllVersionsList: FC<AllVersionsListProps> = ({
  searchTableName,
  nameColume,
  id,
  children,
}) => {
  const actionRef = useRef<ActionType>();
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);
  const intl = useIntl();

  const versionColumns: ProColumns<any>[] = [
    {
      title: <FormattedMessage id="component.allVersions.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="component.allVersions.table.name" defaultMessage="Name" />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (t: any) => {
        const baseNames = [
          'json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->name',
          'json->processDataSet->processInformation->dataSetInformation->name',
          `json->flowDataSet->flowInformation->dataSetInformation->name`,
        ];
        return baseNames.includes(nameColume)
          ? getLangText(t?.baseName, getLang(intl.locale))
          : getLangText(t, getLang(intl.locale));
      },
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
        maskClosable={false}
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
              return getVersionsById(nameColume, searchTableName, id, params, sort);
            }}
            columns={versionColumns}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default AllVersionsList;
