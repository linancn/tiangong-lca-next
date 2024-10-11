import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  lang: string;
  data: any;
};
const ToolbarViewInfo: FC<Props> = ({ lang, data }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const tabList = [
    {
      key: 'lifeCycleModelInformation',
      tab: (
        <FormattedMessage
          id="pages.lifeCycleModel.view.lifeCycleModelInformation"
          defaultMessage="Life Cycle Model Information"
        />
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

  const tabContent: Record<string, React.ReactNode> = {
    lifeCycleModelInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="pages.source.view.sourceInformation.id" defaultMessage="ID" />
            }
            labelStyle={{ width: '100px' }}
          >
            {data.lifeCycleModelInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage id="pages.lifeCycleModel.information.name" defaultMessage="Name" />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.baseName"
              defaultMessage="Base Name"
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.baseName ?? '-'}
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.treatmentStandardsRoutes"
              defaultMessage="Treatment Standards Routes"
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes ?? '-'}
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.mixAndLocationTypes"
              defaultMessage="Mix and Location Types"
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes ?? '-'}
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.functionalUnitFlowProperties"
              defaultMessage="Functional Unit Flow Properties"
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.functionalUnitFlowProperties ?? '-'}
          />
        </Card>
        <br />
        <LevelTextItemDescription
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.classificationInformation?.[
            'common:classification'
            ]?.['common:class']?.['value']
          }
          lang={lang}
          categoryType={'LifeCycleModel'}
        />
        <br />
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.lifeCycleModel.information.generalComment"
            defaultMessage="General Comment"
          />
        </Divider>
        <LangTextItemDescription
          data={data.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'] ?? '-'}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToExternalDocumentation"
              defaultMessage="Reference to External Documentation"
            />
          }
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.referenceToExternalDocumentation ??
            {}
          }
          lang={lang}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.technology.referenceToDiagram"
              defaultMessage="Reference to Diagram"
            />
          }
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.referenceToDiagram ??
            {}
          }
          lang={lang}
        />
      </>
    ),
    modellingAndValidation: (
      <>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.lifeCycleModel.modellingAndValidation.useAdviceForDataSet"
            defaultMessage="Use Advice For Data Set"
          />
        </Divider>
        <LangTextItemDescription
          data={data.lifeCycleModelInformation?.modellingAndValidation?.dataSourcesTreatmentEtc?.useAdviceForDataSet ?? '-'}
        />
        <br />
        <ContactSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToCompleteReviewReport"
              defaultMessage="Data set report, background info"
            />
          }
          lang={lang}
          data={
            data.modellingAndValidation?.validation?.review?.[
            'common:referenceToNameOfReviewerAndInstitution'
            ]
          }
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.information.referenceToCompleteReviewReport"
              defaultMessage="Reference to Complete Review Report"
            />
          }
          data={
            data.modellingAndValidation?.validation?.review?.['common:referenceToCompleteReviewReport'] ??
            {}
          }
          lang={lang}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference to Compliance System"
            />
          }
          data={
            data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem'] ??
            {}
          }
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance"
                defaultMessage="Approval of Overall Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance"
                defaultMessage="Nomenclature Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:nomenclatureCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance"
                defaultMessage="Methodological Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:methodologicalCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.reviewCompliance"
                defaultMessage="Review Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:reviewCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.documentationCompliance"
                defaultMessage="Documentation Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:documentationCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.modellingAndValidation.qualityCompliance"
                defaultMessage="Quality Compliance"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {data.modellingAndValidation?.complianceDeclarations?.compliance?.['common:qualityCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.commissionerAndGoal"
              defaultMessage="Commissioner and Goal"
            />
          }
        >
          <ContactSelectDescription
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToCommissioner"
                defaultMessage="Reference to Commissioner"
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
              ]
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.project"
              defaultMessage="Project"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:project'
              ]
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.intendedApplications"
              defaultMessage="Intended Applications"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:intendedApplications'
              ]
            }
          />
        </Card>
        <br />
        <ContactSelectDescription
          title={
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.referenceToPersonOrEntityGeneratingTheDataSet"
              defaultMessage="Reference to Person Or Entity Generating the DataSet"
            />
          }
          lang={lang}
          data={
            data.administrativeInformation?.dataGenerator?.[
            'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]
          }
        />
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
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.dataSetVersion"
              defaultMessage="Data set version"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
              'common:dataSetVersion'
              ]
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.permanentDataSetURI"
              defaultMessage="Permanent data set URI"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
              ]
            }
          />
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id="pages.lifeCycleModel.administrativeInformation.referenceToEntitiesWithExclusiveAccess"
                defaultMessage="Reference to Entities with Exclusive Access"
              />
            }
            lang={lang}
            data={
              data.administrativeInformation?.dataGenerator?.[
              'common:referenceToEntitiesWithExclusiveAccess'
              ]
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.licenseType"
              defaultMessage="License Type"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.publicationAndOwnership?.[
              'common:licenseType'
              ]
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.administrativeInformation.accessRestrictions"
              defaultMessage="Access Restrictions"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:accessRestrictions'
              ]
            }
          />
        </Card>
      </>
    ),
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.button.model.info" defaultMessage="Base infomation" />}
        placement="left"
      >
        <Button
          type="primary"
          size="small"
          icon={<InfoOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.info"
            defaultMessage="Model base infomation"
          ></FormattedMessage>
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={false}
      >
        <Card
          style={{ width: '100%' }}
          tabList={tabList}
          activeTabKey={activeTabKey}
          onTabChange={onTabChange}
        >
          {tabContent[activeTabKey]}
        </Card>
      </Drawer>
    </>
  );
};

export default ToolbarViewInfo;
