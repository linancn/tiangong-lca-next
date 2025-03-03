import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import {
  approvalOfOverallComplianceOptions,
  documentationComplianceOptions,
  licenseTypeOptions,
  methodologicalComplianceOptions,
  nomenclatureComplianceOptions,
  qualityComplianceOptions,
  reviewComplianceOptions,
} from '../optiondata';

type Props = {
  lang: string;
  data: any;
};

const getapprovalOfOverallComplianceOptions = (value: string) => {
  const option = approvalOfOverallComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getnomenclatureComplianceOptions = (value: string) => {
  const option = nomenclatureComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getmethodologicalComplianceOptions = (value: string) => {
  const option = methodologicalComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getreviewComplianceOptions = (value: string) => {
  const option = reviewComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getdocumentationComplianceOptions = (value: string) => {
  const option = documentationComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getqualityComplianceOptions = (value: string) => {
  const option = qualityComplianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLicenseTypeOptions = (value: string) => {
  const option = licenseTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
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
              defaultMessage="Base name"
            />
          </Divider>
          <LangTextItemDescription
            data={data.lifeCycleModelInformation?.dataSetInformation?.name?.baseName ?? '-'}
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.treatmentStandardsRoutes"
              defaultMessage="Treatment, standards, routes"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name?.treatmentStandardsRoutes ??
              '-'
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.mixAndLocationTypes"
              defaultMessage="Mix and Location Types"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name?.mixAndLocationTypes ?? '-'
            }
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.functionalUnitFlowProperties"
              defaultMessage="Quantitative product or process properties"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.lifeCycleModelInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties ?? '-'
            }
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
          data={
            data.lifeCycleModelInformation?.dataSetInformation?.['common:generalComment'] ?? '-'
          }
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
          data={data.lifeCycleModelInformation?.dataSetInformation?.referenceToDiagram ?? {}}
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
          data={
            data.lifeCycleModelInformation?.modellingAndValidation?.dataSourcesTreatmentEtc
              ?.useAdviceForDataSet ?? '-'
          }
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
            data.modellingAndValidation?.validation?.review?.[
              'common:referenceToCompleteReviewReport'
            ] ?? {}
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
            data.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:referenceToComplianceSystem'
            ] ?? {}
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
            styles={{ label: { width: '240px' } }}
          >
            {getapprovalOfOverallComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:approvalOfOverallCompliance'
              ] ?? '-',
            )}
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
            styles={{ label: { width: '200px' } }}
          >
            {getnomenclatureComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:nomenclatureCompliance'
              ] ?? '-',
            )}
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
            styles={{ label: { width: '210px' } }}
          >
            {getmethodologicalComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:methodologicalCompliance'
              ] ?? '-',
            )}
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
            {getreviewComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:reviewCompliance'
              ] ?? '-',
            )}
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
            styles={{ label: { width: '210px' } }}
          >
            {getdocumentationComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:documentationCompliance'
              ] ?? '-',
            )}
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
            {getqualityComplianceOptions(
              data.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:qualityCompliance'
              ] ?? '-',
            )}
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
              data.administrativeInformation?.['common:commissionerAndGoal']?.['common:project']
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
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.flow.view.administrativeInformation.dataSetVersion"
                  defaultMessage="Data set version"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              <Space>
                {data.administrativeInformation?.publicationAndOwnership?.[
                  'common:dataSetVersion'
                ] ?? '-'}
              </Space>
            </Descriptions.Item>
          </Descriptions>
          {/* <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.dataSetVersion"
              defaultMessage="Data set version"
            />
          </Divider>
          <LangTextItemDescription
            data={
              data.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion']
            }
          /> */}
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
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.lifeCycleModel.administrativeInformation.licenseType"
                  defaultMessage="License type"
                />
              }
              labelStyle={{ width: '180px' }}
            >
              {getLicenseTypeOptions(
                data.administrativeInformation?.publicationAndOwnership?.['common:licenseType'] ??
                  '-',
              )}
            </Descriptions.Item>
          </Descriptions>
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
        getContainer={() => document.body}
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
