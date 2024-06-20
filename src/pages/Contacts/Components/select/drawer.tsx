import { getContactTable } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  dataSource: string;
  onData: (rowKey: any) => void;
};

const ContactSelectDrawer: FC<Props> = ({ buttonType, lang, dataSource, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const actionRefSelect = useRef<ActionType>();

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />,
      dataIndex: 'shortName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.email" defaultMessage="Email" />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ContactView id={row.id} dataSource={dataSource} actionRef={actionRefSelect} />
          </Space>,
        ];
      },
    },
  ];

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedRowKeys([]);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id="pages.contact.drawer.title.select"
            defaultMessage="Select Cantact"
          />
        }
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        ) : (
          <Button onClick={onSelect} style={{ marginTop: '6px' }}>
            <FormattedMessage
              id="pages.contact.drawer.title.select"
              defaultMessage="Selete Contact"
            />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.contact.drawer.title.select"
            defaultMessage="Selete Contact"
          />
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              onClick={() => {
                onData(selectedRowKeys);
                setDrawerVisible(false);
              }}
              type="primary"
            >
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProTable<ContactTable, ListPagination>
          actionRef={actionRefSelect}
          search={{
            defaultCollapsed: false,
          }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async (
            params: {
              pageSize: number;
              current: number;
            },
            sort,
          ) => {
            return getContactTable(params, sort, lang, dataSource);
          }}
          columns={contactColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </Drawer>
    </>
  );
};

export default ContactSelectDrawer;
