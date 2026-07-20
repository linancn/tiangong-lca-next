import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import ProcessExchangeView from '@/pages/Processes/Components/Exchange/view';
// import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import AlignedNumber from '@/components/AlignedNumber';
import {
  ContentLanguageAwareTableParams,
  getContentLanguageAwareTableParams,
} from '@/services/general/data';
import { getLangText, getUnitData } from '@/services/general/util';
import { getProcessDetail, getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import { CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  node: any;
  lang: string;
  direction: string;
  drawerVisible: boolean;
  onDrawerVisible: (option: boolean) => void;
};

const IoPortSelector: FC<Props> = ({ node, lang, direction, drawerVisible, onDrawerVisible }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [exchangeDataSource, setExchangeDataSource] = useState<any[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const actionRefSelect = useRef<ActionType>();
  const detailRequestEpochRef = useRef(0);
  const detailRequestSnapshotRef = useRef<{
    processId: string;
    processVersion: string;
    direction: string;
  } | null>(null);
  const exchangeRequestEpochRef = useRef(0);
  const exchangeTableParams = useMemo(() => getContentLanguageAwareTableParams(lang), [lang]);
  const currentContentLanguageRef = useRef(exchangeTableParams.contentLanguage);
  currentContentLanguageRef.current = exchangeTableParams.contentLanguage;
  const processId = node?.data?.id ?? '';
  const processVersion = node?.data?.version ?? '';
  const processPortItems = node?.ports?.items;
  const currentDetailRequestSnapshot = detailRequestSnapshotRef.current;
  if (
    currentDetailRequestSnapshot === null ||
    currentDetailRequestSnapshot.processId !== processId ||
    currentDetailRequestSnapshot.processVersion !== processVersion ||
    currentDetailRequestSnapshot.direction !== direction
  ) {
    detailRequestSnapshotRef.current = { processId, processVersion, direction };
  }

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
      render: (_, row) => {
        return [<AlignedNumber key={0} value={row.meanAmount} />];
      },
    },
    {
      title: (
        <FormattedMessage id='processExchange.resultingAmount' defaultMessage='Resulting amount' />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<AlignedNumber key={0} value={row.resultingAmount} />];
      },
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
          // <ReferenceUnit
          //   key={0}
          //   id={row.referenceToFlowDataSetId}
          //   version={row.referenceToFlowDataSetVersion}
          //   idType={'flow'}
          //   lang={lang}
          // />,
          <span key={1}>
            {getLangText(row.refUnitRes?.name, lang)} (
            <Tooltip
              placement='topLeft'
              title={getLangText(row.refUnitRes?.refUnitGeneralComment, lang)}
            >
              {row.refUnitRes?.refUnitName}
            </Tooltip>
            )
          </span>,
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

  const onDrawerClose = () => {
    onDrawerVisible(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;

    const requestEpoch = detailRequestEpochRef.current + 1;
    const requestSnapshot = detailRequestSnapshotRef.current!;
    detailRequestEpochRef.current = requestEpoch;
    exchangeRequestEpochRef.current += 1;
    setDataLoading(true);
    setExchangeDataSource([]);
    setSelectedRowKeys(processPortItems?.map((item: any) => item?.id ?? []));

    void getProcessDetail(requestSnapshot.processId, requestSnapshot.processVersion).then(
      (result: any) => {
        if (
          detailRequestEpochRef.current !== requestEpoch ||
          detailRequestSnapshotRef.current !== requestSnapshot
        ) {
          return;
        }

        setExchangeDataSource([
          ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ??
            []),
        ]);
        actionRefSelect.current?.reload();
      },
    );

    return () => {
      if (detailRequestEpochRef.current === requestEpoch) {
        detailRequestEpochRef.current += 1;
      }
      exchangeRequestEpochRef.current += 1;
    };
  }, [direction, drawerVisible, processId, processPortItems, processVersion]);

  useEffect(() => {
    if (drawerVisible) {
      setDataLoading(true);
    }
  }, [drawerVisible, exchangeTableParams.contentLanguage]);

  return (
    <>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flow.model.drawer.title.edge.port.view'
            defaultMessage='View flow port'
          />
        }
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={onDrawerClose}
        footer={false}
      >
        <ProTable<ProcessExchangeTable, ContentLanguageAwareTableParams>
          actionRef={actionRefSelect}
          params={exchangeTableParams}
          loading={dataLoading}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async (params) => {
            const requestEpoch = exchangeRequestEpochRef.current + 1;
            exchangeRequestEpochRef.current = requestEpoch;
            const detailSnapshot = detailRequestSnapshotRef.current;
            const contentLanguage = params.contentLanguage ?? exchangeTableParams.contentLanguage;

            try {
              const res = await getProcessExchange(
                genProcessExchangeTableData(exchangeDataSource, contentLanguage),
                direction,
                params,
              );
              const unitRes = await getUnitData('flow', res?.data);

              if (
                exchangeRequestEpochRef.current !== requestEpoch ||
                detailRequestSnapshotRef.current !== detailSnapshot ||
                currentContentLanguageRef.current !== contentLanguage
              ) {
                return {
                  ...res,
                  data: [],
                  success: false,
                };
              }

              return {
                ...res,
                data: (unitRes ?? []) as ProcessExchangeTable[],
                success: true,
              };
            } finally {
              if (
                exchangeRequestEpochRef.current === requestEpoch &&
                detailRequestSnapshotRef.current === detailSnapshot &&
                currentContentLanguageRef.current === contentLanguage
              ) {
                setDataLoading(false);
              }
            }
          }}
          columns={processExchangeColumns}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowSelection={{
            alwaysShowAlert: false,
            selectedRowKeys: selectedRowKeys,
          }}
        />
      </Drawer>
    </>
  );
};

export default IoPortSelector;
