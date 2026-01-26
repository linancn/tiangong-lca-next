import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import LocationTextItemForm from '@/components/LocationTextItem/form';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
// import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import AlignedNumber from '@/components/AlignedNumber';
import RequiredMark from '@/components/RequiredMark';
import ToolBarButton from '@/components/ToolBarButton';
import { useRefCheckContext } from '@/contexts/refCheckContext';
import { getRules } from '@/pages/Utils';
import { getFlowStateCodeByIdsAndVersions } from '@/services/flows/api';
import { ListPagination } from '@/services/general/data';
import { getLangText, getUnitData, jsonToList } from '@/services/general/util';
import { LCIAResultTable } from '@/services/lciaMethods/data';
import LCIAResultCalculation from '@/services/lciaMethods/util';
import { getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData } from '@/services/processes/util';
import { CalculatorOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProFormInstance, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  theme,
  Tooltip,
} from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../processes_schema.json';
import ComplianceItemForm from './Compliance/form';
import { getExchangeColumns } from './Exchange/column';
import ProcessExchangeCreate from './Exchange/create';
import ProcessExchangeDelete from './Exchange/delete';
import ProcessExchangeEdit from './Exchange/edit';
import ProcessExchangeView from './Exchange/view';
import {
  completenessElementaryFlowsTypeOptions,
  completenessElementaryFlowsValueOptions,
  completenessProductModelOptions,
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
  uncertaintyDistributionTypeOptions,
  workflowAndPublicationStatusOptions,
} from './optiondata';
import ReveiwItemForm from './Review/form';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onExchangeData: (data: any) => void;
  onExchangeDataCreate: (data: any) => void;
  onTabChange: (key: string) => void;
  onLciaResults: (result: LCIAResultTable[]) => void;
  exchangeDataSource: ProcessExchangeTable[];
  lciaResults: LCIAResultTable[];
  formType?: string;
  showRules?: boolean;
  actionFrom?: 'modelResult';
};

