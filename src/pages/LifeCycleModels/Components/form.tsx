import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import ComplianceItemForm from '@/pages/Processes/Components/Compliance/form';
import { copyrightOptions } from '@/pages/Processes/Components/optiondata';
import ReveiwItemForm from '@/pages/Processes/Components/Review/form';
import processSchema from '@/pages/Processes/processes_schema.json';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Select, Space, theme } from 'antd';
import type { FC } from 'react';
import React, { useState } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../lifecyclemodels.json';
import { licenseTypeOptions } from './optiondata';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
  formType?: string;
  showRules?: boolean;
};
export const LifeCycleModelForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onTabChange,
  formType,
  showRules = false,
}) => {
  const { token } = theme.useToken();
  const [baseNameError, setBaseNameError] = useState(false);
  const [treatmentStandardsRoutesError, setTreatmentStandardsRoutesError] = useState(false);
  const [mixAndLocationTypesError, setMixAndLocationTypesError] = useState(false);
  const [generalCommentError, setGeneralCommentError] = useState(false);
  const [intendedApplicationsError, setIntendedApplicationsError] = useState(false);

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
              rules={[
                ...(showRules
                  ? getRules(
                      schema['lifeCycleModelDataSet']['lifeCycleModelInformation'][
                        'dataSetInformation'
                      ]['name']['baseName']['rules'],
                    )
                  : []),
                {
                  pattern: /^[^;；]*$/,
                  message: (
                    <FormattedMessage
                      id='validator.lang.mustNotContainSemicolon'
                      defaultMessage='Must not contain semicolon'
                    />
                  ),
                },
              ]}
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
              rules={[
                ...(showRules
                  ? getRules(
                      schema['lifeCycleModelDataSet']['lifeCycleModelInformation'][
                        'dataSetInformation'
                      ]['name']['treatmentStandardsRoutes']['rules'],
                    )
                  : []),
                {
                  pattern: /^[^;；]*$/,
                  message: (
                    <FormattedMessage
                      id='validator.lang.mustNotContainSemicolon'
                      defaultMessage='Must not contain semicolon'
                    />
                  ),
                },
              ]}
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
              rules={[
                ...(showRules
                  ? getRules(
                      schema['lifeCycleModelDataSet']['lifeCycleModelInformation'][
                        'dataSetInformation'
                      ]['name']['mixAndLocationTypes']['rules'],
                    )
                  : []),
                {
                  pattern: /^[^;；]*$/,
                  message: (
                    <FormattedMessage
                      id='validator.lang.mustNotContainSemicolon'
                      defaultMessage='Must not contain semicolon'
                    />
                  ),
                },
              ]}
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
              rules={[
                ...(showRules
                  ? getRules(
                      schema['lifeCycleModelDataSet']['lifeCycleModelInformation'][
                        'dataSetInformation'
                      ]['name']['functionalUnitFlowProperties']['rules'],
                    )
                  : []),
                {
                  pattern: /^[^;；]*$/,
                  message: (
                    <FormattedMessage
                      id='validator.lang.mustNotContainSemicolon'
                      defaultMessage='Must not contain semicolon'
                    />
                  ),
                },
              ]}
            />
          </Card>
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
          showRules={showRules}
          rules={
            showRules
              ? getRules(
                  schema['lifeCycleModelDataSet']['lifeCycleModelInformation'][
                    'dataSetInformation'
                  ]['classificationInformation']['common:classification']['common:class'][0][
                    '@classId'
                  ]['rules'],
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
            rules={
              showRules
                ? getRules(
                    processSchema['processDataSet']['processInformation']['dataSetInformation'][
                      'common:generalComment'
                    ]['rules'],
                  )
                : []
            }
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
            showRequiredLabel={true}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation'][
                      'common:commissionerAndGoal'
                    ]['common:referenceToCommissioner']['@refObjectId']['rules'],
                  )
                : []
            }
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
              rules={
                showRules
                  ? getRules(
                      processSchema['processDataSet']['administrativeInformation'][
                        'common:commissionerAndGoal'
                      ]['common:intendedApplications']['rules'],
                    )
                  : []
              }
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
            required={false}
            label={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.administrativeInformation.timeStamp'
                    defaultMessage='Time stamp (last saved)'
                  />
                }
                showError={false}
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:timeStamp'
                    ]['rules'],
                  )
                : []
            }
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
            showRequiredLabel={true}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:referenceToDataSetFormat'
                    ]['@refObjectId']['rules'],
                  )
                : []
            }
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
            showRequiredLabel={true}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation']['dataEntryBy'][
                      'common:referenceToPersonOrEntityEnteringTheData'
                    ]['@refObjectId']['rules'],
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
              id='pages.lifeCycleModel.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Form.Item
            required={false}
            label={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.flow.view.administrativeInformation.dataSetVersion'
                    defaultMessage='Data set version'
                  />
                }
                showError={false}
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
            required={false}
            label={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.flow.view.administrativeInformation.permanentDataSetURI'
                    defaultMessage='Permanent data set URI'
                  />
                }
                showError={false}
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
                    schema['lifeCycleModelDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:permanentDataSetURI']['rules'],
                  )
                : []
            }
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
            showRequiredLabel={true}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:referenceToOwnershipOfDataSet']['@refObjectId']['rules'],
                  )
                : []
            }
          />
          <br />
          <Form.Item
            required={false}
            label={
              <RequiredMark
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.administrativeInformation.copyright'
                    defaultMessage='Copyright?'
                  />
                }
                showError={false}
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation'][
                      'publicationAndOwnership'
                    ]['common:copyright']['rules'],
                  )
                : []
            }
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
            required={false}
            label={
              <RequiredMark
                showError={false}
                label={
                  <FormattedMessage
                    id='pages.lifeCycleModel.administrativeInformation.licenseType'
                    defaultMessage='License type'
                  />
                }
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
            rules={
              showRules
                ? getRules(
                    schema['lifeCycleModelDataSet']['administrativeInformation'][
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
        type='reviewReport'
        name={['modellingAndValidation', 'validation', 'review']}
        lang={lang}
        formRef={formRef}
        onData={onData}
        showRules={showRules}
      />
    ),
    complianceDeclarations: (
      <ComplianceItemForm
        name={['modellingAndValidation', 'complianceDeclarations', 'compliance']}
        lang={lang}
        formRef={formRef}
        onData={onData}
        showRules={showRules}
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
