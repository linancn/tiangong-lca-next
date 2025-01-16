import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import LocationTextItemDescription from '@/components/LocationTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail, getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  ProductOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Collapse, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeView from './Exchange/view';
import {
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
  reviewTypeOptions,
} from './optiondata';

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  disabled: boolean;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
};

const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLCIMethodPrincipleOptions = (value: string) => {
  const option = LCIMethodPrincipleOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLCIMethodApproachOptions = (value: string) => {
  const option = LCIMethodApproachOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getReviewTypeOptions = (value: string) => {
  const option = reviewTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCopyrightOptions = (value: string) => {
  const option = copyrightOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLicenseTypeOptions = (value: string) => {
  const option = licenseTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const ProcessView: FC<Props> = ({ id, version, buttonType, lang, disabled }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const tabList = [
    {
      key: 'processInformation',
      tab: (
        <FormattedMessage
          id="pages.process.view.processInformation"
          defaultMessage="Process information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.process.view.modellingAndValidation"
          defaultMessage="Modelling and validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.process.view.administrativeInformation"
          defaultMessage="Administrative information"
        />
      ),
    },
    {
      key: 'exchanges',
      tab: <FormattedMessage id="pages.process.view.exchanges" defaultMessage="Exchanges" />,
    },
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
          id="processExchange.uncertaintyDistributionType"
          defaultMessage="Uncertainty distribution type"
        />
      ),
      dataIndex: 'uncertaintyDistributionType',
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
              // dataSource={'my'}
              buttonType={'icon'}
              lang={lang}
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
      },
    },
  ];

  const contentList: Record<string, React.ReactNode> = {
    processInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="pages.process.view.processInformation.id" defaultMessage="ID" />
            }
            labelStyle={{ width: '100px' }}
          >
            {initData.processInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.name"
              defaultMessage="Name"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            {
              <FormattedMessage
                id="pages.process.view.processInformation.baseName"
                defaultMessage="Base name"
              />
            }
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.dataSetInformation?.name?.baseName}
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.treatmentStandardsRoutes"
              defaultMessage="Treatment, standards, routes"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name?.treatmentStandardsRoutes ??
              '-'
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.mixAndLocationTypes"
              defaultMessage="Mix and Location Types"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name?.mixAndLocationTypes ?? '-'
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.functionalUnitFlowProperties"
              defaultMessage="Quantitative product or process properties"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties ?? '-'
            }
          />
        </Card>

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.process.view.processInformation.generalComment"
            defaultMessage="General comment on data set"
          />
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.dataSetInformation?.['common:generalComment']}
        />
        <br />
        <LevelTextItemDescription
          data={
            initData.processInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']?.['value']
          }
          lang={lang}
          categoryType={'Process'}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.referenceToExternalDocumentation"
              defaultMessage="Data set LCA report, background info"
            />
          }
          data={
            initData.processInformation?.dataSetInformation?.[
              'common:referenceToExternalDocumentation'
            ]
          }
          lang={lang}
        />
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
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.time"
              defaultMessage="Time representativeness"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.processInformation.referenceYear"
                  defaultMessage="Reference year"
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {initData.processInformation?.time?.['common:referenceYear'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.timeRepresentativenessDescription"
              defaultMessage="Time representativeness description"
            />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.time?.['common:timeRepresentativenessDescription']}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.locationOfOperationSupplyOrProduction"
              defaultMessage="Location"
            />
          }
        >
          <LocationTextItemDescription
            lang={lang}
            data={
              initData.processInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] ?? '-'
            }
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.location"
                defaultMessage="Location"
              />
            }
            labelStyle={{ width: '100px' }}
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.descriptionOfRestrictions"
              defaultMessage="Geographical representativeness description"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.technology"
              defaultMessage="Technological representativeness"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses"
              defaultMessage="Technology description including background system"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.technology?.technologyDescriptionAndIncludedProcesses
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.technologicalApplicability"
              defaultMessage="Technical purpose of product or process"
            />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.technology?.technologicalApplicability}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id="pages.process.view.processInformation.referenceToTechnologyFlowDiagrammOrPicture"
                defaultMessage="Flow diagramm(s) or picture(s)"
              />
            }
            data={
              initData.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture ??
              {}
            }
            lang={lang}
          />
        </Card>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.process.view.processInformation.modelDescription"
            defaultMessage="Model description"
          />
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.mathematicalRelations?.modelDescription}
        />
      </>
    ),
    modellingAndValidation: (
      <>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.lCIMethodAndAllocation"
              defaultMessage="LCI method and allocation"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.modellingAndValidation.typeOfDataSet"
                  defaultMessage="Type of data set"
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getProcesstypeOfDataSetOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.modellingAndValidation.lCIMethodPrinciple"
                  defaultMessage="LCI method principle"
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getLCIMethodPrincipleOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple"
              defaultMessage="Deviation from LCI method principle / explanations"
            />
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
              label={
                <FormattedMessage
                  id="pages.process.view.modellingAndValidation.lCIMethodApproaches"
                  defaultMessage="LCI method approaches"
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {getLCIMethodApproachOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromLCIMethodApproaches"
              defaultMessage="Deviations from LCI method approaches / explanations"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromLCIMethodApproaches
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromModellingConstants"
              defaultMessage="Deviation from modelling constants / explanations"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromModellingConstants
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness"
              defaultMessage="Data sources, treatment, and representativeness"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataCutOffAndCompletenessPrinciples"
              defaultMessage="Data cut-off and completeness principles"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples"
              defaultMessage="Deviation from data cut-off and completeness principles / explanations"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples"
              defaultMessage="Data selection and combination principles"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples"
              defaultMessage="Deviation from data selection and combination principles / explanations"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples"
              defaultMessage="Data treatment and extrapolations principles"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataTreatmentAndExtrapolationsPrinciples
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples"
              defaultMessage="Deviation from data treatment and extrapolations principles / explanations"
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromTreatmentAndExtrapolationPrinciples
            }
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.referenceToDataSource"
                defaultMessage="Data source(s) used for this data set"
              />
            }
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource ?? {}
            }
            lang={lang}
          />

          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.useAdviceForDataSet"
              defaultMessage="Use advice for data set"
            />
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
          <FormattedMessage
            id="pages.process.view.modellingAndValidation.completenessOtherProblemField"
            defaultMessage="Completeness other problem field(s)"
          />
        </Divider>
        <LangTextItemDescription
          data={initData.modellingAndValidation?.completeness?.completenessOtherProblemField}
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.Review"
              defaultMessage="Review"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.modellingAndValidation.type"
                  defaultMessage="Type of review"
                />
              }
              labelStyle={{ width: '100px' }}
            >
              {getReviewTypeOptions(
                initData.modellingAndValidation?.validation?.review?.['@type'] ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.reviewDetails"
              defaultMessage="Review details"
            />
          </Divider>
          <LangTextItemDescription
            data={initData.modellingAndValidation?.validation?.review?.['common:reviewDetails']}
          />
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.referenceToNameOfReviewerAndInstitution"
                defaultMessage="Reviewer name and institution"
              />
            }
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
          title={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.referenceToCommissioner"
              defaultMessage="Commissioner of data set"
            />
          }
          lang={lang}
          data={
            initData.administrativeInformation?.commissionerAndGoal?.[
              'common:referenceToCommissioner'
            ]
          }
        />
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.process.view.administrativeInformation.intendedApplications"
            defaultMessage="Intended applications"
          />
        </Divider>
        <LangTextItemDescription
          data={
            initData.administrativeInformation?.commissionerAndGoal?.['common:intendedApplications']
          }
        />
        <br />

        <ContactSelectDescription
          title={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.RreferenceToPersonOrEntityGeneratingTheDataSet"
              defaultMessage="Data set generator / modeller"
            />
          }
          lang={lang}
          data={
            initData.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]
          }
        />
        <br />

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.dataEntryBy"
              defaultMessage="Data entry by"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.timeStamp"
                  defaultMessage="Time stamp (last saved)"
                />
              }
              labelStyle={{ width: '150px' }}
            >
              {initData?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            title={
              <FormattedMessage
                id="pages.flow.process.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Data set format(s)"
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]
            }
            title={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.referenceToConvertedOriginalDataSetFrom"
                defaultMessage="Converted original data set from:"
              />
            }
            lang={lang}
          />
          <br />
          <ContactSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]
            }
            title={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.referenceToPersonOrEntityEnteringTheData"
                defaultMessage="Data entry by:"
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]
            }
            title={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.referenceToDataSetUseApproval"
                defaultMessage="Official approval of data set by producer/operator:"
              />
            }
            lang={lang}
          />
          <br />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication and ownership"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.dateOfLastRevision"
                  defaultMessage="Date of last revision"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dateOfLastRevision'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.dataSetVersion"
                  defaultMessage="Data set version"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.permanentDataSetURI"
                  defaultMessage="Permanent data set URI"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.workflowAndPublicationStatus"
                  defaultMessage="Workflow and publication status	"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:workflowAndPublicationStatus'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.referenceToOwnershipOfDataSet"
                defaultMessage="Owner of data set"
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.copyright"
                  defaultMessage="Copyright?"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getCopyrightOptions(
                initData.administrativeInformation?.publicationAndOwnership?.['common:copyright'] ??
                  '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.administrativeInformation.licenseType"
                  defaultMessage="License type"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getLicenseTypeOptions(
                initData.administrativeInformation?.publicationAndOwnership?.[
                  'common:licenseType'
                ] ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </>
    ),
    exchanges: (
      <>
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: 'Input',
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Input',
                      params,
                    );
                  }}
                  columns={processExchangeColumns}
                />
              ),
            },
          ]}
        />
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: 'Output',
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Output',
                      params,
                    );
                  }}
                  columns={processExchangeColumns}
                />
              ),
            },
          ]}
        />
      </>
    ),
  };

  const onView = () => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
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
      {buttonType === 'toolIcon' ? (
        <Tooltip
          title={
            <FormattedMessage
              id="pages.button.model.process"
              defaultMessage="Process infomation"
            ></FormattedMessage>
          }
          placement="left"
        >
          <Button
            type="primary"
            size="small"
            style={{ boxShadow: 'none' }}
            icon={<ProfileOutlined />}
            onClick={onView}
            disabled={disabled}
          />
        </Tooltip>
      ) : buttonType === 'toolResultIcon' ? (
        <Tooltip
          title={<FormattedMessage id="pages.button.model.result" defaultMessage="Model result" />}
          placement="left"
        >
          <Button
            disabled={id === ''}
            type="primary"
            icon={<ProductOutlined />}
            size="small"
            style={{ boxShadow: 'none' }}
            onClick={onView}
          />
        </Tooltip>
      ) : buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="pages.button.view" defaultMessage="View" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage id="pages.process.drawer.title.view" defaultMessage="View process" />
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
