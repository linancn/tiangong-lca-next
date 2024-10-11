import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import { dataSetVersion, StringMultiLang_r } from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import { copyrightOptions } from '@/pages/Processes/Components/optiondata';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Select, Space } from 'antd';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
};
export const LifeCycleModelForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onTabChange,
}) => {
  const tabList = [
    {
      key: 'lifeCycleModelInformation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.lifeCycleModelInformation"
          defaultMessage="Life cycle model information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.modellingAndValidation"
          defaultMessage="Modelling and validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.administrativeInformation"
          defaultMessage="Administrative information"
        />
      ),
    },
  ];

  const tabContent: { [key: string]: JSX.Element } = {
    lifeCycleModelInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage id="pages.lifeCycleModel.information.name" defaultMessage="Name" />
          }
        >
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.information.baseName"
                defaultMessage="Base name"
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'baseName']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.information.baseName"
                  defaultMessage="Base name"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.information.treatmentStandardsRoutes"
                defaultMessage="Treatment, standards, routes"
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
                  id="pages.lifeCycleModel.information.treatmentStandardsRoutes"
                  defaultMessage="Treatment, standards, routes"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.information.mixAndLocationTypes"
                defaultMessage="Mix and location types"
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
                  id="pages.lifeCycleModel.information.mixAndLocationTypes"
                  defaultMessage="Mix and location types"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.information.functionalUnitFlowProperties"
                defaultMessage="Quantitative product or process properties"
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
                  id="pages.lifeCycleModel.information.functionalUnitFlowProperties"
                  defaultMessage="Quantitative product or process properties"
                />
              }
              rules={StringMultiLang_r}
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
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.generalComment"
              defaultMessage="General comment"
            />
          }
        >
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.information.generalComment"
                defaultMessage="General comment"
              />
            }
          />
        </Card>
        <br />
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToExternalDocumentation"
              defaultMessage="Data set report, background info"
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
              id="pages.lifeCycleModel.information.technology.referenceToDiagram"
              defaultMessage="Life cycle model diagramm(s) or screenshot(s)"
            />
          }
          name={[
            'lifeCycleModelInformation',
            'dataSetInformation',
            'technology',
            'referenceToDiagram',
          ]}
          onData={onData}
        />
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet"
              defaultMessage="Use advice for data set"
            />
          }
        >
          <LangTextItemForm
            name={['modellingAndValidation', 'dataSourcesTreatmentEtc', 'useAdviceForDataSet']}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet"
                defaultMessage="Use advice for data set"
              />
            }
          />
        </Card>
        <br />
        <ContactSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToExternalDocumentation"
              defaultMessage="Data set report, background info"
            />
          }
          name={[
            'modellingAndValidation',
            'validation',
            'review',
            'common:referenceToNameOfReviewerAndInstitution',
          ]}
          onData={onData}
        />
        <br />
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToCompleteReviewReport"
              defaultMessage="Data set report, background info"
            />
          }
          name={[
            'modellingAndValidation',
            'validation',
            'review',
            'common:referenceToCompleteReviewReport',
          ]}
          onData={onData}
        />
        <br />
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Compliance system name"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:referenceToComplianceSystem',
          ]}
          onData={onData}
        />
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval of overall compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Input />
        </Form.Item>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance"
              defaultMessage="Nomenclature compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:nomenclatureCompliance',
          ]}
        >
          <Input />
        </Form.Item>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance"
              defaultMessage="Methodological compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:methodologicalCompliance',
          ]}
        >
          <Input />
        </Form.Item>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.reviewCompliance"
              defaultMessage="Review compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:reviewCompliance',
          ]}
        >
          <Input />
        </Form.Item>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.documentationCompliance"
              defaultMessage="Documentation compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:documentationCompliance',
          ]}
        >
          <Input />
        </Form.Item>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.qualityCompliance"
              defaultMessage="Quality compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:qualityCompliance',
          ]}
        >
          <Input />
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.commissionerAndGoal"
              defaultMessage="Commissioner and goal"
            />
          }
        >
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToCommissioner"
                defaultMessage="Commissioner of data set"
              />
            }
            name={[
              'administrativeInformation',
              'common:commissionerAndGoal',
              'common:referenceToCommissioner',
            ]}
            onData={onData}
          />
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.project"
                defaultMessage="Project"
              />
            }
          >
            <LangTextItemForm
              name={['administrativeInformation', 'common:commissionerAndGoal', 'common:project']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.administrativeInformation.project"
                  defaultMessage="Project"
                />
              }
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.intendedApplications"
                defaultMessage="Intended applications"
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
                  id="pages.lifeCycleModel.administrativeInformation.intendedApplications"
                  defaultMessage="Intended applications"
                />
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
              id="pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityGeneratingTheDataSet"
              defaultMessage="Data set generator / modeller"
            />
          }
          name={[
            'administrativeInformation',
            'dataGenerator',
            'common:referenceToPersonOrEntityGeneratingTheDataSet',
          ]}
          onData={onData}
        />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.dataEntryBy"
              defaultMessage="Data entry by"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.timeStamp"
                defaultMessage="Time stamp (last saved)"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input disabled={true} style={{ color: '#000' }} />
          </Form.Item>
          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Data set format(s)"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            onData={onData}
          />
          <br />
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityEnteringTheData"
                defaultMessage="Data entry by:"
              />
            }
            name={[
              'administrativeInformation',
              'dataEntryBy',
              'common:referenceToPersonOrEntityEnteringTheData',
            ]}
            onData={onData}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication and ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.dataSetVersion"
                defaultMessage="Data set version"
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
                id="pages.flow.view.administrativeInformation.permanentDataSetURI"
                defaultMessage="Permanent data set URI"
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
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToOwnershipOfDataSet"
                defaultMessage="Owner of data set"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            onData={onData}
          />
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.copyright"
                defaultMessage="Copyright?"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
          >
            <Select options={copyrightOptions} />
          </Form.Item>
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToEntitiesWithExclusiveAccess"
                defaultMessage="Entities or persons with exclusive access to this data set"
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
                id="pages.lifeCycleModel.administrativeInformation.licenseType"
                defaultMessage="License type"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
          >
            <Input />
          </Form.Item>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.accessRestrictions"
                defaultMessage="Access and use restrictions"
              />
            }
          >
            <LangTextItemForm
              name={[
                'administrativeInformation',
                'common:commissionerAndGoal',
                'common:accessRestrictions',
              ]}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.administrativeInformation.accessRestrictions"
                  defaultMessage="Access and use restrictions"
                />
              }
            />
          </Card>
        </Card>
      </Space>
    ),
  };

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
