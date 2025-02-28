import { getVersionsById } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { CloseOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitGroupView from '@/pages/Unitgroups/Components/view';
import FlowpropertyView from '@/pages/Flowproperties/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import SourceView from '@/pages/Sources/Components/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import FlowView from '@/pages/Flows/Components/view';
import ContactView from '@/pages/Contacts/Components/view';
interface AllVersionsListProps {
  searchTableName: string;
  searchColume: string;
  id: string;
  children: React.ReactNode;
  columns: ProColumns<any>[];
  lang: string;
}

const AllVersionsList: FC<AllVersionsListProps> = ({
  searchTableName,
  searchColume,
  id,
  children,
  columns,
  lang,
}) => {
  const actionRef = useRef<ActionType>();
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);

  useEffect(() => {
    actionRef.current?.reload();
  });

  const allVersionsColumns = [...columns,

  {
    title: (
      <FormattedMessage id="pages.table.title.option" defaultMessage="Option"></FormattedMessage>
    ),
    dataIndex: 'option',
    search: false,
    render: (_: any, row: any) => {
      switch (searchTableName) {
        case 'lifecyclemodels':
          return <LifeCycleModelView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'processes':
          return <ProcessView disabled={false} id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'flows':
          return <FlowView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'flowproperties':
          return <FlowpropertyView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'unitgroups':
          return <UnitGroupView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'sources':
          return <SourceView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        case 'contacts':
          return <ContactView id={row.id} version={row.version} lang={lang} buttonType="icon" />

        default:
          return null
      }
    }
  }
  ]

  return (
    <>
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
              return getVersionsById(searchColume, searchTableName, id, params, sort, lang);
            }}
            columns={allVersionsColumns}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default AllVersionsList;
