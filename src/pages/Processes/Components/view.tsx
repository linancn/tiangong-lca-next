import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeView from './Exchange/view';

type Props = {
  id: string;
  lang: string;
  dataSource: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessView: FC<Props> = ({ id, dataSource, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const actionRefExchangeTable = useRef<ActionType>();

  const tabList = [
    { key: 'processInformation', tab: 'Process Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'exchanges', tab: 'Exchanges' },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

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
          id="processExchange.exchangeDirection"
          defaultMessage="Exchange Direction"
        />
      ),
      dataIndex: 'exchangeDirection',
      sorter: true,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="processExchange.referenceToFlowDataSet"
          defaultMessage="Reference To Flow DataSet"
        />
      ),
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
      title: <FormattedMessage id="processExchange.meanAmount" defaultMessage="Mean Amount" />,
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="processExchange.resultingAmount" defaultMessage="Resulting Amount" />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="processExchange.dataDerivationTypeStatus"
          defaultMessage="Data Derivation Type Status"
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
          defaultMessage="Quantitative Reference"
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
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <ProcessExchangeView
                id={row.dataSetInternalID}
                data={exchangeDataSource}
                dataSource={'my'}
                buttonType={'icon'}
                lang={lang}
                actionRef={actionRefExchangeTable}
              />
              {/* <ProcessEdit
                id={row.id}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              />
              <ProcessDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              /> */}
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              dataSource={'tg'}
              buttonType={'icon'}
              actionRef={actionRefExchangeTable}
            />
          </Space>,
        ];
      },
    },
  ];

  const contentList: Record<string, React.ReactNode> = {
    processInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {initData.processInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          Base Name
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.dataSetInformation?.name?.baseName}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          General Comment
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.dataSetInformation?.['common:generalComment']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          Classification
        </Divider>
        <LevelTextItemDescription
          data={
            initData.processInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']
          }
        />
        <br />
        {/* <Card size="small" title={'Quantitative Reference'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
              {initData.processInformation?.quantitativeReference?.['@type'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Reference To Reference Flow"
              labelStyle={{ width: '220px' }}
            >
              {initData.processInformation?.quantitativeReference?.referenceToReferenceFlow ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Functional Unit Or Other
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.quantitativeReference?.functionalUnitOrOther}
          />
        </Card>
        <br /> */}
        <Card size="small" title={'Time'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Reference Year" labelStyle={{ width: '140px' }}>
              {initData.processInformation?.time?.['common:referenceYear'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Time Representativeness Description
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.time?.['common:timeRepresentativenessDescription']}
          />
        </Card>
        <br />
        <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Location" labelStyle={{ width: '100px' }}>
              {initData.processInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Description Of Restrictions
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card size="small" title={'Technology'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Technology Description And Included Processes
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.technology?.technologyDescriptionAndIncludedProcesses
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Technological Applicability
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.technology?.technologicalApplicability}
          />
          <br />
          <SourceSelectDescription
            title={'Reference To Technology Flow Diagramm Or Picture'}
            data={
              initData.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture ??
              {}
            }
            lang={lang}
          />
        </Card>
        <Divider orientationMargin="0" orientation="left" plain>
          Mathematical Relations: Model Description
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.mathematicalRelations?.modelDescription}
        />
      </>
    ),
    modellingAndValidation: (
      <>
        <Card size="small" title={'LCI Method And Allocation'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Type Of Data Set" labelStyle={{ width: '220px' }}>
              {initData.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="LCI Method Principle" labelStyle={{ width: '220px' }}>
              {initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Principle
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromLCIMethodPrinciple
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="LCI Method Approaches"
              labelStyle={{ width: '220px' }}
            >
              {initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Approaches
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromLCIMethodApproaches
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Modelling Constants
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromModellingConstants
            }
          />
        </Card>
        <br />
        <Card size="small" title={'Data Sources Treatment And Representativeness'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Cut Off And Completeness Principles
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Selection And Combination Principles
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Selection And Combination Principles
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Treatment And Extrapolations Principles
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataTreatmentAndExtrapolationsPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Treatment And Extrapolation Principles
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromTreatmentAndExtrapolationPrinciples
            }
          />
          <br />
          <SourceSelectDescription
            title={'Reference To Data Source'}
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource ?? {}
            }
            lang={lang}
          />

          <Divider orientationMargin="0" orientation="left" plain>
            Use Advice For DataSet
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.useAdviceForDataSet
            }
          />
        </Card>
        <br />
        <Divider orientationMargin="0" orientation="left" plain>
          Completeness Other Problem Field
        </Divider>
        <LangTextItemDescription
          data={initData.modellingAndValidation?.completeness?.completenessOtherProblemField}
        />
        <br />
        <Card size="small" title={'Validation: Review'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
              {initData.modellingAndValidation?.validation?.review?.['@type'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            Review Details
          </Divider>
          <LangTextItemDescription
            data={initData.modellingAndValidation?.validation?.review?.['common:reviewDetails']}
          />
          <br />
          <ContactSelectDescription
            title={'Reference To Name Of Reviewer And Institution'}
            lang={lang}
            data={
              initData.modellingAndValidation?.validation?.review?.[
                'common:referenceToNameOfReviewerAndInstitution'
              ]
            }
          />
        </Card>
      </>
    ),
    administrativeInformation: (
      <>
        <ContactSelectDescription
          title={'Data Generator: Rreference To Person Or Entity Generating The Data Set'}
          lang={lang}
          data={
            initData.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]
          }
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label="Data Entry By: Time Stamp"
            labelStyle={{ width: '220px' }}
          >
            {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Card size="small" title={'Publication And Ownership'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Date Of Last Revision"
              labelStyle={{ width: '180px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dateOfLastRevision'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '180px' }}>
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Permanent Data Set URI"
              labelStyle={{ width: '200px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            title={'Reference To Ownership Of Data Set'}
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Copyright" labelStyle={{ width: '180px' }}>
              {initData.administrativeInformation?.publicationAndOwnership?.['common:copyright'] ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="License Type" labelStyle={{ width: '180px' }}>
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:licenseType'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </>
    ),
    exchanges: (
      <ProTable<ProcessExchangeTable, ListPagination>
        actionRef={actionRefExchangeTable}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        columns={processExchangeColumns}
        dataSource={genProcessExchangeTableData(exchangeDataSource, lang)}
      />
    ),
  };

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      setInitData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}), id: id });
      setExchangeDataSource([
        ...(genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []),
      ]);
      // if (dataSource === 'my') {
      //   setFooterButtons(
      //     <>
      //       {/* <ContactDelete
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       />
      //       <ContactEdit
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       /> */}
      //     </>,
      //   );
      // } else {
      //   setFooterButtons(<></>);
      // }
      setSpinning(false);
    });
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
        <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.process.drawer.title.view" defaultMessage="View Process" />
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
        // footer={
        //   <Space size={'middle'} className={styles.footer_right}>
        //     {footerButtons}
        //   </Space>
        // }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessView;
