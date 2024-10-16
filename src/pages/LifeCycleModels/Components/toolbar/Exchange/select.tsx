import ProcessExchangeView from '@/pages/Processes/Components/Exchange/view';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Card, Col, Drawer, Row, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  lang: string;
  sourceProcessId: string;
  targetProcessId: string;
  sourceRowKeys: Key[];
  targetRowKeys: Key[];
  optionType: string;
  drawerVisible: boolean;
  onData: (data: any) => void;
  onCloseDrawer: () => void;
};

const EdgeExchangeSelect: FC<Props> = ({
  id,
  lang,
  sourceProcessId,
  targetProcessId,
  sourceRowKeys,
  targetRowKeys,
  optionType,
  drawerVisible,
  onData,
  onCloseDrawer,
}) => {
  const [selectedSourceRowKeys, setSelectedSourceRowKeys] = useState<Key[]>([]);
  const [selectedTargetRowKeys, setSelectedTargetRowKeys] = useState<Key[]>([]);
  const [exchangeDataSource, setExchangeDataSource] = useState<any[]>([]);
  const [exchangeDataTarget, setExchangeDataTarget] = useState<any[]>([]);
  const [exchangeDataSourceTable, setExchangeDataSourceTable] = useState<ProcessExchangeTable[]>(
    [],
  );
  const [exchangeDataTargetTable, setExchangeDataTargetTable] = useState<ProcessExchangeTable[]>(
    [],
  );
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const actionRefSelectSource = useRef<ActionType>();
  const actionRefSelectTarget = useRef<ActionType>();

  const onSelectSourceChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedSourceRowKeys(newSelectedRowKeys);
  };

  const onSelectTargetChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedTargetRowKeys(newSelectedRowKeys);
  };

  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'referenceToFlowDataSet',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space>
            <Tooltip key={0} placement="topLeft" title={row?.generalComment ?? '-'}>
              {row?.referenceToFlowDataSet ?? '-'}
            </Tooltip>
            {(row?.quantitativeReference ?? false) ? (
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            ) : (
              ''
            )}
          </Space>
        );
      },
    },
  ];

  const processExchangeColumnsSource: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              dataSource={'my'}
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  const processExchangeColumnsTarget: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataTarget}
              lang={lang}
              dataSource={'my'}
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
    setLoadingSource(true);
    setLoadingTarget(true);
    getProcessDetail(sourceProcessId).then(async (result) => {
      await setExchangeDataSource([
        ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []),
      ]);
      await setExchangeDataSourceTable(
        genProcessExchangeTableData(
          [
            ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ??
              []),
          ]
            ?.map((item) => {
              if (item.exchangeDirection.toLowerCase() === 'output') {
                return item;
              } else {
                return null;
              }
            })
            .filter((item) => item !== null),
          lang,
        ),
      );
      setLoadingSource(false);
    });
    getProcessDetail(targetProcessId).then(async (result) => {
      await setExchangeDataTarget([
        ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []),
      ]);
      await setExchangeDataTargetTable(
        genProcessExchangeTableData(
          [
            ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ??
              []),
          ]
            ?.map((item) => {
              if (item.exchangeDirection.toLowerCase() === 'input') {
                return item;
              } else {
                return null;
              }
            })
            .filter((item) => item !== null),
          lang,
        ),
      );
      setLoadingTarget(false);
    });
  }, [drawerVisible]);

  return (
    <>
      <Drawer
        title={
          optionType === 'create' ? (
            <FormattedMessage
              id="pages.flow.model.drawer.title.edge.exchange.create"
              defaultMessage="Create exchange relation"
            />
          ) : (
            <FormattedMessage
              id="pages.flow.model.drawer.title.edge.exchange.edit"
              defaultMessage="Edit exchange relation"
            />
          )
        }
        width="90%"
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onCloseDrawer} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={onCloseDrawer}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={onCloseDrawer}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              disabled={selectedSourceRowKeys.length === 0 || selectedTargetRowKeys.length === 0}
              onClick={() => {
                const selectedSource = exchangeDataSource.find(
                  (item) => item['@dataSetInternalID'] === selectedSourceRowKeys[0],
                );
                const selectedTarget = exchangeDataTarget.find(
                  (item) => item['@dataSetInternalID'] === selectedTargetRowKeys[0],
                );
                onData({ id: id, selectedSource: selectedSource, selectedTarget: selectedTarget });
                onCloseDrawer();
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <FormattedMessage
                  id="pages.flow.model.sourceOutputFlowName"
                  defaultMessage="Source process output flow"
                />
              }
              bordered={false}
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
                  id="pages.flow.model.targetInputFlowName"
                  defaultMessage="Target process input flow"
                />
              }
              bordered={false}
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

export default EdgeExchangeSelect;
