import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Col, Drawer, Row, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  lang: string;
  sourceProcessId: string;
  targetProcessId: string;
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
  targetProcessId,
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
            {row?.quantitativeReference ?? false ? (
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            ) : (
              ''
            )}
          </Space>
        );
      },
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      // render: (_, row) => {
      //     return [
      //         <Space size={'small'} key={0}>
      //             <ProcessExchangeView
      //                 id={row.dataSetInternalID}
      //                 data={exchangeDataSource}
      //                 lang={lang}
      //                 dataSource={'my'}
      //                 buttonType={'icon'}
      //                 actionRef={actionRefExchangeTable}
      //             />
      //             <ProcessExchangeEdit
      //                 id={row.dataSetInternalID}
      //                 data={exchangeDataSource}
      //                 lang={lang}
      //                 buttonType={'icon'}
      //                 actionRef={actionRefExchangeTable}
      //                 onData={handletExchangeData}
      //                 setViewDrawerVisible={() => { }}
      //             />
      //             <ProcessExchangeDelete
      //                 id={row.dataSetInternalID}
      //                 data={exchangeDataSource}
      //                 buttonType={'icon'}
      //                 actionRef={actionRef}
      //                 setViewDrawerVisible={() => { }}
      //                 onData={handletExchangeData}
      //             />
      //         </Space>,
      //     ];
      // },
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
        title={
          optionType === 'create' ? (
            <FormattedMessage
              id="pages.source.drawer.title.create.edge.exchange"
              defaultMessage="Create Edge Exchange"
            />
          ) : (
            <FormattedMessage
              id="pages.source.drawer.title.edit.edge.exchange"
              defaultMessage="Edit  Edge Exchange"
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
            <Card title="Source Process Output Flow" bordered={false}>
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
                columns={processExchangeColumns}
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
            <Card title="Target Process Input Flow" bordered={false}>
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
                columns={processExchangeColumns}
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
