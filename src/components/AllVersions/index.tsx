import ContactView from '@/pages/Contacts/Components/view';
import FlowpropertyView from '@/pages/Flowproperties/Components/view';
import FlowView from '@/pages/Flows/Components/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import SourceView from '@/pages/Sources/Components/view';
import UnitGroupView from '@/pages/Unitgroups/Components/view';
import { getAllVersions } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource } from '@/services/general/util';
import { BarsOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Tooltip } from 'antd';
import type { FC, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useLocation } from 'umi';
interface AllVersionsListProps {
  searchTableName: string;
  searchColume: string;
  id: string;
  columns: ProColumns<any>[];
  lang: string;
  disabled?: boolean;
  addVersionComponent: ({ newVersion }: { newVersion: string }) => ReactElement;
}

const AllVersionsList: FC<AllVersionsListProps> = ({
  searchTableName,
  searchColume,
  id,
  columns,
  lang,
  disabled = false,
  addVersionComponent,
}) => {
  const actionRef = useRef<ActionType>();
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);
  const tableDataRef = useRef<any[]>([]);

  useEffect(() => {
    actionRef.current?.reload();
  });

  const allVersionsColumns = [
    ...columns,

    {
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Option'></FormattedMessage>
      ),
      dataIndex: 'option',
      search: false,
      render: (_: any, row: any) => {
        switch (searchTableName) {
          case 'lifecyclemodels':
            return (
              <LifeCycleModelView id={row.id} version={row.version} lang={lang} buttonType='icon' />
            );

          case 'processes':
            return (
              <ProcessView
                disabled={false}
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType='icon'
              />
            );

          case 'flows':
            return <FlowView id={row.id} version={row.version} lang={lang} buttonType='icon' />;

          case 'flowproperties':
            return (
              <FlowpropertyView id={row.id} version={row.version} lang={lang} buttonType='icon' />
            );

          case 'unitgroups':
            return (
              <UnitGroupView id={row.id} version={row.version} lang={lang} buttonType='icon' />
            );

          case 'sources':
            return <SourceView id={row.id} version={row.version} lang={lang} buttonType='icon' />;

          case 'contacts':
            return <ContactView id={row.id} version={row.version} lang={lang} buttonType='icon' />;

          default:
            return null;
        }
      },
    },
  ];

  const getNewVersion = (): string => {
    const versions = tableDataRef.current.map((i: any) => i.version);
    if (!versions || versions.length === 0) {
      return '00.00.000';
    }

    const compareVersions = (v1: string, v2: string): number => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);

      for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
      }
      return 0;
    };

    let maxVersion = versions[0];
    for (let i = 1; i < versions.length; i++) {
      if (compareVersions(versions[i], maxVersion) > 0) {
        maxVersion = versions[i];
      }
    }

    const parts = maxVersion.split('.').map(Number);
    parts[2] += 1;

    if (parts[2] > 999) {
      parts[2] = 0;
      parts[1] += 1;

      if (parts[1] > 99) {
        parts[1] = 0;
        parts[0] += 1;
      }
    }

    return `${String(parts[0]).padStart(2, '0')}.${String(parts[1]).padStart(2, '0')}.${String(parts[2]).padStart(3, '0')}`;
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.allVersion' defaultMessage='All version' />}
      >
        <Button
          disabled={disabled}
          size='small'
          shape='circle'
          icon={<BarsOutlined />}
          onClick={() => setShowAllVersionsModal(true)}
        ></Button>
      </Tooltip>

      <Drawer
        getContainer={() => document.body}
        title={<FormattedMessage id='pages.button.allVersion' defaultMessage='All version' />}
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
            rowKey='version'
            actionRef={actionRef}
            search={false}
            options={{ fullScreen: true }}
            pagination={{
              showSizeChanger: false,
              pageSize: 10,
            }}
            toolBarRender={() => {
              return [<div key={0}>{addVersionComponent({ newVersion: getNewVersion() })}</div>];
            }}
            request={async (params: { pageSize: number; current: number }, sort) => {
              const result = await getAllVersions(
                searchColume,
                searchTableName,
                id,
                params,
                sort,
                lang,
                dataSource,
              );
              tableDataRef.current = result.data;
              return result;
            }}
            columns={allVersionsColumns}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default AllVersionsList;
