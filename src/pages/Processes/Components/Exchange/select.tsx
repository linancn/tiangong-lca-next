import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import {
  ProcessDetailResponse,
  ProcessExchangeData,
  ProcessExchangeTable,
} from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Col, Drawer, Row, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeView from './view';

type ExchangeSelectionData = {
  id: string;
  selectedSource: ProcessExchangeData;
  selectedTarget: ProcessExchangeData;
};

type ProcessIdentity = {
  id: string;
  version: string;
};

type Props = {
  id: string;
  buttonType: string;
  lang: string;
  sourceProcessId: string;
  sourceProcessVersion: string;
  targetProcessId: string;
  targetProcessVersion: string;
  sourceRowKeys: Key[];
  targetRowKeys: Key[];
  optionType: string;
  onData: (data: ExchangeSelectionData) => void;
};

const ExchangeSelect: FC<Props> = ({
  id,
  buttonType,
  lang,
  sourceProcessId,
  sourceProcessVersion,
  targetProcessId,
  targetProcessVersion,
  sourceRowKeys,
  targetRowKeys,
  optionType,
  onData,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSourceRowKeys, setSelectedSourceRowKeys] = useState<Key[]>([]);
  const [selectedTargetRowKeys, setSelectedTargetRowKeys] = useState<Key[]>([]);
  const [exchangeDataSource, setExchangeDataSource] = useState<ProcessExchangeData[]>([]);
  const [exchangeDataTarget, setExchangeDataTarget] = useState<ProcessExchangeData[]>([]);
  const exchangeDataSourceTable = useMemo(
    () =>
      genProcessExchangeTableData(
        exchangeDataSource.filter((item) => item?.exchangeDirection?.toLowerCase() === 'output'),
        lang,
      ),
    [exchangeDataSource, lang],
  );
  const exchangeDataTargetTable = useMemo(
    () =>
      genProcessExchangeTableData(
        exchangeDataTarget.filter((item) => item?.exchangeDirection?.toLowerCase() === 'input'),
        lang,
      ),
    [exchangeDataTarget, lang],
  );
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [loadedSourceProcess, setLoadedSourceProcess] = useState<ProcessIdentity | null>(null);
  const [loadedTargetProcess, setLoadedTargetProcess] = useState<ProcessIdentity | null>(null);
  const actionRefSelectSource = useRef<ActionType>();
  const actionRefSelectTarget = useRef<ActionType>();
  const detailRequestEpochRef = useRef(0);
  const selectedSource = useMemo(
    () =>
      exchangeDataSource.find(
        (item) =>
          item['@dataSetInternalID'] === selectedSourceRowKeys[0] &&
          item.exchangeDirection?.toLowerCase() === 'output',
      ),
    [exchangeDataSource, selectedSourceRowKeys],
  );
  const selectedTarget = useMemo(
    () =>
      exchangeDataTarget.find(
        (item) =>
          item['@dataSetInternalID'] === selectedTargetRowKeys[0] &&
          item.exchangeDirection?.toLowerCase() === 'input',
      ),
    [exchangeDataTarget, selectedTargetRowKeys],
  );
  const canSubmit =
    !loadingSource &&
    !loadingTarget &&
    loadedSourceProcess?.id === sourceProcessId &&
    loadedSourceProcess.version === sourceProcessVersion &&
    loadedTargetProcess?.id === targetProcessId &&
    loadedTargetProcess.version === targetProcessVersion &&
    selectedSource !== undefined &&
    selectedTarget !== undefined;
  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );

  const onSelect = () => {
    setLoadedSourceProcess(null);
    setLoadedTargetProcess(null);
    setLoadingSource(true);
    setLoadingTarget(true);
    setDrawerVisible(true);
  };

  const onSelectSourceChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedSourceRowKeys(newSelectedRowKeys);
  };

  const onSelectTargetChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedTargetRowKeys(newSelectedRowKeys);
  };

  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'referenceToFlowDataSet',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space>
            <Tooltip key={0} placement='topLeft' title={row?.generalComment ?? '-'}>
              {row?.referenceToFlowDataSet ?? '-'}
            </Tooltip>
            {
              <QuantitativeReferenceIcon
                tooltipTitle={row.functionalUnitOrOther}
                value={row?.quantitativeReference}
              />
            }
          </Space>
        );
      },
    },
  ];

  const processExchangeColumnsSource: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  const processExchangeColumnsTarget: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataTarget}
              lang={lang}
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedSourceRowKeys(sourceRowKeys);
    setSelectedTargetRowKeys(targetRowKeys);
  }, [drawerVisible, sourceRowKeys, targetRowKeys]);

  useEffect(() => {
    if (!drawerVisible) return;

    const requestEpoch = detailRequestEpochRef.current + 1;
    detailRequestEpochRef.current = requestEpoch;
    setExchangeDataSource([]);
    setExchangeDataTarget([]);
    setLoadedSourceProcess(null);
    setLoadedTargetProcess(null);
    setLoadingSource(true);
    setLoadingTarget(true);

    void getProcessDetail(sourceProcessId, sourceProcessVersion)
      .then((result: ProcessDetailResponse) => {
        if (detailRequestEpochRef.current !== requestEpoch) {
          return;
        }

        const processData = genProcessFromData(result.data?.json?.processDataSet ?? {});
        setExchangeDataSource([...(processData?.exchanges?.exchange ?? [])]);
        setLoadedSourceProcess({ id: sourceProcessId, version: sourceProcessVersion });
      })
      .finally(() => {
        if (detailRequestEpochRef.current === requestEpoch) {
          setLoadingSource(false);
        }
      });

    void getProcessDetail(targetProcessId, targetProcessVersion)
      .then((result: ProcessDetailResponse) => {
        if (detailRequestEpochRef.current !== requestEpoch) {
          return;
        }

        const processData = genProcessFromData(result.data?.json?.processDataSet ?? {});
        setExchangeDataTarget([...(processData?.exchanges?.exchange ?? [])]);
        setLoadedTargetProcess({ id: targetProcessId, version: targetProcessVersion });
      })
      .finally(() => {
        if (detailRequestEpochRef.current === requestEpoch) {
          setLoadingTarget(false);
        }
      });

    return () => {
      if (detailRequestEpochRef.current === requestEpoch) {
        detailRequestEpochRef.current += 1;
      }
    };
  }, [drawerVisible, sourceProcessId, sourceProcessVersion, targetProcessId, targetProcessVersion]);

  return (
    <>
      {optionType === 'create' ? (
        buttonType === 'icon' ? (
          <Tooltip title={<FormattedMessage id='pages.button.create' defaultMessage='Create' />}>
            <Button type='text' icon={<PlusOutlined />} size={'middle'} onClick={onSelect} />
          </Tooltip>
        ) : (
          <Button onClick={onSelect}>
            <FormattedMessage id='pages.button.create' defaultMessage='Create' />
          </Button>
        )
      ) : buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
          <Button shape='circle' icon={<EditOutlined />} size={'small'} onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id='pages.button.edit' defaultMessage='Edit' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          optionType === 'create' ? (
            <FormattedMessage
              id='pages.flow.model.drawer.title.edge.exchange.create'
              defaultMessage='Create Exchange Relation'
            />
          ) : (
            <FormattedMessage
              id='pages.flow.model.drawer.title.edge.exchange.edit'
              defaultMessage='Edit Exchange Relation'
            />
          )
        }
        width='90%'
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
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit || selectedSource === undefined || selectedTarget === undefined) {
                  return;
                }

                onData({ id: id, selectedSource: selectedSource, selectedTarget: selectedTarget });
                setDrawerVisible(false);
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.submit' defaultMessage='Submit' />
            </Button>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <FormattedMessage
                  id='pages.flow.model.sourceOutputFlowName'
                  defaultMessage='Source process output flow'
                />
              }
              variant='borderless'
            >
              <ProTable<ProcessExchangeTable, ListPagination>
                actionRef={actionRefSelectSource}
                loading={loadingSource}
                search={false}
                pagination={{
                  showSizeChanger: false,
                  pageSize: 10,
                }}
                toolBarRender={false}
                dataSource={exchangeDataSourceTable}
                columns={[...processExchangeColumns, ...processExchangeColumnsSource]}
                tableAlertOptionRender={tableAlertOptionRender}
                rowSelection={{
                  type: 'radio',
                  alwaysShowAlert: true,
                  selectedRowKeys: selectedSourceRowKeys,
                  onChange: onSelectSourceChange,
                }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <FormattedMessage
                  id='pages.flow.model.targetInputFlowName'
                  defaultMessage='Target input flow name'
                />
              }
              variant='borderless'
            >
              <ProTable<ProcessExchangeTable, ListPagination>
                actionRef={actionRefSelectTarget}
                loading={loadingTarget}
                search={false}
                pagination={{
                  showSizeChanger: false,
                  pageSize: 10,
                }}
                toolBarRender={false}
                dataSource={exchangeDataTargetTable}
                columns={[...processExchangeColumns, ...processExchangeColumnsTarget]}
                tableAlertOptionRender={tableAlertOptionRender}
                rowSelection={{
                  type: 'radio',
                  alwaysShowAlert: true,
                  selectedRowKeys: selectedTargetRowKeys,
                  onChange: onSelectTargetChange,
                }}
              />
            </Card>
          </Col>
        </Row>
      </Drawer>
    </>
  );
};

export default ExchangeSelect;
