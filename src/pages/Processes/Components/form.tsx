import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import LocationTextItemForm from '@/components/LocationTextItem/form';
import {
  dataSetVersion,
  FTMultiLang_r,
  NullableString,
  StringMultiLang_r,
  Yearvalidation_r,
} from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
// import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { ListPagination } from '@/services/general/data';
import { getLangText, getUnitData } from '@/services/general/util';
import { getProcessExchange } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessExchangeTableData } from '@/services/processes/util';
import { ActionType, ProColumns, ProFormInstance, ProTable } from '@ant-design/pro-components';
import { Card, Collapse, Divider, Form, Input, Select, Space, theme, Tooltip } from 'antd';
import { useEffect, useRef, type FC } from 'react';
import { FormattedMessage } from 'umi';
import ComplianceItemForm from './Compliance/form';
import ProcessExchangeCreate from './Exchange/create';
import ProcessExchangeDelete from './Exchange/delete';
import ProcessExchangeEdit from './Exchange/edit';
import ProcessExchangeView from './Exchange/view';
import {
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
  workflowAndPublicationStatusOptions,
} from './optiondata';
import ReveiwItemForm from './Review/form';
import { uncertaintyDistributionTypeOptions } from './optiondata';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onExchangeData: (data: any) => void;
  onExchangeDataCreate: (data: any) => void;
  onTabChange: (key: string) => void;
  exchangeDataSource: ProcessExchangeTable[];
};

export const ProcessForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onExchangeData,
  onExchangeDataCreate,
  onTabChange,
  exchangeDataSource,
}) => {
  const actionRefExchangeTableInput = useRef<ActionType>();
  const actionRefExchangeTableOutput = useRef<ActionType>();
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
  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    // {
    //   title: <FormattedMessage id="processExchange.dataSetInternalID" defaultMessage="DataSet Internal ID" />,
    //   dataIndex: 'dataSetInternalID',
    //   search: false,
    // },
    // {
    //   title: (
    //     <FormattedMessage
    //       id="pages.process.exchange.exchangeDirection"
    //       defaultMessage="Direction"
    //     />
    //   ),
    //   dataIndex: 'exchangeDirection',
    //   sorter: false,
    //   search: false,
    // },
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
      title: (
        <FormattedMessage id='pages.process.exchange.meanAmount' defaultMessage='Mean amount' />
      ),
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.exchange.resultingAmount'
          defaultMessage='Resulting amount'
        />
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
          id='pages.process.exchange.dataDerivationTypeStatus'
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
          id='pages.process.exchange.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        return <QuantitativeReferenceIcon value={row.quantitativeReference} />;
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
              buttonType={'icon'}
            />
            <ProcessExchangeEdit
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              buttonType={'icon'}
              onData={onExchangeData}
              setViewDrawerVisible={() => { }}
            />
            <ProcessExchangeDelete
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              setViewDrawerVisible={() => { }}
              onData={onExchangeData}
            />
          </Space>,
        ];
      },
    },
  ];
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
              <FormattedMessage
                id='pages.process.view.processInformation.baseName'
                defaultMessage='Base name'
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
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.treatmentStandardsRoutes'
                defaultMessage='Treatment, standards, routes'
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
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.mixAndLocationTypes'
                defaultMessage='Mix and location types'
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
              rules={StringMultiLang_r}
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
              rules={StringMultiLang_r}
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
          rules={Yearvalidation_r}
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
        />

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.generalComment'
              defaultMessage='General comment on data set'
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
          />
        </Card>

        <SourceSelectForm
          name={[
            'processInformation',
            'dataSetInformation',
            'common:referenceToExternalDocumentation',
          ]}
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
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.referenceYear'
                defaultMessage='Reference year'
              />
            }
            name={['processInformation', 'time', 'common:referenceYear']}
            rules={Yearvalidation_r}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.dataSetValidUntil'
                defaultMessage='Data set valid until:'
              />
            }
            name={['processInformation', 'time', 'dataSetValidUntil']}
            rules={Yearvalidation_r}
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
            rules={FTMultiLang_r}
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
            rules={NullableString}
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
            rules={NullableString}
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
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses'
              defaultMessage='Technology description including background system'
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
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'minimumValue']}
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
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'maximumValue']}
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
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'uncertaintyDistributionType']}
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
            name={['processInformation', 'mathematicalRelations', 'variableParameter', 'relativeStandardDeviation95In']}
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
              name={[
                'processInformation',
                'mathematicalRelations',
                'variableParameter',
                'comment',
              ]}
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.modellingConstants'
              defaultMessage='Modelling constants'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'modellingConstants',
            ]}
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
            rules={FTMultiLang_r}
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
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
              defaultMessage='Data cut-off and completeness principles'
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
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
            rules={FTMultiLang_r}
          />

          <SourceSelectForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'referenceToDataSource',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToDataSource'
                defaultMessage='Data source(s) used for this data set'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.percentageSupplyOrProductionCovered'
                defaultMessage='Percentage supply or production covered'
              />
            }
            name={['modellingAndValidation', 'dataSourcesTreatmentAndRepresentativeness', 'percentageSupplyOrProductionCovered']}
          >
            <Input />
          </Form.Item>
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
            rules={FTMultiLang_r}
          />
        </Card>
        <Divider orientationMargin='0' orientation='left' plain>
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
        />
      </Space>
    ),
    administrativeInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <ContactSelectForm
          name={[
            'administrativeInformation',
            'commissionerAndGoal',
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
        />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.intendedApplications'
              defaultMessage='Intended applications'
            />
          }
        >
          <LangTextItemForm
            name={[
              'administrativeInformation',
              'commissionerAndGoal',
              'common:intendedApplications',
            ]}
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.intendedApplications'
                defaultMessage='Intended applications'
              />
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
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
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
            rules={dataSetVersion}
          >
            <Input />
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
          >
            <Input />
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
          />

          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.copyright'
                defaultMessage='Copyright?'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
          >
            <Select options={copyrightOptions} />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.licenseType'
                defaultMessage='License type'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
          >
            <Select options={licenseTypeOptions} />
          </Form.Item>
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
                  toolBarRender={() => {
                    return [
                      <ProcessExchangeCreate
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
                        return {
                          ...res,
                          data: unitRes,
                          success: true,
                        };
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
                  toolBarRender={() => {
                    return [
                      <ProcessExchangeCreate
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
                        return {
                          ...res,
                          data: unitRes,
                          success: true,
                        };
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
    validation: (
      <ReveiwItemForm
        name={['validation', 'review']}
        lang={lang}
        formRef={formRef}
        onData={onData}
      />
    ),
    complianceDeclarations: (
      <ComplianceItemForm
        name={['complianceDeclarations', 'compliance']}
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

  return (
    <Card
      style={{ width: '100%' }}
      tabList={tabList}
      activeTabKey={activeTabKey}
      onTabChange={onTabChange}
    >
      {Object.keys(tabContent).map((key) => (
        <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
          {tabContent[key]}
        </div>
      ))}
    </Card>
  );
};
