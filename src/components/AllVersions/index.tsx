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
import { getNextDataSetVersion } from '@/services/general/version';
import { BarsOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Badge, Button, Card, ConfigProvider, Drawer, Tooltip } from 'antd';
import type { FC, MutableRefObject, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useLocation } from 'umi';
interface AllVersionsListProps {
  searchTableName: string;
  searchColume: string;
  id: string;
  columns: ProColumns<any>[];
  lang: string;
  disabled?: boolean;
  versionCount?: number;
  addVersionComponent: ({ newVersion }: { newVersion: string }) => ReactElement;
  operationRender?: (
    row: any,
    context: { actionRef: MutableRefObject<ActionType | undefined> },
  ) => ReactNode;
}

export const getCreateVersionPopupContainer = () => document.body;

const AllVersionsList: FC<AllVersionsListProps> = ({
  searchTableName,
  searchColume,
  id,
  columns,
  lang,
  disabled = false,
  versionCount,
  addVersionComponent,
  operationRender,
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
        if (operationRender) {
          return operationRender(row, { actionRef });
        }

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
    return getNextDataSetVersion(versions);
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.allVersion' defaultMessage='All version' />}
      >
        <Badge size='small' count={versionCount && versionCount > 1 ? versionCount : 0}>
          <Button
            disabled={disabled}
            size='small'
            shape='circle'
            icon={<BarsOutlined />}
            onClick={() => setShowAllVersionsModal(true)}
          ></Button>
        </Badge>
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
              return [
                <ConfigProvider key={0} getPopupContainer={getCreateVersionPopupContainer}>
                  {addVersionComponent({ newVersion: getNewVersion() })}
                </ConfigProvider>,
              ];
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
