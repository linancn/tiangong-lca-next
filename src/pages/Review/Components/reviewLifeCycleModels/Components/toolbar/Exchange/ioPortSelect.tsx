import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import ProcessExchangeView from '@/pages/Processes/Components/Exchange/view';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail, getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined } from '@ant-design/icons';
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

const IoPortSelect: FC<Props> = ({
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
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='processExchange.referenceToFlowDataSet' defaultMessage='Flow' />,
      dataIndex: 'referenceToFlowDataSet',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.generalComment}>
          {row.referenceToFlowDataSet}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'referenceToFlowDataSetVersion',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='processExchange.meanAmount' defaultMessage='Mean amount' />,
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id='processExchange.resultingAmount' defaultMessage='Resulting amount' />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage
          id='pages.flowproperty.referenceToReferenceUnitGroup'
          defaultMessage='Reference unit'
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit
            key={0}
            id={row.referenceToFlowDataSetId}
            version={row.referenceToFlowDataSetVersion}
            idType={'flow'}
            lang={lang}
          />,
        ];
      },
    },

    {
      title: (
        <FormattedMessage
          id='processExchange.dataDerivationTypeStatus'
          defaultMessage='Data derivation type / status'
        />
      ),
      dataIndex: 'dataDerivationTypeStatus',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='processExchange.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <QuantitativeReferenceIcon
            tooltipTitle={row.functionalUnitOrOther}
            value={row.quantitativeReference}
          />
        );
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              // dataSource={'tg'}
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
    setSelectedRowKeys(node?.ports?.items?.map((item: any) => item?.id ?? []));
    getProcessDetail(node?.data?.id, node?.data?.version).then(async (result: any) => {
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
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flow.model.drawer.title.edge.port.select'
            defaultMessage='Select flow port'
          />
        }
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={onDrawerClose}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={onDrawerClose}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button
              onClick={() => {
                const selectedRowData = exchangeDataSource.filter((item) => {
                  const itemKey =
                    (item?.exchangeDirection ?? '-').toUpperCase() +
                    ':' +
                    (item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-');

                  return selectedRowKeys.includes(itemKey);
                });

                onData({ selectedRowData: selectedRowData });
                onDrawerClose();
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.submit' defaultMessage='Submit' />
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
            preserveSelectedRowKeys: true,
            selectedRowKeys: selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </Drawer>
    </>
  );
};

export default IoPortSelect;
