import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import { dataSetVersion, StringMultiLang_r } from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import { copyrightOptions } from '@/pages/Processes/Components/optiondata';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import type { ProFormInstance } from '@ant-design/pro-form';
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
        <FormattedMessage id="pages.lifeCycleModel.view.lifeCycleModelInformation" defaultMessage="Life Cycle Model Information" />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.modellingAndValidation"
          defaultMessage="Modelling and Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.administrativeInformation"
          defaultMessage="Administrative Information"
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
            <FormattedMessage
              id="pages.lifeCycleModel.information.name"
              defaultMessage="Name"
            />
          }
        >
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.information.baseName"
                defaultMessage="Base Name"
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'baseName']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.information.baseName"
                  defaultMessage="Base Name"
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
                defaultMessage="Treatment Standards Routes"
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'treatmentStandardsRoutes']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.information.treatmentStandardsRoutes"
                  defaultMessage="Treatment Standards Routes"
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
                defaultMessage="Mix and Location Types"
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'mixAndLocationTypes']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.information.mixAndLocationTypes"
                  defaultMessage="Mix and Location Types"
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
                defaultMessage="Functional Unit Flow Properties"
              />
            }
          >
            <LangTextItemForm
              name={['lifeCycleModelInformation', 'dataSetInformation', 'name', 'functionalUnitFlowProperties']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.information.functionalUnitFlowProperties"
                  defaultMessage="Functional Unit Flow Properties"
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
          dataType={''}
          onData={onData}
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.generalComment"
              defaultMessage="General Comment"
            />
          }
        >
          <LangTextItemForm
            name={['lifeCycleModelInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.information.generalComment"
                defaultMessage="General Comment"
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
              defaultMessage="Reference to External Documentation"
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
              defaultMessage="Reference to Diagram"
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
              defaultMessage="Use Advice For Data Set"
            />
          }
        >
          <LangTextItemForm
            name={['modellingAndValidation', 'dataSourcesTreatmentEtc', 'useAdviceForDataSet']}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet"
                defaultMessage="Use Advice For Data Set"
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
              defaultMessage="Reference to External Documentation"
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
              defaultMessage="Reference to External Documentation"
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
              defaultMessage="Reference to Compliance System"
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
                defaultMessage="Approval of Overall Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:approvalOfOverallCompliance']}
          >
            <Input />
          </Form.Item>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance"
                defaultMessage="Nomenclature Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:nomenclatureCompliance']}
          >
            <Input />
          </Form.Item>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance"
                defaultMessage="Methodological Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:methodologicalCompliance']}
          >
            <Input />
          </Form.Item>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.reviewCompliance"
                defaultMessage="Review Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:reviewCompliance']}
          >
            <Input />
          </Form.Item>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.documentationCompliance"
                defaultMessage="Documentation Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:documentationCompliance']}
          >
            <Input />
          </Form.Item>
          <br />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.qualityCompliance"
                defaultMessage="Quality Compliance"
              />
            }
            name={['modellingAndValidation', 'complianceDeclarations','compliance', 'common:qualityCompliance']}
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
              defaultMessage="Commissioner and Goal"
            />
          }
        >
          <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToCommissioner"
                defaultMessage="Reference to Commissioner"
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
                defaultMessage="Intended Applications"
              />
            }
          >
            <LangTextItemForm
              name={['administrativeInformation', 'common:commissionerAndGoal', 'common:intendedApplications']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.administrativeInformation.intendedApplications"
                  defaultMessage="Intended Applications"
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
              defaultMessage="Reference to Person Or Entity Generating the DataSet"
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
                defaultMessage="Reference to Person or Entity Entering the Data"
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
              defaultMessage="Publication and Ownership"
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
                defaultMessage="Reference to Ownership of Data Set"
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
                defaultMessage="Reference to Entities with Exclusive Access"
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
                defaultMessage="License Type"
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
                defaultMessage="Access Restrictions"
              />
            }
          >
            <LangTextItemForm
              name={['administrativeInformation', 'common:commissionerAndGoal', 'common:accessRestrictions']}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.administrativeInformation.accessRestrictions"
                  defaultMessage="Access Restrictions"
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
