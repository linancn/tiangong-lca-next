import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import { getDataListToolbar } from '@/components/ResponsiveDataList';
import type { OpenDataDatasetKind } from '@/services/openDataCatalog/types';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import {
  ResponsiveDataListViewport,
  dataListPagination,
  orderDataListColumns,
  responsiveDataListTableProps,
} from '@/components/ResponsiveDataList';
import ContactView from '@/pages/Contacts/Components/view';
import FlowpropertyView from '@/pages/Flowproperties/Components/view';
import FlowView from '@/pages/Flows/Components/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import SourceView from '@/pages/Sources/Components/view';
import UnitGroupView from '@/pages/Unitgroups/Components/view';
import { getAllVersions } from '@/services/general/api';
import {
  ContentLanguageAwareTableParams,
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  VersionedDataRow,
} from '@/services/general/data';
import { getAllVersionsSortField } from '@/services/general/tableSort';
import { getDataSource } from '@/services/general/util';
import { getNextDataSetVersionFromRows } from '@/services/general/version';
import { BarsOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, ConfigProvider, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key, ReactElement, ReactNode, RefObject } from 'react';
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
    context: { actionRef: RefObject<ActionType | undefined> },
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
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const datasetKinds: Partial<Record<string, OpenDataDatasetKind>> = {
    lifecyclemodels: 'lifecyclemodel',
    processes: 'process',
    flows: 'flow',
    flowproperties: 'flowproperty',
    unitgroups: 'unitgroup',
    sources: 'source',
    contacts: 'contact',
  };
  const datasetKind = datasetKinds[searchTableName];
  const datasetLabels: Partial<Record<string, ReactNode>> = {
    lifecyclemodels: <FormattedMessage id='menu.tgdata.models' defaultMessage='Models' />,
    processes: <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />,
    flows: <FormattedMessage id='menu.tgdata.flows' defaultMessage='Flows' />,
    flowproperties: (
      <FormattedMessage id='menu.tgdata.flowproperties' defaultMessage='Flow Properties' />
    ),
    unitgroups: <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />,
    sources: <FormattedMessage id='menu.tgdata.sources' defaultMessage='Sources' />,
    contacts: <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />,
  };
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [showAllVersionsModal, setShowAllVersionsModal] = useState(false);
  const [selectedVersionRowKeys, setSelectedVersionRowKeys] = useState<Key[]>([]);
  const [selectedVersionRow, setSelectedVersionRow] = useState<VersionedDataRow | null>(null);
  const location = useLocation();
  const dataSource = dataSourceOverride ?? getDataSource(location.pathname);
  const [creationBaseline, setCreationBaseline] = useState<{
    scope: string;
    newVersion: string;
  } | null>(null);
  const selectable = Boolean(onSelectVersion);
  const contentLanguageParams = getContentLanguageAwareTableParams(lang);
  const currentContentLanguageRef = useRef(contentLanguageParams.contentLanguage);
  const tableRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(
    currentContentLanguageRef,
    contentLanguageParams.contentLanguage,
    [tableRequestEpochRef],
  );

  const creationScope = JSON.stringify([
    id,
    searchTableName,
    searchColume,
    dataSource,
    stateCode,
    contentLanguageParams.contentLanguage,
    Boolean(addVersionComponent),
  ]);
  const creationScopeRef = useRef(creationScope);
  if (creationScopeRef.current !== creationScope) {
    tableRequestEpochRef.current += 1;
    creationScopeRef.current = creationScope;
  }
  const drawerOpenRef = useRef(showAllVersionsModal);
  drawerOpenRef.current = showAllVersionsModal;

  useEffect(
    () => () => {
      drawerOpenRef.current = false;
      tableRequestEpochRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!showAllVersionsModal) {
      setCreationBaseline(null);
      setClassification([]);
      setSelectedVersionRowKeys([]);
      setSelectedVersionRow(null);
      return;
    }

    actionRef.current?.reload();
  }, [showAllVersionsModal]);

  const closeAllVersionsModal = () => {
    drawerOpenRef.current = false;
    tableRequestEpochRef.current += 1;
    setCreationBaseline(null);
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
    ...columns.map((column) => {
      const sortable = Boolean(getAllVersionsSortField(column.dataIndex));
      return {
        ...column,
        ...(!sortable ? { sorter: false, defaultSortOrder: undefined, sortOrder: undefined } : {}),
      };
    }),

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
        size='90%'
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
        mask={{ closable: false }}
      >
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <ProTable<any, ContentLanguageAwareTableParams & { versionScope: string }>
              {...responsiveDataListTableProps}
              scroll={scroll}
              rowKey={(row) => `${row.id}:${row.version}`}
              actionRef={actionRef}
              params={{ ...contentLanguageParams, classification, versionScope: creationScope }}
              search={false}
              options={{ fullScreen: true }}
              toolbar={getDataListToolbar({
                filter: datasetKind ? (
                  <DatasetClassificationFilter
                    datasetKind={datasetKind}
                    lang={lang}
                    value={classification}
                    onChange={(value) => {
                      tableRequestEpochRef.current += 1;
                      setCreationBaseline(null);
                      setClassification(value);
                      setSelectedVersionRowKeys([]);
                      setSelectedVersionRow(null);
                      actionRef.current?.setPageInfo?.({ current: 1 });
                    }}
                  />
                ) : undefined,
              })}
              pagination={dataListPagination}
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
                if (
                  !addVersionComponent ||
                  !creationBaseline ||
                  creationBaseline.scope !== creationScope ||
                  !showAllVersionsModal
                ) {
                  return [];
                }

                return [
                  <ConfigProvider key={0} getPopupContainer={getCreateVersionPopupContainer}>
                    {addVersionComponent({ newVersion: creationBaseline.newVersion })}
                  </ConfigProvider>,
                ];
              }}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                  versionScope?: string;
                },
                sort,
              ) => {
                const {
                  contentLanguage = contentLanguageParams.contentLanguage,
                  pageSize = 50,
                  current = 1,
                  versionScope: _versionScope,
                  ...restParams
                } = params;
                void _versionScope;
                if (!drawerOpenRef.current) return { data: [], total: 0, success: false };
                const requestParams = { ...restParams, pageSize, current };
                const requestScope = JSON.stringify([
                  id,
                  searchTableName,
                  searchColume,
                  dataSource,
                  stateCode,
                  contentLanguage,
                  Boolean(addVersionComponent),
                ]);
                if (addVersionComponent) setCreationBaseline(null);
                return guardLocaleMaterializedTableRequest(
                  contentLanguage,
                  () => currentContentLanguageRef.current,
                  tableRequestEpochRef,
                  async ({ isCurrentRequest }) => {
                    // Creation always uses the complete scope's highest version, independent of table filters, page, or sort.
                    const baselineRequest = addVersionComponent
                      ? getAllVersions(
                          searchColume,
                          searchTableName,
                          id,
                          { current: 1, pageSize: 1 },
                          { version: 'descend' },
                          contentLanguage,
                          dataSource,
                          stateCode,
                        )
                          .then((baseline) => {
                            if (baseline.success === false || !Array.isArray(baseline.data))
                              return null;
                            const versionRows = baseline.data.filter(
                              (row: { version?: unknown }) =>
                                typeof row.version === 'string' &&
                                /^\d+\.\d+\.\d+$/.test(row.version),
                            );
                            return versionRows.length
                              ? getNextDataSetVersionFromRows(versionRows)
                              : null;
                          })
                          .catch(() => null)
                      : Promise.resolve(null);
                    const [result, newVersion] = await Promise.all([
                      getAllVersions(
                        searchColume,
                        searchTableName,
                        id,
                        requestParams,
                        sort,
                        contentLanguage,
                        dataSource,
                        stateCode,
                      ),
                      baselineRequest,
                    ]);
                    if (
                      !isCurrentRequest() ||
                      !drawerOpenRef.current ||
                      creationScopeRef.current !== requestScope
                    ) {
                      return { ...result, data: [], success: false };
                    }
                    if (addVersionComponent)
                      setCreationBaseline(newVersion ? { scope: requestScope, newVersion } : null);
                    return result;
                  },
                );
              }}
              columns={orderDataListColumns(allVersionsColumns, {
                dataType: datasetLabels[searchTableName],
              })}
            />
          )}
        </ResponsiveDataListViewport>
      </Drawer>
    </>
  );
};

export default AllVersionsList;
