import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import SourceDescription from '@/components/ReferenceData/description';
import { ListPagination } from '@/services/general/data';
import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
// import ContactDelete from './delete';
// import ContactEdit from './edit';

type Props = {
  id: string;
  lang: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessView: FC<Props> = ({ id, dataSource, lang }) => {
  const [contentList, setContentList] = useState<Record<string, React.ReactNode>>({
    processInformation: <></>,
    modellingAndValidation: <></>,
    administrativeInformation: <></>,
    exchanges: <></>,
  });
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');

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
      title: <FormattedMessage id="processExchange.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
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
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
    },
  ];

  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );

    getProcessDetail(id).then(async (result: any) => {
      setContentList({
        processInformation: (
          <>
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
                {result.data.json?.processDataSet?.processInformation?.dataSetInformation?.[
                  'common:UUID'
                ] ?? '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientationMargin="0" orientation="left" plain>
              Base Name
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json?.processDataSet?.processInformation?.dataSetInformation?.name
                  ?.baseName
              }
            />

            <Divider orientationMargin="0" orientation="left" plain>
              General Comment
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json?.processDataSet?.processInformation?.dataSetInformation?.[
                  'common:generalComment'
                ]
              }
            />

            <Divider orientationMargin="0" orientation="left" plain>
              Classification
            </Divider>
            <LevelTextItemDescription
              data={
                result.data.json?.processDataSet?.processInformation?.dataSetInformation
                  ?.classificationInformation?.['common:classification']?.['common:class']
              }
            />
            <br />
            <Card size="small" title={'Quantitative Reference'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                  {result.data.json?.processDataSet?.processInformation?.quantitativeReference?.[
                    '@type'
                  ] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item
                  key={0}
                  label="Reference To Reference Flow"
                  labelStyle={{ width: '220px' }}
                >
                  {result.data.json?.processDataSet?.processInformation?.quantitativeReference
                    ?.referenceToReferenceFlow ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Functional Unit Or Other
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.processInformation?.quantitativeReference
                    ?.functionalUnitOrOther
                }
              />
            </Card>
            <br />
            <Card size="small" title={'Time'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Reference Year" labelStyle={{ width: '140px' }}>
                  {result.data.json?.processDataSet?.processInformation?.time?.[
                    'common:referenceYear'
                  ] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Time Representativeness Description
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.processInformation?.time?.[
                    'common:timeRepresentativenessDescription'
                  ]
                }
              />
            </Card>
            <br />
            <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Location" labelStyle={{ width: '100px' }}>
                  {result.data.json?.processDataSet?.processInformation?.geography
                    ?.locationOfOperationSupplyOrProduction?.['@location'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Description Of Restrictions
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.processInformation?.geography
                    ?.locationOfOperationSupplyOrProduction?.descriptionOfRestrictions
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
                  result.data.json?.processDataSet?.processInformation?.technology
                    ?.technologyDescriptionAndIncludedProcesses
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Technological Applicability
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.processInformation?.technology
                    ?.technologicalApplicability
                }
              />
              <br />
              <SourceDescription
                title={'Reference To Technology Flow Diagramm Or Picture'}
                data={
                  result.data.json?.processDataSet?.processInformation?.technology
                    ?.referenceToTechnologyFlowDiagrammOrPicture
                }
              />
            </Card>
            <Divider orientationMargin="0" orientation="left" plain>
              Mathematical Relations: Model Description
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json?.processDataSet?.processInformation?.mathematicalRelations
                  ?.modelDescription
              }
            />
          </>
        ),
        modellingAndValidation: (
          <>
            <Card size="small" title={'LCI Method And Allocation'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Type Of Data Set" labelStyle={{ width: '220px' }}>
                  {result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                    ?.typeOfDataSet ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item
                  key={0}
                  label="LCI Method Principle"
                  labelStyle={{ width: '220px' }}
                >
                  {result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                    ?.LCIMethodPrinciple ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From LCI Method Principle
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
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
                  {result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                    ?.LCIMethodApproaches ?? '-'}
                </Descriptions.Item>
              </Descriptions>

              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From LCI Method Approaches
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
                    ?.deviationsFromLCIMethodApproaches
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Modelling Constants
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation?.LCIMethodAndAllocation
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
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness
                    ?.deviationsFromCutOffAndCompletenessPrinciples
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Data Selection And Combination Principles
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness
                    ?.dataSelectionAndCombinationPrinciples
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Selection And Combination Principles
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness
                    ?.deviationsFromSelectionAndCombinationPrinciples
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Data Treatment And Extrapolations Principles
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness
                    ?.dataTreatmentAndExtrapolationsPrinciples
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Deviations From Treatment And Extrapolation Principles
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness
                    ?.deviationsFromTreatmentAndExtrapolationPrinciples
                }
              />
              <br />
              <SourceDescription
                title={'Reference To Data Source'}
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource
                }
              />

              <Divider orientationMargin="0" orientation="left" plain>
                Use Advice For DataSet
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation
                    ?.dataSourcesTreatmentAndRepresentativeness?.useAdviceForDataSet
                }
              />
            </Card>
            <br />
            <Divider orientationMargin="0" orientation="left" plain>
              Completeness Other Problem Field
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json?.processDataSet?.modellingAndValidation?.completeness
                  ?.completenessOtherProblemField
              }
            />
            <br />
            <Card size="small" title={'Validation: Review'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                  {result.data.json?.processDataSet?.modellingAndValidation?.validation?.review?.[
                    '@type'
                  ] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Divider orientationMargin="0" orientation="left" plain>
                Review Details
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json?.processDataSet?.modellingAndValidation?.validation?.review?.[
                    'common:reviewDetails'
                  ]
                }
              />
              <br />
              <SourceDescription
                title={'Reference To Name Of Reviewer And Institution'}
                data={
                  result.data.json?.processDataSet?.modellingAndValidation?.validation?.review?.[
                    'common:referenceToNameOfReviewerAndInstitution'
                  ]
                }
              />
            </Card>
          </>
        ),
        administrativeInformation: (
          <>
            <SourceDescription
              title={'Data Generator: Rreference To Person Or Entity Generating The Data Set'}
              data={
                result.data.json?.processDataSet?.administrativeInformation?.dataGenerator?.[
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
                {result.data.json?.processDataSet?.administrativeInformation?.dataEntryBy?.[
                  'common:timeStamp'
                ] ?? '-'}
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
                  {result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:dateOfLastRevision'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '180px' }}>
                  {result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:dataSetVersion'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item
                  key={0}
                  label="Permanent Data Set URI"
                  labelStyle={{ width: '180px' }}
                >
                  {result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:permanentDataSetURI'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <SourceDescription
                title={'Reference To Ownership Of Data Set'}
                data={
                  result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']
                }
              />
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Copyright" labelStyle={{ width: '180px' }}>
                  {result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:copyright'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="License Type" labelStyle={{ width: '180px' }}>
                  {result.data.json?.processDataSet?.administrativeInformation
                    ?.publicationAndOwnership?.['common:licenseType'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        ),
        exchanges: (
          <ProTable<ProcessExchangeTable, ListPagination>
            // actionRef={actionRef}
            search={{
              defaultCollapsed: false,
            }}
            pagination={{
              showSizeChanger: false,
              pageSize: 10,
            }}
            columns={processExchangeColumns}
            dataSource={result.data.json?.processDataSet?.exchanges?.exchange?.map(
              (item: any, index: number) => {
                console.log('item', item);
                return {
                  index: index + 1,
                  id: item['@dataSetInternalID'] ?? '-',
                  exchangeDirection: item.exchangeDirection ?? '-',
                  referenceToFlowDataSet: getLangText(
                    item.referenceToFlowDataSet?.['common:shortDescription'],
                    lang,
                  ),
                  meanAmount: item.meanAmount ?? '-',
                  resultingAmount: item.resultingAmount ?? '-',
                  dataDerivationTypeStatus: item.dataDerivationTypeStatus ?? '-',
                  generalComment: getLangText(item.generalComment, lang),
                };
              },
            )}
          />
        ),
      });
    });
    if (dataSource === 'my') {
      setFooterButtons(
        <>
          {/* <ContactDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            <ContactEdit
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            /> */}
        </>,
      );
    } else {
      setFooterButtons(<></>);
    }
  };

  useEffect(() => {
    setViewDescriptions(
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {contentList[activeTabKey]}
      </Card>,
    );
  }, [contentList, activeTabKey]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.view" defaultMessage="View" />}>
        <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.view" defaultMessage="Process View" />}
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
          <Space size={'middle'} className={styles.footer_right}>
            {footerButtons}
          </Space>
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {viewDescriptions}
      </Drawer>
    </>
  );
};

export default ProcessView;
