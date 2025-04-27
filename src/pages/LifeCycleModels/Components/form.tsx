import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import LocationTextItemForm from '@/components/LocationTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import ComplianceItemForm from '@/pages/Processes/Components/Compliance/form';
import { copyrightOptions } from '@/pages/Processes/Components/optiondata';
import ReveiwItemForm from '@/pages/Processes/Components/Review/form';
import processSchema from '@/pages/Processes/processes_schema.json';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Divider, Form, Input, Select, Space, theme } from 'antd';
import type { FC } from 'react';
import React, { useState } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../lifecyclemodels.json';
import {
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  completenessElementaryFlowsTypeOptions,
  completenessElementaryFlowsValueOptions,
  completenessProductModelOptions,
  // approvalOfOverallComplianceOptions,
  // documentationComplianceOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
  // methodologicalComplianceOptions,
  // nomenclatureComplianceOptions,
  // qualityComplianceOptions,
  // reviewComplianceOptions,
  uncertaintyDistributionTypeOptions,
  workflowAndPublicationStatusOptions,
} from './optiondata';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
  formType?: string;
};
export const LifeCycleModelForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onTabChange,
  formType,
}) => {
  const { token } = theme.useToken();
  const [baseNameError, setBaseNameError] = useState(false);
  const [treatmentStandardsRoutesError, setTreatmentStandardsRoutesError] = useState(false);
  const [mixAndLocationTypesError, setMixAndLocationTypesError] = useState(false);
  const [generalCommentError, setGeneralCommentError] = useState(false);
  const [intendedApplicationsError, setIntendedApplicationsError] = useState(false);
  const [dataCutOffAndCompletenessPrinciplesError, setDataCutOffAndCompletenessPrinciplesError] =
    useState(false);
  const [
    technologyDescriptionAndIncludedProcessesError,
    setTechnologyDescriptionAndIncludedProcessesError,
  ] = useState(false);

  const tabList = [
    {
      key: 'lifeCycleModelInformation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.lifeCycleModelInformation'
          defaultMessage='Life cycle model information'
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.modellingAndValidation'
          defaultMessage='Modelling and validation'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.view.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
    {
      key: 'validation',
      tab: <FormattedMessage id='pages.lifeCycleModel.validation' defaultMessage='Validation' />,
    },
    {
      key: 'complianceDeclarations',
      tab: (
        <FormattedMessage
          id='pages.lifeCycleModel.complianceDeclarations'
          defaultMessage='Compliance declarations'
        />
      ),
    },
  ];

  const tabContent: { [key: string]: JSX.Element } = {
    lifeCycleModelInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
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
                    id='pages.lifeCycleModel.information.baseName'
                    defaultMessage='Base name'
                  />
                }
                showError={baseNameError}
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'baseName']}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.baseName'
                  defaultMessage='Base name'
                />
              }
              setRuleErrorState={setBaseNameError}
              rules={getRules(
                schema['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
                'name'
                ]['baseName']['rules'],
              )}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.information.treatmentStandardsRoutes'
                    defaultMessage='Treatment, standards, routes'
                  />
                }
                showError={treatmentStandardsRoutesError}
              />
            }
          >
            <LangTextItemForm
              name={[
                'lifeCycleModelInformation',
                'dataSetInformation',
                'name',
                'treatmentStandardsRoutes',
              ]}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.treatmentStandardsRoutes'
                  defaultMessage='Treatment, standards, routes'
                />
              }
              setRuleErrorState={setTreatmentStandardsRoutesError}
              rules={getRules(
                schema['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
                'name'
                ]['treatmentStandardsRoutes']['rules'],
              )}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.information.mixAndLocationTypes'
                    defaultMessage='Mix and location types'
                  />
                }
                showError={mixAndLocationTypesError}
              />
            }
          >
            <LangTextItemForm
              name={[
                'lifeCycleModelInformation',
                'dataSetInformation',
                'name',
                'mixAndLocationTypes',
              ]}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.mixAndLocationTypes'
                  defaultMessage='Mix and location types'
                />
              }
              setRuleErrorState={setMixAndLocationTypesError}
              rules={getRules(
                schema['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
                'name'
                ]['mixAndLocationTypes']['rules'],
              )}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.information.functionalUnitFlowProperties'
                defaultMessage='Quantitative product or process properties'
              />
            }
          >
            <LangTextItemForm
              name={[
                'lifeCycleModelInformation',
                'dataSetInformation',
                'name',
                'functionalUnitFlowProperties',
              ]}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.functionalUnitFlowProperties'
                  defaultMessage='Quantitative product or process properties'
                />
              }
              rules={getRules(
                schema['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
                'name'
                ]['functionalUnitFlowProperties']['rules'],
              )}
            />
          </Card>
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id='pages.lifeCycleModel.information.identifierOfSubDataSet'
              defaultMessage='Identifier of sub-data set'
            />
          }
          name={['lifeCycleModelInformation', 'dataSetInformation', 'identifierOfSubDataSet']}
        >
          <Input />
        </Form.Item>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.synonyms'
              defaultMessage='Synonyms'
            />
          }
        >
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'dataSetInformation', 'common:synonyms']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.synonyms'
                defaultMessage='Synonyms'
              />
            }
          />
        </Card>
        <br />
        <LevelTextItemForm
          name={[
            'lifeCycleModelInformation',
            'dataSetInformation',
            'classificationInformation',
            'common:classification',
            'common:class',
          ]}
          formRef={formRef}
          lang={lang}
          dataType={'LifeCycleModel'}
          onData={onData}
          rules={getRules(
            schema['lifeCycleModelDataSet']['lifeCycleModelInformation']['dataSetInformation'][
            'classificationInformation'
            ]['common:classification']['common:class']['rules'],
          )}
        />
        <Card
          size='small'
          title={
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.generalComment'
                  defaultMessage='General comment'
                />
              }
              showError={generalCommentError}
            />
          }
        >
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.generalComment'
                defaultMessage='General comment'
              />
            }
            rules={getRules(
              processSchema['processDataSet']['processInformation']['dataSetInformation'][
              'common:generalComment'
              ]['rules'],
            )}
            setRuleErrorState={setGeneralCommentError}
          />
        </Card>
        <br />
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id='pages.lifeCycleModel.information.referenceToExternalDocumentation'
              defaultMessage='Data set report, background info'
            />
          }
          name={[
            'lifeCycleModelInformation',
            'dataSetInformation',
            'referenceToExternalDocumentation',
          ]}
          onData={onData}
        />
        <br />
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id='pages.lifeCycleModel.information.technology.referenceToDiagram'
              defaultMessage='Life cycle model diagramm(s) or screenshot(s)'
            />
          }
          name={['lifeCycleModelInformation', 'technology', 'referenceToDiagram']}
          onData={onData}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.time'
              defaultMessage='Time representativeness'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.referenceYear'
                defaultMessage='Reference year'
              />
            }
            name={['lifeCycleModelInformation', 'time', 'common:referenceYear']}
            rules={getRules(
              processSchema['processDataSet']['processInformation']['time']['common:referenceYear'][
              'rules'
              ],
            )}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.dataSetValidUntil'
                defaultMessage='Data set valid until:'
              />
            }
            name={['lifeCycleModelInformation', 'time', 'common:dataSetValidUntil']}
            rules={getRules(
              processSchema['processDataSet']['processInformation']['time'][
              'common:dataSetValidUntil'
              ]['rules'],
            )}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.timeRepresentativenessDescription'
              defaultMessage='Time representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'time', 'common:timeRepresentativenessDescription']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.timeRepresentativenessDescription'
                defaultMessage='Time representativeness description'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.locationOfOperationSupplyOrProduction'
              defaultMessage='Location'
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.location'
                defaultMessage='Location'
              />
            }
            name={[
              'lifeCycleModelInformation',
              'geography',
              'locationOfOperationSupplyOrProduction',
              '@location',
            ]}
            lang={lang}
            onData={onData}
            rules={getRules(
              processSchema['processDataSet']['processInformation']['geography'][
              'locationOfOperationSupplyOrProduction'
              ]['@location']['rules'],
            )}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'lifeCycleModelInformation',
              'geography',
              'locationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.descriptionOfRestrictions'
                defaultMessage='Geographical representativeness description'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.subLocationOfOperationSupplyOrProduction'
              defaultMessage='Sub-location(s)'
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.location'
                defaultMessage='Sub-location(s)'
              />
            }
            name={[
              'lifeCycleModelInformation',
              'geography',
              'subLocationOfOperationSupplyOrProduction',
              '@subLocation',
            ]}
            lang={lang}
            onData={onData}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemForm
            name={[
              'lifeCycleModelInformation',
              'geography',
              'subLocationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.descriptionOfRestrictions'
                defaultMessage='Geographical representativeness description'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.technology'
              defaultMessage='Technological representativeness'
            />
          }
        >
          <Divider className='required-divider' orientationMargin='0' orientation='left' plain>
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.technologyDescriptionAndIncludedProcesses'
                  defaultMessage='Technology description including background system'
                />
              }
              showError={technologyDescriptionAndIncludedProcessesError}
            />
          </Divider>
          <LangTextItemForm
            name={[
              'lifeCycleModelInformation',
              'technology',
              'technologyDescriptionAndIncludedProcesses',
            ]}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.technologyDescriptionAndIncludedProcesses'
                defaultMessage='Technology description including background system'
              />
            }
            setRuleErrorState={setTechnologyDescriptionAndIncludedProcessesError}
            rules={getRules(
              processSchema['processDataSet']['processInformation']['technology'][
              'technologyDescriptionAndIncludedProcesses'
              ]['rules'],
            )}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.information.technologicalApplicability'
              defaultMessage='Technical purpose of product or process'
            />
          </Divider>
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'technology', 'technologicalApplicability']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.technologicalApplicability'
                defaultMessage='Technical purpose of product or process'
              />
            }
          />
          <SourceSelectForm
            name={['lifeCycleModelInformation', 'technology', 'referenceToTechnologyPictogramme']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.referenceToTechnologyPictogramme'
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
              'lifeCycleModelInformation',
              'technology',
              'referenceToTechnologyFlowDiagrammOrPicture',
            ]}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.referenceToTechnologyFlowDiagrammOrPicture'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.modelDescription'
              defaultMessage='Model description'
            />
          }
        >
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'mathematicalRelations', 'modelDescription']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.modelDescription'
                defaultMessage='Model description'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.information.variableParameter'
              defaultMessage='Variable / parameter'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.variableParameter.name'
                defaultMessage='Name of variable'
              />
            }
            name={[
              'lifeCycleModelInformation',
              'mathematicalRelations',
              'variableParameter',
              '@name',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.variableParameter.formula'
                defaultMessage='Formula'
              />
            }
            name={[
              'lifeCycleModelInformation',
              'mathematicalRelations',
              'variableParameter',
              'formula',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.variableParameter.meanValue'
                defaultMessage='Mean value'
              />
            }
            name={[
              'lifeCycleModelInformation',
              'mathematicalRelations',
              'variableParameter',
              'meanValue',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.information.variableParameter.minimumValue'
                defaultMessage='Minimum value'
              />
            }
            name={[
              'lifeCycleModelInformation',
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
                id='pages.lifeCycleModel.information.variableParameter.maximumValue'
                defaultMessage='Maximum value'
              />
            }
            name={[
              'lifeCycleModelInformation',
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
                id='pages.lifeCycleModel.information.variableParameter.uncertaintyDistributionType'
                defaultMessage='Uncertainty distribution type'
              />
            }
            name={[
              'lifeCycleModelInformation',
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
                id='pages.lifeCycleModel.information.variableParameter.relativeStandardDeviation95In'
                defaultMessage='Relative StdDev in %'
              />
            }
            name={[
              'lifeCycleModelInformation',
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
                id='pages.lifeCycleModel.information.variableParameter.comment'
                defaultMessage='Comment, units, defaults'
              />
            }
          >
            <LangTextItemForm
              name={[
                'lifeCycleModelInformation',
                'mathematicalRelations',
                'variableParameter',
                'comment',
              ]}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.information.variableParameter.comment'
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
              id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
              defaultMessage='Use advice for data set'
            />
          }
        >
          <LangTextItemForm
            name={['modellingAndValidation', 'dataSourcesTreatmentEtc', 'useAdviceForDataSet']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
                defaultMessage='Use advice for data set'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.lCIMethodAndAllocation'
              defaultMessage='LCI method and allocation'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.typeOfDataSet'
                defaultMessage='Type of data set'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet']}
            rules={getRules(
              processSchema['processDataSet']['modellingAndValidation']['LCIMethodAndAllocation'][
              'typeOfDataSet'
              ]['rules'],
            )}
          >
            <Select options={processtypeOfDataSetOptions} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.lCIMethodPrinciple'
                defaultMessage='LCI method principle'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodPrinciple']}
          >
            <Select options={LCIMethodPrincipleOptions} />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodPrinciple'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodPrinciple'
                defaultMessage='Deviation from LCI method principle / explanations'
              />
            }
          />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.lCIMethodApproaches'
                defaultMessage='LCI method approaches'
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodApproaches']}
          >
            <Select options={LCIMethodApproachOptions} />
          </Form.Item>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodApproaches'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromLCIMethodApproaches'
                defaultMessage='Deviations from LCI method approaches / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.modellingConstants'
              defaultMessage='Modelling constants'
            />
          </Divider>
          <LangTextItemForm
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'modellingConstants']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.modellingConstants'
                defaultMessage='Modelling constants'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromModellingConstants'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromModellingConstants'
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
                id='pages.lifeCycleModel.modellingAndValidation.referenceToLCAMethodDetails'
                defaultMessage='LCA methodology report'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness'
              defaultMessage='Data sources, treatment, and representativeness'
            />
          }
        >
          <Divider className='required-divider' orientationMargin='0' orientation='left' plain>
            <RequiredMark
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
                defaultMessage='Data cut-off and completeness principles'
              />
            }
            setRuleErrorState={setDataCutOffAndCompletenessPrinciplesError}
            rules={getRules(
              processSchema['processDataSet']['modellingAndValidation'][
              'dataSourcesTreatmentAndRepresentativeness'
              ]['dataCutOffAndCompletenessPrinciples']['rules'],
            )}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
                defaultMessage='Deviation from data cut-off and completeness principles / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataSelectionAndCombinationPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.dataSelectionAndCombinationPrinciples'
                defaultMessage='Data selection and combination principles'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
                defaultMessage='Deviation from data selection and combination principles / explanations'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
                defaultMessage='Data treatment and extrapolations principles'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
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
                id='pages.lifeCycleModel.modellingAndValidation.referenceToDataHandlingPrinciples'
                defaultMessage='Data handling report'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <SourceSelectForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'referenceToDataSource',
            ]}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.referenceToDataSource'
                defaultMessage='Data source(s) used for this data set'
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
            rules={getRules(
              processSchema['processDataSet']['modellingAndValidation'][
              'dataSourcesTreatmentAndRepresentativeness'
              ]['referenceToDataSource']['rules'],
            )}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.percentageSupplyOrProductionCovered'
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
              id='pages.lifeCycleModel.modellingAndValidation.annualSupplyOrProductionVolume'
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
                id='pages.lifeCycleModel.modellingAndValidation.annualSupplyOrProductionVolume'
                defaultMessage='Annual supply or production volume'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.samplingProcedure'
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
                id='pages.lifeCycleModel.modellingAndValidation.samplingProcedure'
                defaultMessage='Sampling procedure'
              />
            }
          />

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.dataCollectionPeriod'
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
                id='pages.lifeCycleModel.modellingAndValidation.dataCollectionPeriod'
                defaultMessage='Data collection period'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.uncertaintyAdjustments'
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
                id='pages.lifeCycleModel.modellingAndValidation.uncertaintyAdjustments'
                defaultMessage='Uncertainty adjustments'
              />
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
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
                id='pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet'
                defaultMessage='Use advice for data set'
              />
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.modellingAndValidation.completeness'
              defaultMessage='Completeness'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessProductModel'
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
                id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows'
                defaultMessage='Completeness elementary flows, per topic'
              />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows.type'
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
                  id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessElementaryFlows.value'
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
              id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessOtherProblemField'
              defaultMessage='Completeness other problem field(s)'
            />
          </Divider>
          <LangTextItemForm
            name={['modellingAndValidation', 'completeness', 'completenessOtherProblemField']}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.modellingAndValidation.completeness.completenessOtherProblemField'
                defaultMessage='Completeness other problem field(s)'
              />
            }
          />
        </Card>
      </Space>
    ),
    administrativeInformation: (
      <Space direction='vertical' style={{ width: '100%' }}>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.commissionerAndGoal'
              defaultMessage='Commissioner and goal'
            />
          }
        >
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToCommissioner'
                defaultMessage='Commissioner of data set'
              />
            }
            name={[
              'administrativeInformation',
              'common:commissionerAndGoal',
              'common:referenceToCommissioner',
            ]}
            onData={onData}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'common:commissionerAndGoal'
              ]['common:referenceToCommissioner']['rules'],
            )}
          />
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.project'
                defaultMessage='Project'
              />
            }
          >
            <LangTextItemForm
              name={['administrativeInformation', 'common:commissionerAndGoal', 'common:project']}
              label={
                <FormattedMessage
                  id='pages.lifeCycleModel.administrativeInformation.project'
                  defaultMessage='Project'
                />
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
                    id='pages.lifeCycleModel.administrativeInformation.intendedApplications'
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
                  id='pages.lifeCycleModel.administrativeInformation.intendedApplications'
                  defaultMessage='Intended applications'
                />
              }
              setRuleErrorState={setIntendedApplicationsError}
              rules={getRules(
                processSchema['processDataSet']['administrativeInformation'][
                'common:commissionerAndGoal'
                ]['common:intendedApplications']['rules'],
              )}
            />
          </Card>
        </Card>
        <br />
        <ContactSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityGeneratingTheDataSet'
              defaultMessage='Data set generator / modeller'
            />
          }
          name={[
            'administrativeInformation',
            'dataGenerator',
            'common:referenceToPersonOrEntityGeneratingTheDataSet',
          ]}
          onData={onData}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.lifeCycleModel.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.timeStamp'
                defaultMessage='Time stamp (last saved)'
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
              'common:timeStamp'
              ]['rules'],
            )}
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
            defaultSourceName={formType === 'create' ? 'ILCD format' : undefined}
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            onData={onData}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
              'common:referenceToDataSetFormat'
              ]['rules'],
            )}
          />
          <br />

          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToConvertedOriginalDataSetFrom'
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
                id='pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityEnteringTheData'
                defaultMessage='Data entry by:'
              />
            }
            name={[
              'administrativeInformation',
              'dataEntryBy',
              'common:referenceToPersonOrEntityEnteringTheData',
            ]}
            onData={onData}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
              'common:referenceToPersonOrEntityEnteringTheData'
              ]['rules'],
            )}
          />
          <br />

          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToDataSetUseApproval'
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
              id='pages.lifeCycleModel.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.dateOfLastRevision'
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
                id='pages.flow.view.administrativeInformation.dataSetVersion'
                defaultMessage='Data set version'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'publicationAndOwnership'
              ]['common:dataSetVersion']['rules'],
            )}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.flow.view.administrativeInformation.permanentDataSetURI'
                defaultMessage='Permanent data set URI'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'publicationAndOwnership'
              ]['common:permanentDataSetURI']['rules'],
            )}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.workflowAndPublicationStatus'
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
                id='pages.lifeCycleModel.administrativeInformation.referenceToUnchangedRepublication'
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
                id='pages.lifeCycleModel.administrativeInformation.referenceToRegistrationAuthority'
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
                id='pages.lifeCycleModel.administrativeInformation.registrationNumber'
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
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            onData={onData}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'publicationAndOwnership'
              ]['common:referenceToOwnershipOfDataSet']['rules'],
            )}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.copyright'
                defaultMessage='Copyright?'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'publicationAndOwnership'
              ]['common:copyright']['rules'],
            )}
          >
            <Select options={copyrightOptions} />
          </Form.Item>
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.referenceToEntitiesWithExclusiveAccess'
                defaultMessage='Entities or persons with exclusive access to this data set'
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToEntitiesWithExclusiveAccess',
            ]}
            onData={onData}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.licenseType'
                defaultMessage='License type'
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
            rules={getRules(
              schema['lifeCycleModelDataSet']['administrativeInformation'][
              'publicationAndOwnership'
              ]['common:licenseType']['rules'],
            )}
          >
            <Select options={licenseTypeOptions} />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.lifeCycleModel.administrativeInformation.accessRestrictions'
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
                  id='pages.lifeCycleModel.administrativeInformation.accessRestrictions'
                  defaultMessage='Access and use restrictions'
                />
              }
            />
          </Card>
        </Card>
      </Space>
    ),
    validation: (
      <ReveiwItemForm
        name={['modellingAndValidation', 'validation', 'review']}
        lang={lang}
        formRef={formRef}
        onData={onData}
      />
    ),
    complianceDeclarations: (
      <ComplianceItemForm
        name={['modellingAndValidation', 'complianceDeclarations', 'compliance']}
        lang={lang}
        formRef={formRef}
        onData={onData}
      />
    ),
  };

  return (
    <Card
      style={{ width: '100%' }}
      tabList={tabList}
      activeTabKey={activeTabKey}
      onTabChange={onTabChange}
    >
      {/* {Object.keys(tabContent).map((key) => (
        <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
          {tabContent[key]}
        </div>
      ))} */}
      {tabContent[activeTabKey]}
    </Card>
  );
};
