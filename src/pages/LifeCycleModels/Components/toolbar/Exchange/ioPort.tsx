import ProcessExchangeView from '@/pages/Processes/Components/Exchange/view';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail, getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  node: any;
  lang: string;
  direction: string;
  drawerVisible: boolean;
  onData: (data: any) => void;
  onDrawerVisible: (option: boolean) => void;
};

const IoPortSelector: FC<Props> = ({
  node,
  lang,
  direction,
  drawerVisible,
  onData,
  onDrawerVisible,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [exchangeDataSource, setExchangeDataSource] = useState<any[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const actionRefSelect = useRef<ActionType>();

  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    // {
    //   title: <FormattedMessage id="processExchange.dataSetInternalID" defaultMessage="DataSet Internal ID" />,
    //   dataIndex: 'dataSetInternalID',
    //   search: false,
    // },
    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.exchangeDirection"
          defaultMessage="Direction"
        />
      ),
      dataIndex: 'exchangeDirection',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="processExchange.referenceToFlowDataSet" defaultMessage="Flow" />,
      dataIndex: 'referenceToFlowDataSet',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.referenceToFlowDataSet}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="processExchange.meanAmount" defaultMessage="Mean amount" />,
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="processExchange.resultingAmount" defaultMessage="Resulting amount" />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference unit"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit key={0} id={row.referenceToFlowDataSetId} idType={'flow'} lang={lang} />,
        ];
      },
    },

    {
      title: (
        <FormattedMessage
          id="processExchange.dataDerivationTypeStatus"
          defaultMessage="Data derivation type / status"
        />
      ),
      dataIndex: 'dataDerivationTypeStatus',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="processExchange.quantitativeReference"
          defaultMessage="Quantitative reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return (
            <Tooltip title={row.functionalUnitOrOther}>
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            </Tooltip>
          );
        }
        return <CloseCircleOutlined />;
      },
    },
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
              dataSource={'tg'}
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onDrawerClose = () => {
    onDrawerVisible(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setDataLoading(true);
    setSelectedRowKeys(
      node?.ports?.items?.map((item: any) => item?.id?.replace(direction + ':', '')) ?? [],
    );
    getProcessDetail(node?.data?.id).then(async (result: any) => {
      setExchangeDataSource([
        ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []),
      ]);
      actionRefSelect.current?.reload();
      setDataLoading(false);
    });
  }, [drawerVisible]);

  return (
    <>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.edge.exchange.edit"
            defaultMessage="Edit exchange relation"
          />
        }
        width="90%"
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={onDrawerClose}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={onDrawerClose}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              onClick={() => {
                const selectedRowData = exchangeDataSource.filter((item) => {
                  const itemObjectId =
                    (item?.['@dataSetInternalID'] ?? '-') +
                    ':' +
                    (item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-');
                  const itemDirection = item?.exchangeDirection?.toUpperCase();
                  const filterDirection = direction?.toUpperCase();

                  return (
                    selectedRowKeys.includes(itemObjectId) && itemDirection === filterDirection
                  );
                });

                onData({ selectedRowData: selectedRowData });
                onDrawerClose();
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProTable<ProcessExchangeTable, ListPagination>
          actionRef={actionRefSelect}
          loading={dataLoading}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async (params: { pageSize: number; current: number }) => {
            return getProcessExchange(
              genProcessExchangeTableData(exchangeDataSource, lang),
              direction,
              params,
            );
          }}
          columns={processExchangeColumns}
          rowSelection={{
            alwaysShowAlert: true,
            selectedRowKeys: selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </Drawer>
    </>
  );
};

export default IoPortSelector;
