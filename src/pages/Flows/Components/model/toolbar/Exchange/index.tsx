import ExchangeSelect from '@/pages/Processes/Components/Exchange/select';
import { ListPagination } from '@/services/general/data';
import { EdgeExchangeTable } from '@/services/products/data';
import { genEdgeExchangeTableData } from '@/services/products/util';
import styles from '@/style/custom.less';
import { ArrowRightOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import EdgeExchangeView from './view';

type Props = {
  lang: string;
  disabled: boolean;
  edge: any;
  nodes: any[];
  readonly: boolean;
  onData: (data: any) => void;
};
const EdgeExhange: FC<Props> = ({ lang, disabled, edge, nodes, readonly, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [sourceNode, setSourceNode] = useState<any>();
  const [targetNode, setTargetNode] = useState<any>();

  const actionRef = useRef<ActionType>();

  const onCreateData = (data: any) => {
    const newData = {
      id: v4(),
      sourceProcessId: sourceNode?.data?.id ?? '-',
      sourceOutputFlowInternalID: data?.selectedSource?.['@dataSetInternalID'] ?? '-',
      sourceOutputFlowId: data?.selectedSource?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
      sourceOutputFlowName:
        data?.selectedSource?.referenceToFlowDataSet?.['common:shortDescription'],
      sourceOutputFlowGeneralComment: data?.selectedSource?.generalComment,
      targetProcessId: targetNode?.data?.id ?? '-',
      targetInputFlowInternalID: data?.selectedTarget?.['@dataSetInternalID'] ?? '-',
      targetInputFlowId: data?.selectedTarget?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
      targetInputFlowName:
        data?.selectedTarget?.referenceToFlowDataSet?.['common:shortDescription'],
      targetInputFlowGeneralComment: data?.selectedTarget?.generalComment,
    };
    setDataSource([...dataSource, newData]);
  };

  const onEditData = (data: any) => {
    const newData = {
      id: data.id,
      sourceProcessId: sourceNode?.data?.id ?? '-',
      sourceOutputFlowInternalID: data?.selectedSource?.['@dataSetInternalID'] ?? '-',
      sourceOutputFlowId: data?.selectedSource?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
      sourceOutputFlowName:
        data?.selectedSource?.referenceToFlowDataSet?.['common:shortDescription'],
      sourceOutputFlowGeneralComment: data?.selectedSource?.generalComment,
      targetProcessId: targetNode?.data?.id ?? '-',
      targetInputFlowInternalID: data?.selectedTarget?.['@dataSetInternalID'] ?? '-',
      targetInputFlowId: data?.selectedTarget?.referenceToFlowDataSet?.['@refObjectId'] ?? '-',
      targetInputFlowName:
        data?.selectedTarget?.referenceToFlowDataSet?.['common:shortDescription'],
      targetInputFlowGeneralComment: data?.selectedTarget?.generalComment,
    };
    const updatedDataSource = dataSource.map((item) => (item.id === newData.id ? newData : item));
    setDataSource(updatedDataSource);
  };

  const onDeleteData = (data: any) => {
    const updatedDataSource = dataSource.filter((item) => item.id !== data);
    setDataSource(updatedDataSource);
  };

  const edgeExhangeColumns: ProColumns<EdgeExchangeTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.flow.model.sourceOutputFlowName"
          defaultMessage="Source Output Flow Name"
        />
      ),
      dataIndex: 'sourceOutputFlowName',
      sorter: false,
      search: false,
      readonly: true,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.sourceOutputFlowGeneralComment ?? '-'}>
          {row.sourceOutputFlowName ?? '-'}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage
          id="pages.flow.model.targetInputFlowName"
          defaultMessage="Target Input Flow Name"
        />
      ),
      dataIndex: 'targetInputFlowName',
      sorter: false,
      search: false,
      readonly: true,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.targetInputFlowGeneralComment ?? '-'}>
          {row.targetInputFlowName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      readonly: true,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <EdgeExchangeView
              lang={lang}
              buttonType={'icon'}
              sourceProcessId={sourceNode?.data?.id}
              targetProcessId={targetNode?.data?.id}
              sourceOutputFlowInternalID={row.sourceOutputFlowInternalID}
              targetInputFlowInternalID={row.targetInputFlowInternalID}
            />
            {readonly ? (
              <></>
            ) : (
              <>
                <ExchangeSelect
                  id={row.id}
                  lang={lang}
                  buttonType={'icon'}
                  sourceProcessId={sourceNode?.data?.id}
                  targetProcessId={targetNode?.data?.id}
                  onData={onEditData}
                  sourceRowKeys={[row.sourceOutputFlowInternalID]}
                  targetRowKeys={[row.targetInputFlowInternalID]}
                  optionType={'edit'}
                />
                <Tooltip
                  title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}
                >
                  <Button
                    shape="circle"
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => {
                      onDeleteData(row.id);
                    }}
                  />
                </Tooltip>
              </>
            )}
          </Space>,
        ];
      },
    },
  ];

  const onOpenDrawer = () => {
    setDrawerVisible(true);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setDataSource(edge?.data?.exchange ?? []);
    const source = nodes.find((node) => node.id === (edge.source as any)?.cell);
    const target = nodes.find((node) => node.id === (edge.target as any)?.cell);
    setSourceNode(source);
    setTargetNode(target);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id="pages.button.model.exchange"
            defaultMessage="Exchange Relation"
          ></FormattedMessage>
        }
        placement="left"
      >
        <Button
          shape="circle"
          size="small"
          icon={<ArrowRightOutlined />}
          disabled={disabled}
          onClick={onOpenDrawer}
        />
      </Tooltip>

      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.edge.exchange.list"
            defaultMessage="Exchange Relation List"
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
        footer={
          readonly ? (
            false
          ) : (
            <Space size={'middle'} className={styles.footer_right}>
              <Button onClick={() => setDrawerVisible(false)}>
                <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
              </Button>
              <Button
                onClick={() => {
                  onData({
                    ...edge,
                    data: {
                      ...edge.data,
                      exchange: dataSource,
                    },
                  });
                  setDrawerVisible(false);
                }}
                type="primary"
              >
                <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
              </Button>
            </Space>
          )
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <ProTable<EdgeExchangeTable, ListPagination>
          actionRef={actionRef}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          toolBarRender={() => {
            return readonly
              ? []
              : [
                  <ExchangeSelect
                    key={0}
                    id={''}
                    lang={lang}
                    buttonType={'icon'}
                    sourceProcessId={sourceNode?.data?.id}
                    targetProcessId={targetNode?.data?.id}
                    onData={onCreateData}
                    sourceRowKeys={[]}
                    targetRowKeys={[]}
                    optionType={'create'}
                  />,
                ];
          }}
          dataSource={genEdgeExchangeTableData(dataSource, lang)}
          columns={edgeExhangeColumns}
        />
      </Drawer>
    </>
  );
};

export default EdgeExhange;