export const ProcessForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onExchangeData,
  onExchangeDataCreate,
  onTabChange,
  onLciaResults,
  exchangeDataSource,
  formType,
  showRules = false,
  lciaResults,
  actionFrom,
}) => {
  const refCheckContext = useRefCheckContext();
  const actionRefExchangeTableInput = useRef<ActionType>();
  const actionRefExchangeTableOutput = useRef<ActionType>();
  const actionRefLciaResultTable = useRef<ActionType>();
  const [baseNameError, setBaseNameError] = useState(false);
  const [treatmentStandardsRoutesError, setTreatmentStandardsRoutesError] = useState(false);
  const [mixAndLocationTypesError, setMixAndLocationTypesError] = useState(false);
  const [
    technologyDescriptionAndIncludedProcessesError,
    setTechnologyDescriptionAndIncludedProcessesError,
  ] = useState(false);
  const [dataCutOffAndCompletenessPrinciplesError, setDataCutOffAndCompletenessPrinciplesError] =
    useState(false);
  const [intendedApplicationsError, setIntendedApplicationsError] = useState(false);
  const [generalCommentError, setGeneralCommentError] = useState(false);

  // const [lciaResultDataSource, setLciaResultDataSource] = useState<LCIAResultTable[]>(lciaResults);
  const [lciaResultDataSourceLoading, setLciaResultDataSourceLoading] = useState(false);

  const { token } = theme.useToken();

  const tabList = [
    {
      key: 'processInformation',
      tab: (
        <FormattedMessage
          id='pages.process.view.processInformation'
          defaultMessage='Process information'
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id='pages.process.view.modellingAndValidation'
          defaultMessage='Modelling and validation'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.process.view.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
    {
      key: 'exchanges',
      tab: <FormattedMessage id='pages.process.view.exchanges' defaultMessage='Exchanges' />,
    },
    {
      key: 'lciaResults',
      tab: <FormattedMessage id='pages.process.view.lciaresults' defaultMessage='LCIA Results' />,
    },
    {
      key: 'validation',
      tab: <FormattedMessage id='pages.process.validation' defaultMessage='Validation' />,
    },
    {
      key: 'complianceDeclarations',
      tab: (
        <FormattedMessage
          id='pages.process.complianceDeclarations'
          defaultMessage='Compliance declarations'
        />
      ),
    },
  ];
  const baseProcessExchangeColumns = getExchangeColumns(lang);
  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    ...baseProcessExchangeColumns,
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
              buttonType={'icon'}
            />
            <ProcessExchangeEdit
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              buttonType={'icon'}
              onData={onExchangeData}
              setViewDrawerVisible={() => {}}
              showRules={showRules}
              disabled={actionFrom === 'modelResult'}
            />
            <ProcessExchangeDelete
              disabled={actionFrom === 'modelResult'}
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              setViewDrawerVisible={() => {}}
              onData={onExchangeData}
            />
          </Space>,
        ];
      },
    },
  ];
  const lciaResultColumns: ProColumns<LCIAResultTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      width: 70,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.shortDescription'
          defaultMessage='LCIA'
        />
      ),
      dataIndex: 'Name',
      search: false,
      width: 500,
      render: (_, row) => {
        return [
          <span key={0}>
            {getLangText(row?.referenceToLCIAMethodDataSet?.['common:shortDescription'], lang)}
          </span>,
        ];
      },
    },

    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.meanAmount'
          defaultMessage='Mean amount'
        />
      ),
      dataIndex: 'meanAmount',
      search: false,
      render: (_, row) => {
        return [<AlignedNumber key={0} value={row.meanAmount} />];
      },
    },
    {
      title: <FormattedMessage id='pages.process.view.lciaresults.unit' defaultMessage='Unit' />,
      dataIndex: 'referenceQuantity',
      search: false,
      render: (_, row) => {
        return [<span key={0}>{getLangText(row.unit, lang) || '-'}</span>];
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.referenceToLCIAMethodDataSetVersion'
          defaultMessage='Version'
        />
      ),
      dataIndex: 'Version',
      search: false,
      render: (_, row) => {
        const version = row.referenceToLCIAMethodDataSet?.['@version'] ?? '-';
        return [
          <Tooltip key={0} placement='topLeft' title={version}>
            {version}
          </Tooltip>,
        ];
      },
    },
  ];
  const getLCIAResult = async () => {
    setLciaResultDataSourceLoading(true);
    const lciaResults = await LCIAResultCalculation(exchangeDataSource);
    onLciaResults(lciaResults ?? []);
    setLciaResultDataSourceLoading(false);
  };
  const tabContent: { [key: string]: JSX.Element } = {
    processInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        {/* <Card size="small" title={'Data Set Information'}> */}
        <Card
          size='small'
          title={
            <FormattedMessage id='pages.lifeCycleModel.information.name' defaultMessage='Name' />
          }
        >
          <Card
            size='small'
            title={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.process.view.processInformation.baseName'
                    defaultMessage='Base name'
                  />
                }
                showError={baseNameError}
              />
            }
          >
            <LangTextItemForm
              name={['processInformation', 'dataSetInformation', 'name', 'baseName']}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.baseName'
                  defaultMessage='Base name'
                />
              }
              setRuleErrorState={setBaseNameError}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['processInformation']['dataSetInformation']['name'][
                        'baseName'
                      ]['rules'],
                    )
                  : []
              }
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.process.view.processInformation.treatmentStandardsRoutes'
                    defaultMessage='Treatment, standards, routes'
                  />
                }
                showError={treatmentStandardsRoutesError}
              />
            }
          >
            <LangTextItemForm
              name={[
                'processInformation',
                'dataSetInformation',
                'name',
                'treatmentStandardsRoutes',
              ]}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.treatmentStandardsRoutes'
                  defaultMessage='Treatment, standards, routes'
                />
              }
              setRuleErrorState={setTreatmentStandardsRoutesError}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['processInformation']['dataSetInformation']['name'][
                        'treatmentStandardsRoutes'
                      ]['rules'],
                    )
                  : []
              }
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.process.view.processInformation.mixAndLocationTypes'
                    defaultMessage='Mix and location types'
                  />
                }
                showError={mixAndLocationTypesError}
              />
            }
          >
            <LangTextItemForm
              name={['processInformation', 'dataSetInformation', 'name', 'mixAndLocationTypes']}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.mixAndLocationTypes'
                  defaultMessage='Mix and location types'
                />
              }
              setRuleErrorState={setMixAndLocationTypesError}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['processInformation']['dataSetInformation']['name'][
                        'mixAndLocationTypes'
                      ]['rules'],
                    )
                  : []
              }
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.functionalUnitFlowProperties'
                defaultMessage='Quantitative product or process properties'
              />
            }
          >
            <LangTextItemForm
              name={[
                'processInformation',
                'dataSetInformation',
                'name',
                'functionalUnitFlowProperties',
              ]}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.functionalUnitFlowProperties'
                  defaultMessage='Quantitative product or process properties'
                />
              }
            />
          </Card>
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id='pages.process.view.processInformation.identifierOfSubDataSet'
              defaultMessage='Identifier of sub-data set'
            />
          }
          name={['processInformation', 'dataSetInformation', 'identifierOfSubDataSet']}
        >
          <Input />
        </Form.Item>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.synonyms'
              defaultMessage='Synonyms'
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'dataSetInformation', 'common:synonyms']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.synonyms'
                defaultMessage='Synonyms'
              />
            }
          />
        </Card>
        <br />
        <LevelTextItemForm
          name={[
            'processInformation',
            'dataSetInformation',
            'classificationInformation',
            'common:classification',
            'common:class',
          ]}
          formRef={formRef}
          lang={lang}
          dataType={'Process'}
          onData={onData}
          showRules={showRules}
          rules={
            showRules
              ? getRules(
                  schema['processDataSet']['processInformation']['dataSetInformation'][
                    'classificationInformation'
                  ]['common:classification']['common:class'][0]['@classId']['rules'],
                )
              : []
          }
        />

        <Card
          size='small'
          title={
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.generalComment'
                  defaultMessage='General comment on data set'
                />
              }
              showError={generalCommentError}
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.generalComment'
                defaultMessage='General comment on data set'
              />
            }
            setRuleErrorState={setGeneralCommentError}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['processInformation']['dataSetInformation'][
                      'common:generalComment'
                    ]['rules'],
                  )
                : []
            }
          />
        </Card>

        <SourceSelectForm
          name={['processInformation', 'dataSetInformation', 'referenceToExternalDocumentation']}
          label={
            <FormattedMessage
              id='pages.process.view.processInformation.referenceToExternalDocumentation'
              defaultMessage='Data set LCA report, background info'
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.time'
              defaultMessage='Time representativeness'
            />
          }
        >
          <Form.Item
            required={false}
            label={
              <RequiredMark
                showError={false}
                label={
                  <FormattedMessage
                    id='pages.process.view.processInformation.referenceYear'
                    defaultMessage='Reference year'
                  />
                }
              />
            }
            name={['processInformation', 'time', 'common:referenceYear']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['processInformation']['time']['common:referenceYear'][
                      'rules'
                    ],
                  )
                : []
            }
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.dataSetValidUntil'
                defaultMessage='Data set valid until:'
              />
            }
            name={['processInformation', 'time', 'common:dataSetValidUntil']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['processInformation']['time'][
                      'common:dataSetValidUntil'
                    ]['rules'],
                  )
                : []
            }
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.timeRepresentativenessDescription'
              defaultMessage='Time representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'time', 'common:timeRepresentativenessDescription']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.timeRepresentativenessDescription'
                defaultMessage='Time representativeness description'
              />
            }
          />
        </Card>

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.locationOfOperationSupplyOrProduction'
              defaultMessage='Location'
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.location'
                defaultMessage='Location'
              />
            }
            name={[
              'processInformation',
              'geography',
              'locationOfOperationSupplyOrProduction',
              '@location',
            ]}
            lang={lang}
            onData={onData}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['processInformation']['geography'][
                      'locationOfOperationSupplyOrProduction'
                    ]['@location']['rules'],
                  )
                : []
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'processInformation',
              'geography',
              'locationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.descriptionOfRestrictions'
                defaultMessage='Geographical representativeness description'
              />
            }
          />
        </Card>

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.subLocationOfOperationSupplyOrProduction'
              defaultMessage='Sub-location(s)'
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.location'
                defaultMessage='Sub-location(s)'
              />
            }
            name={[
              'processInformation',
              'geography',
              'subLocationOfOperationSupplyOrProduction',
              '@subLocation',
            ]}
            lang={lang}
            onData={onData}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'processInformation',
              'geography',
              'subLocationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.descriptionOfRestrictions'
                defaultMessage='Geographical representativeness description'
              />
            }
          />
        </Card>

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.technology'
              defaultMessage='Technological representativeness'
            />
          }
        >
          <Divider className='required-divider' orientationMargin='0' orientation='left' plain>
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses'
                  defaultMessage='Technology description including background system'
                />
              }
              showError={technologyDescriptionAndIncludedProcessesError}
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'technology', 'technologyDescriptionAndIncludedProcesses']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses'
                defaultMessage='Technology description including background system'
              />
            }
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['processInformation']['technology'][
                      'technologyDescriptionAndIncludedProcesses'
                    ]['rules'],
                  )
                : []
            }
            setRuleErrorState={setTechnologyDescriptionAndIncludedProcessesError}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.technologicalApplicability'
              defaultMessage='Technical purpose of product or process'
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'technology', 'technologicalApplicability']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.technologicalApplicability'
                defaultMessage='Technical purpose of product or process'
              />
            }
          />
          <SourceSelectForm
            name={['processInformation', 'technology', 'referenceToTechnologyPictogramme']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.referenceToTechnologyPictogramme'
                defaultMessage='Pictogramme of technology'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <SourceSelectForm
            name={[
              'processInformation',
              'technology',
              'referenceToTechnologyFlowDiagrammOrPicture',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.referenceToTechnologyFlowDiagrammOrPicture'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.modelDescription'
              defaultMessage='Model description'
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'mathematicalRelations', 'modelDescription']}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.modelDescription'
                defaultMessage='Model description'
              />
            }
          />
        </Card>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.variableParameter'
              defaultMessage='Variable / parameter'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.name'
                defaultMessage='Name of variable'
              />
            }
            name={['processInformation', 'mathematicalRelations', 'variableParameter', '@name']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.formula'
                defaultMessage='Formula'
              />
            }
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'formula']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.meanValue'
                defaultMessage='Mean value'
              />
            }
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'meanValue']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.minimumValue'
                defaultMessage='Minimum value'
              />
            }
            name={[
              'processInformation',
              'mathematicalRelations',
              'variableParameter',
              'minimumValue',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.maximumValue'
                defaultMessage='Maximum value'
              />
            }
            name={[
              'processInformation',
              'mathematicalRelations',
              'variableParameter',
              'maximumValue',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.uncertaintyDistributionType'
                defaultMessage='Uncertainty distribution type'
              />
            }
            name={[
              'processInformation',
              'mathematicalRelations',
              'variableParameter',
              'uncertaintyDistributionType',
            ]}
          >
            <Select options={uncertaintyDistributionTypeOptions} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.relativeStandardDeviation95In'
                defaultMessage='Relative StdDev in %'
              />
            }
            name={[
              'processInformation',
              'mathematicalRelations',
              'variableParameter',
              'relativeStandardDeviation95In',
            ]}
          >
            <Input />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.comment'
                defaultMessage='Comment, units, defaults'
              />
            }
          >
            <LangTextItemForm
              name={['processInformation', 'mathematicalRelations', 'variableParameter', 'comment']}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.comment'
                  defaultMessage='Comment, units, defaults'
                />
              }
            />
          </Card>
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.lCIMethodAndAllocation'
              defaultMessage='LCI method and allocation'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.typeOfDataSet'
                defaultMessage='Type of data set'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['modellingAndValidation']['LCIMethodAndAllocation'][
                      'typeOfDataSet'
                    ]['rules'],
                  )
                : []
            }
          >
            <Select options={processtypeOfDataSetOptions} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.lCIMethodPrinciple'
                defaultMessage='LCI method principle'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodPrinciple']}
          >
            <Select options={LCIMethodPrincipleOptions} />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple'
              defaultMessage='Deviation from LCI method principle / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromLCIMethodPrinciple',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple'
                defaultMessage='Deviation from LCI method principle / explanations'
              />
            }
          />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.lCIMethodApproaches'
                defaultMessage='LCI method approaches'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodApproaches']}
          >
            <Select options={LCIMethodApproachOptions} />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodApproaches'
              defaultMessage='Deviations from LCI method approaches / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromLCIMethodApproaches',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodApproaches'
                defaultMessage='Deviations from LCI method approaches / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.modellingConstants'
              defaultMessage='Modelling constants'
            />
          </Divider>
          <LangTextItemForm
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'modellingConstants']}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.modellingConstants'
                defaultMessage='Modelling constants'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromModellingConstants'
              defaultMessage='Deviation from modelling constants / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromModellingConstants',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromModellingConstants'
                defaultMessage='Deviation from modelling constants / explanations'
              />
            }
          />
          <SourceSelectForm
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'referenceToLCAMethodDetails',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToLCAMethodDetails'
                defaultMessage='LCA methodology report'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness'
              defaultMessage='Data sources, treatment, and representativeness'
            />
          }
        >
          <Divider className='required-divider' orientationMargin='0' orientation='left' plain>
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
                  defaultMessage='Data cut-off and completeness principles'
                />
              }
              showError={dataCutOffAndCompletenessPrinciplesError}
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataCutOffAndCompletenessPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
                defaultMessage='Data cut-off and completeness principles'
              />
            }
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['modellingAndValidation'][
                      'dataSourcesTreatmentAndRepresentativeness'
                    ]['dataCutOffAndCompletenessPrinciples']['rules'],
                  )
                : []
            }
            setRuleErrorState={setDataCutOffAndCompletenessPrinciplesError}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
              defaultMessage='Deviation from data cut-off and completeness principles / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromCutOffAndCompletenessPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
                defaultMessage='Deviation from data cut-off and completeness principles / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples'
              defaultMessage='Data selection and combination principles'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataSelectionAndCombinationPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples'
                defaultMessage='Data selection and combination principles'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
              defaultMessage='Deviation from data selection and combination principles / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromSelectionAndCombinationPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
                defaultMessage='Deviation from data selection and combination principles / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
              defaultMessage='Data treatment and extrapolations principles'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataTreatmentAndExtrapolationsPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
                defaultMessage='Data treatment and extrapolations principles'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
              defaultMessage='Deviation from data treatment and extrapolations principles / explanations'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromTreatmentAndExtrapolationPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
                defaultMessage='Deviation from data treatment and extrapolations principles / explanations'
              />
            }
          />
          <SourceSelectForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'referenceToDataHandlingPrinciples',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToDataHandlingPrinciples'
                defaultMessage='Data handling report'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <Form.List
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'referenceToDataSource',
            ]}
            initialValue={[{}]}
            rules={
              showRules
                ? [
                    {
                      validator: async (_, value) => {
                        if (!value || value.length < 1) {
                          throw new Error();
                        }
                      },
                    },
                  ]
                : []
            }
          >
            {(fields, { add, remove }) => (
              <Space direction='vertical' style={{ width: '100%' }}>
                {fields.map((field) => (
                  <div key={field.key} style={{ position: 'relative', marginBottom: 16 }}>
                    <SourceSelectForm
                      parentName={[
                        'modellingAndValidation',
                        'dataSourcesTreatmentAndRepresentativeness',
                        'referenceToDataSource',
                      ]}
                      name={[field.name]}
                      label={
                        <FormattedMessage
                          id='pages.process.view.modellingAndValidation.referenceToDataSource'
                          defaultMessage='Data source(s) used for this data set'
                        />
                      }
                      lang={lang}
                      formRef={formRef}
                      onData={onData}
                      rules={
                        showRules
                          ? getRules(
                              schema['processDataSet']['modellingAndValidation'][
                                'dataSourcesTreatmentAndRepresentativeness'
                              ]['referenceToDataSource']['@refObjectId']['rules'],
                            )
                          : []
                      }
                    />
                    {fields.length > 1 && (
                      <Button
                        type='text'
                        shape='circle'
                        icon={<CloseOutlined />}
                        onClick={() => {
                          remove(field.name);
                          onData();
                        }}
                        style={{ position: 'absolute', right: 8, top: 8 }}
                      />
                    )}
                  </div>
                ))}
                <Form.Item colon={false} style={{ margin: '8px 0 24px 0' }}>
                  <Button
                    type='dashed'
                    block
                    onClick={() => {
                      add({});
                      onData();
                    }}
                    style={{ width: '100%' }}
                  >
                    + <FormattedMessage id='pages.button.add' defaultMessage='Add' />{' '}
                    <FormattedMessage
                      id='pages.process.view.modellingAndValidation.referenceToDataSource'
                      defaultMessage='Data source(s) used for this data set'
                    />{' '}
                    <FormattedMessage id='pages.button.item.label' defaultMessage='Item' />
                  </Button>
                </Form.Item>
              </Space>
            )}
          </Form.List>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.percentageSupplyOrProductionCovered'
                defaultMessage='Percentage supply or production covered'
              />
            }
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'percentageSupplyOrProductionCovered',
            ]}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.annualSupplyOrProductionVolume'
              defaultMessage='Annual supply or production volume'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'annualSupplyOrProductionVolume',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.annualSupplyOrProductionVolume'
                defaultMessage='Annual supply or production volume'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.samplingProcedure'
              defaultMessage='Sampling procedure'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'samplingProcedure',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.samplingProcedure'
                defaultMessage='Sampling procedure'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataCollectionPeriod'
              defaultMessage='Data collection period'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataCollectionPeriod',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.dataCollectionPeriod'
                defaultMessage='Data collection period'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.uncertaintyAdjustments'
              defaultMessage='Uncertainty adjustments'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'uncertaintyAdjustments',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.uncertaintyAdjustments'
                defaultMessage='Uncertainty adjustments'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.useAdviceForDataSet'
              defaultMessage='Use advice for data set'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'useAdviceForDataSet',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.useAdviceForDataSet'
                defaultMessage='Use advice for data set'
              />
            }
          />
        </Card>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.completeness'
              defaultMessage='Completeness'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.completeness.completenessProductModel'
                defaultMessage='Completeness product model'
              />
            }
            name={['modellingAndValidation', 'completeness', 'completenessProductModel']}
          >
            <Select options={completenessProductModelOptions} />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows'
                defaultMessage='Completeness elementary flows, per topic'
              />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows.type'
                  defaultMessage='completeness type'
                />
              }
              name={[
                'modellingAndValidation',
                'completeness',
                'completenessElementaryFlows',
                '@type',
              ]}
            >
              <Select options={completenessElementaryFlowsTypeOptions} />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows.value'
                  defaultMessage='value'
                />
              }
              name={[
                'modellingAndValidation',
                'completeness',
                'completenessElementaryFlows',
                '@value',
              ]}
            >
              <Select options={completenessElementaryFlowsValueOptions} />
            </Form.Item>
          </Card>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.completeness.completenessOtherProblemField'
              defaultMessage='Completeness other problem field(s)'
            />
          </Divider>
          <LangTextItemForm
            name={['modellingAndValidation', 'completeness', 'completenessOtherProblemField']}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.completeness.completenessOtherProblemField'
                defaultMessage='Completeness other problem field(s)'
              />
            }
          />
        </Card>

        {/* <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.modellingAndValidation.completeness'
            defaultMessage='Completeness'
          />
        </Divider>
        <LangTextItemForm
          name={['modellingAndValidation', 'completeness']}
          label={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.completeness'
              defaultMessage='Completeness'
            />
          }
        /> */}
      </Space>
    ),
    administrativeInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <ContactSelectForm
          name={[
            'administrativeInformation',
            'common:commissionerAndGoal',
            'common:referenceToCommissioner',
          ]}
          label={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.referenceToCommissioner'
              defaultMessage='Commissioner of data set'
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
          rules={
            showRules
              ? getRules(
                  schema['processDataSet']['administrativeInformation'][
                    'common:commissionerAndGoal'
                  ]['common:referenceToCommissioner']['@refObjectId']['rules'],
                )
              : []
          }
        />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.project'
              defaultMessage='Project'
            />
          }
        >
          <LangTextItemForm
            name={['administrativeInformation', 'common:commissionerAndGoal', 'common:project']}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.project'
                defaultMessage='Project'
              />
            }
          />
        </Card>
        <Card
          size='small'
          title={
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.intendedApplications'
                  defaultMessage='Intended applications'
                />
              }
              showError={intendedApplicationsError}
            />
          }
        >
          <LangTextItemForm
            name={[
              'administrativeInformation',
              'common:commissionerAndGoal',
              'common:intendedApplications',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.intendedApplications'
                defaultMessage='Intended applications'
              />
            }
            setRuleErrorState={setIntendedApplicationsError}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation'][
                      'common:commissionerAndGoal'
                    ]['common:intendedApplications']['rules'],
                  )
                : []
            }
          />
        </Card>

        <ContactSelectForm
          name={[
            'administrativeInformation',
            'dataGenerator',
            'common:referenceToPersonOrEntityGeneratingTheDataSet',
          ]}
          label={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.RreferenceToPersonOrEntityGeneratingTheDataSet'
              defaultMessage='Data set generator / modeller'
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.timeStamp'
                defaultMessage='Time stamp (last saved)'
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:timeStamp'
                    ]['rules'],
                  )
                : []
            }
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
            defaultSourceName={formType === 'create' ? 'ILCD format' : ''}
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            onData={onData}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:referenceToDataSetFormat'
                    ]['@refObjectId']['rules'],
                  )
                : []
            }
          />
          <br />
          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToConvertedOriginalDataSetFrom'
                defaultMessage='Converted original data set from:'
              />
            }
            name={[
              'administrativeInformation',
              'dataEntryBy',
              'common:referenceToConvertedOriginalDataSetFrom',
            ]}
            onData={onData}
          />
          <br />
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToPersonOrEntityEnteringTheData'
                defaultMessage='Reference to Person or Entity Entering The Data'
              />
            }
            name={[
              'administrativeInformation',
              'dataEntryBy',
              'common:referenceToPersonOrEntityEnteringTheData',
            ]}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:referenceToPersonOrEntityEnteringTheData'
                    ]['@refObjectId']['rules'],
                  )
                : []
            }
            onData={onData}
          />
          <br />
          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToDataSetUseApproval'
                defaultMessage='Official approval of data set by producer/operator:'
              />
            }
            name={[
              'administrativeInformation',
              'dataEntryBy',
              'common:referenceToDataSetUseApproval',
            ]}
            onData={onData}
          />
        </Card>
        <br />

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.dateOfLastRevision'
                defaultMessage='Date of last revision'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:dateOfLastRevision',
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.dataSetVersion'
                defaultMessage='Data set version'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
            rules={getRules(
              schema['processDataSet']['administrativeInformation']['publicationAndOwnership'][
                'common:dataSetVersion'
              ]['rules'],
            )}
          >
            <Input disabled={actionFrom === 'modelResult'} />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.permanentDataSetURI'
                defaultMessage='Permanent data set URI'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:permanentDataSetURI']['rules'],
                  )
                : []
            }
          >
            <Input disabled={true} />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.workflowAndPublicationStatus'
                defaultMessage='Workflow and publication status	'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:workflowAndPublicationStatus',
            ]}
          >
            <Select options={workflowAndPublicationStatusOptions} />
          </Form.Item>

          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToUnchangedRepublication'
                defaultMessage='Unchanged re-publication of:'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToUnchangedRepublication',
            ]}
            onData={onData}
          />
          <br />
          <ContactSelectForm
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToRegistrationAuthority',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToRegistrationAuthority'
                defaultMessage='Registration authority'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.registrationNumber'
                defaultMessage='Registration number'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:registrationNumber',
            ]}
          >
            <Input />
          </Form.Item>

          <ContactSelectForm
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:referenceToOwnershipOfDataSet']['@refObjectId']['rules'],
                  )
                : []
            }
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.copyright'
                defaultMessage='Copyright?'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:copyright']['rules'],
                  )
                : []
            }
          >
            <Select options={copyrightOptions} />
          </Form.Item>
          <ContactSelectForm
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToEntitiesWithExclusiveAccess',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToEntitiesWithExclusiveAccess'
                defaultMessage='Entities or persons with exclusive access to this data set'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.licenseType'
                defaultMessage='License type'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
            rules={
              showRules
                ? getRules(
                    schema['processDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:licenseType']['rules'],
                  )
                : []
            }
          >
            <Select options={licenseTypeOptions} />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.accessRestrictions'
                defaultMessage='Access and use restrictions'
              />
            }
          >
            <LangTextItemForm
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:accessRestrictions',
              ]}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.accessRestrictions'
                  defaultMessage='Access and use restrictions'
                />
              }
            />
          </Card>
        </Card>
      </Space>
    ),
    exchanges: (
      <>
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: <FormattedMessage id='pages.process.exchange.input' defaultMessage='Input' />,
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  actionRef={actionRefExchangeTableInput}
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  rowClassName={(record) => {
                    const isInRefCheck = refCheckContext?.refCheckData?.some(
                      (item: any) =>
                        item.id === record.referenceToFlowDataSetId &&
                        item.version === record.referenceToFlowDataSetVersion,
                    );
                    const isFormComplete =
                      record.meanAmount &&
                      record.meanAmount !== '-' &&
                      record.resultingAmount &&
                      record.resultingAmount !== '-' &&
                      record.dataDerivationTypeStatus &&
                      record.dataDerivationTypeStatus !== '-';

                    return showRules && (isInRefCheck || !isFormComplete) ? 'error-row' : '';
                  }}
                  className='process-exchange-table'
                  toolBarRender={() => {
                    return [
                      <ProcessExchangeCreate
                        disabled={actionFrom === 'modelResult'}
                        showRules={showRules}
                        key={0}
                        direction={'input'}
                        lang={lang}
                        onData={onExchangeDataCreate}
                      />,
                    ];
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Input',
                      params,
                    ).then((res: any) => {
                      return getUnitData('flow', res?.data).then((unitRes: any) => {
                        const flows = exchangeDataSource.map((item: any) => {
                          return {
                            id: item?.referenceToFlowDataSet?.['@refObjectId'],
                            version: item?.referenceToFlowDataSet?.['@version'],
                          };
                        });
                        return getFlowStateCodeByIdsAndVersions(flows, lang).then(
                          ({ error, data: flowsResp }: any) => {
                            if (!error) {
                              unitRes.forEach((item: any) => {
                                const flow = flowsResp.find(
                                  (flow: any) =>
                                    flow.id === item?.referenceToFlowDataSetId &&
                                    flow.version === item?.referenceToFlowDataSetVersion,
                                );
                                if (flow) {
                                  item.stateCode = flow.stateCode;
                                  item['classification'] = flow.classification;
                                }
                              });
                            }
                            return {
                              ...res,
                              data: unitRes,
                              success: true,
                            };
                          },
                        );
                      });
                    });
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
              label: (
                <FormattedMessage id='pages.process.exchange.output' defaultMessage='Output' />
              ),
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  actionRef={actionRefExchangeTableOutput}
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  rowClassName={(record) => {
                    const isInRefCheck = refCheckContext?.refCheckData?.some(
                      (item: any) =>
                        item.id === record.referenceToFlowDataSetId &&
                        item.version === record.referenceToFlowDataSetVersion,
                    );
                    const isFormComplete =
                      record.meanAmount &&
                      record.meanAmount !== '-' &&
                      record.resultingAmount &&
                      record.resultingAmount !== '-' &&
                      record.dataDerivationTypeStatus &&
                      record.dataDerivationTypeStatus !== '-';
                    return showRules && (isInRefCheck || !isFormComplete) ? 'error-row' : '';
                  }}
                  className='process-exchange-table'
                  toolBarRender={() => {
                    return [
                      <ProcessExchangeCreate
                        disabled={actionFrom === 'modelResult'}
                        showRules={showRules}
                        key={0}
                        direction={'output'}
                        lang={lang}
                        onData={onExchangeDataCreate}
                      />,
                    ];
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Output',
                      params,
                    ).then((res: any) => {
                      return getUnitData('flow', res?.data).then((unitRes: any) => {
                        const flows = exchangeDataSource.map((item: any) => {
                          return {
                            id: item?.referenceToFlowDataSet?.['@refObjectId'],
                            version: item?.referenceToFlowDataSet?.['@version'],
                          };
                        });
                        return getFlowStateCodeByIdsAndVersions(flows, lang).then(
                          ({ error, data: flowsResp }: any) => {
                            if (!error) {
                              unitRes.forEach((item: any) => {
                                const flow = flowsResp.find(
                                  (flow: any) =>
                                    flow.id === item?.referenceToFlowDataSetId &&
                                    flow.version === item?.referenceToFlowDataSetVersion,
                                );
                                if (flow) {
                                  item.stateCode = flow.stateCode;
                                  item['classification'] = flow.classification;
                                }
                              });
                            }
                            return {
                              ...res,
                              data: unitRes,
                              success: true,
                            };
                          },
                        );
                      });
                    });
                  }}
                  columns={processExchangeColumns}
                />
              ),
            },
          ]}
        />
      </>
    ),
    lciaResults: (
      <ProTable<LCIAResultTable, ListPagination>
        actionRef={actionRefLciaResultTable}
        rowKey={(record) => record.key}
        search={false}
        loading={lciaResultDataSourceLoading}
        toolBarRender={() => [
          <ToolBarButton
            key='calculate'
            icon={<CalculatorOutlined />}
            tooltip={
              <FormattedMessage
                id='pages.process.view.lciaresults.calculate'
                defaultMessage='Calculate LCIA Results'
              />
            }
            onClick={getLCIAResult}
          />,
        ]}
        dataSource={jsonToList(lciaResults)}
        columns={lciaResultColumns}
      />
    ),
    validation: (
      <ReveiwItemForm
        type='reviewReport'
        showRules={showRules}
        name={['modellingAndValidation', 'validation', 'review']}
        lang={lang}
        formRef={formRef}
        onData={onData}
      />
    ),
    complianceDeclarations: (
      <ComplianceItemForm
        showRules={showRules}
        name={['modellingAndValidation', 'complianceDeclarations', 'compliance']}
        lang={lang}
        formRef={formRef}
        onData={onData}
      />
    ),
  };

  useEffect(() => {
    actionRefExchangeTableInput.current?.reload();
    actionRefExchangeTableOutput.current?.reload();
  }, [exchangeDataSource]);

  useEffect(() => {
    actionRefLciaResultTable.current?.reload();
  }, [lciaResults]);

  return (
    <Card
      style={{ width: '100%' }}
      tabList={tabList}
      activeTabKey={activeTabKey}
      onTabChange={onTabChange}
    >
      {tabContent[activeTabKey]}
    </Card>
  );
};
