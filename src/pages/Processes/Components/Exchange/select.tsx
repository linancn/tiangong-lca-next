import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Col, Drawer, Row, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeView from './view';

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
  onData: (data: any) => void;
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

  const onSelect = () => {
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
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  useEffect(() => {
    if (!drawerVisible) return;
    console.log('sourceRowKeys', sourceRowKeys);
    setSelectedSourceRowKeys(sourceRowKeys);
    setSelectedTargetRowKeys(targetRowKeys);
    setLoadingSource(true);
    setLoadingTarget(true);
    getProcessDetail(sourceProcessId, sourceProcessVersion).then(async (result) => {
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
    getProcessDetail(targetProcessId, targetProcessVersion).then(async (result) => {
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
      {optionType === 'create' ? (
        buttonType === 'icon' ? (
          <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
            <Button type="text" icon={<PlusOutlined />} size={'middle'} onClick={onSelect} />
          </Tooltip>
        ) : (
          <Button onClick={onSelect}>
            <FormattedMessage id="pages.button.create" defaultMessage="Create" />
          </Button>
        )
      ) : buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
          <Button shape="circle" icon={<EditOutlined />} size={'small'} onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
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
                setDrawerVisible(false);
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

export default ExchangeSelect;
