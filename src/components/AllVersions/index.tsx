import ContactView from '@/pages/Contacts/Components/view';
import FlowpropertyView from '@/pages/Flowproperties/Components/view';
import FlowView from '@/pages/Flows/Components/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import SourceView from '@/pages/Sources/Components/view';
import UnitGroupView from '@/pages/Unitgroups/Components/view';
import { getAllVersions } from '@/services/general/api';
import { ListPagination, VersionedDataRow } from '@/services/general/data';
import { getDataSource } from '@/services/general/util';
import { getNextDataSetVersionFromRows } from '@/services/general/version';
import { BarsOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, ConfigProvider, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key, MutableRefObject, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useLocation } from 'umi';
interface AllVersionsListProps {
  searchTableName: string;
  searchColume: string;
  id: string;
  columns: ProColumns<any>[];
  lang: string;
  dataSource?: string;
  stateCode?: number;
  disabled?: boolean;
  addVersionComponent?: ({ newVersion }: { newVersion: string }) => ReactElement;
  operationRender?: (
    row: any,
    context: { actionRef: MutableRefObject<ActionType | undefined> },
  ) => ReactNode;
  operationColumnWidth?: number;
  onSelectVersion?: (row: any) => void;
}

export const getCreateVersionPopupContainer = () => document.body;

export const getAllVersionsOperationColumnWidth = (
  operationColumnWidth?: number,
  hasCustomOperation = false,
) => operationColumnWidth ?? (hasCustomOperation ? 216 : 88);

const AllVersionsList: FC<AllVersionsListProps> = ({
  searchTableName,
  searchColume,
  id,
  columns,
  lang,
  dataSource: dataSourceOverride,
  stateCode,
  disabled = false,
  addVersionComponent,
  operationRender,
  operationColumnWidth,
  onSelectVersion,
}) => {
  const actionRef = useRef<ActionType>();
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);
  const [selectedVersionRowKeys, setSelectedVersionRowKeys] = useState<Key[]>([]);
  const [selectedVersionRow, setSelectedVersionRow] = useState<VersionedDataRow | null>(null);
  const location = useLocation();
  const dataSource = dataSourceOverride ?? getDataSource(location.pathname);
  const tableDataRef = useRef<VersionedDataRow[]>([]);
  const selectable = Boolean(onSelectVersion);

  useEffect(() => {
    if (!showAllVersionsModal) {
      setSelectedVersionRowKeys([]);
      setSelectedVersionRow(null);
      return;
    }

    actionRef.current?.reload();
  }, [showAllVersionsModal]);

  const closeAllVersionsModal = () => {
    setShowAllVersionsModal(false);
  };

  const submitSelectedVersion = () => {
    if (!selectedVersionRow || !onSelectVersion) {
      return;
    }

    onSelectVersion(selectedVersionRow);
    closeAllVersionsModal();
  };

  const allVersionsColumns: ProColumns<any>[] = [
    ...columns,

    {
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Actions'></FormattedMessage>
      ),
      dataIndex: 'option',
      search: false,
      align: 'center',
      fixed: 'right',
      width: getAllVersionsOperationColumnWidth(operationColumnWidth, Boolean(operationRender)),
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
    return getNextDataSetVersionFromRows(tableDataRef.current);
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id='pages.button.allVersion' defaultMessage='All Versions' />}
      >
        <span>
          <Button
            disabled={disabled}
            size='small'
            shape='circle'
            icon={<BarsOutlined />}
            onClick={() => setShowAllVersionsModal(true)}
          ></Button>
        </span>
      </Tooltip>

      <Drawer
        getContainer={() => document.body}
        title={<FormattedMessage id='pages.button.allVersion' defaultMessage='All Versions' />}
        width={'90%'}
        open={showAllVersionsModal}
        onClose={closeAllVersionsModal}
        footer={
          selectable ? (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeAllVersionsModal}>
                <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
              </Button>
              <Button type='primary' disabled={!selectedVersionRow} onClick={submitSelectedVersion}>
                <FormattedMessage id='pages.button.submit' defaultMessage='Submit' />
              </Button>
            </Space>
          ) : null
        }
        closable={false}
        extra={
          <Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeAllVersionsModal} />
        }
        maskClosable={false}
      >
        <Card>
          <ProTable<any, ListPagination>
            rowKey='version'
            actionRef={actionRef}
            search={false}
            options={{ fullScreen: true }}
            scroll={{ x: 'max-content' }}
            tableLayout='fixed'
            pagination={{
              showSizeChanger: false,
              pageSize: 10,
            }}
            rowSelection={
              selectable
                ? {
                    type: 'radio',
                    alwaysShowAlert: true,
                    selectedRowKeys: selectedVersionRowKeys,
                    onChange: (newSelectedRowKeys, selectedRows) => {
                      setSelectedVersionRowKeys(newSelectedRowKeys);
                      setSelectedVersionRow(selectedRows?.[0] ?? null);
                    },
                  }
                : undefined
            }
            toolBarRender={() => {
              if (!addVersionComponent) {
                return [];
              }

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
                stateCode,
              );
              tableDataRef.current = result.data ?? [];
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
