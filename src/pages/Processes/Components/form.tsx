import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import LocationTextItemForm from '@/components/LocationTextItem/form';
import { dataSetVersion, NullableString, StringMultiLang_o, StringMultiLang_r } from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { ListPagination } from '@/services/general/data';
import {
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  ProcessExchangeTable,
  processTypeOptions,
  reviewTypeOptions,
} from '@/services/processes/data';
import { genProcessExchangeTableData } from '@/services/processes/util';
import { CheckCircleTwoTone, CloseCircleOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import { Card, Divider, Form, Input, Select, Space, Tooltip } from 'antd';
import { useRef, type FC } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeCreate from './Exchange/create';
import ProcessExchangeDelete from './Exchange/delete';
import ProcessExchangeEdit from './Exchange/edit';
import ProcessExchangeView from './Exchange/view';

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
  const actionRefExchangeTable = useRef<ActionType>();
  const tabList = [
    {
      key: 'processInformation',
      tab: (
        <FormattedMessage
          id="pages.process.view.processInformation"
          defaultMessage="Process Information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.process.view.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.process.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
    {
      key: 'exchanges',
      tab: <FormattedMessage id="pages.process.view.exchanges" defaultMessage="Exchanges" />,
    },
  ];
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
      title: (
        <FormattedMessage id="pages.process.exchange.meanAmount" defaultMessage="Mean Amount" />
      ),
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.resultingAmount"
          defaultMessage="Resulting Amount"
        />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference Unit Group"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit key={0} id={row.referenceToFlowDataSetId} idType={'flow'} lang={lang} />,
        ];
      },
    },

    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.dataDerivationTypeStatus"
          defaultMessage="Data Derivation Type Status"
        />
      ),
      dataIndex: 'dataDerivationTypeStatus',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.quantitativeReference"
          defaultMessage="Quantitative Reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return <CheckCircleTwoTone twoToneColor="#52c41a" />;
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
              lang={lang}
              dataSource={'my'}
              buttonType={'icon'}
            />
            <ProcessExchangeEdit
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              buttonType={'icon'}
              actionRef={actionRefExchangeTable}
              onData={onExchangeData}
              setViewDrawerVisible={() => { }}
            />
            <ProcessExchangeDelete
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              actionRef={actionRefExchangeTable}
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
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.baseName"
              defaultMessage="Base Name"
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'dataSetInformation', 'name', 'baseName']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.baseName"
                defaultMessage="Base Name"
              />
            }
            rules={StringMultiLang_r}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.classification"
              defaultMessage="Classification"
            />
          }
        >
          <LevelTextItemForm
            name={[
              'processInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            lang={lang}
            dataType={'Process'}
            formRef={formRef}
            onData={onData}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.generalComment"
              defaultMessage="General Comment"
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.generalComment"
                defaultMessage="General Comment"
              />
            }
            rules={StringMultiLang_o}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.time"
              defaultMessage="Time"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.referenceYear"
                defaultMessage="Reference Year"
              />
            }
            name={['processInformation', 'time', 'common:referenceYear']}
            rules={[
              {
                required: true,
                message: 'Please enter a year',
              },
              {
                pattern: /^[0-9]{4}$/,
                message: 'Please enter a valid year (e.g., 2023)',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.timeRepresentativenessDescription"
              defaultMessage="Time Representativeness Description"
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'time', 'common:timeRepresentativenessDescription']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.timeRepresentativenessDescription"
                defaultMessage="Time Representativeness Description"
              />
            }
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.Geography:locationOfOperationSupplyOrProduction"
              defaultMessage="Geography: Location Of Operation Supply Or Production"
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.location"
                defaultMessage="Location"
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
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.descriptionOfRestrictions"
              defaultMessage="Description Of Restrictions"
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
                id="pages.process.view.processInformation.descriptionOfRestrictions"
                defaultMessage="Description Of Restrictions"
              />
            }
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.technology"
              defaultMessage="Technology"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses"
              defaultMessage="Technology Description And Included Processes"
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'technology', 'technologyDescriptionAndIncludedProcesses']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses"
                defaultMessage="Technology Description And Included Processes"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.technologicalApplicability"
              defaultMessage="Technological Applicability"
            />
          </Divider>
          <LangTextItemForm
            name={['processInformation', 'technology', 'technologicalApplicability']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.technologicalApplicability"
                defaultMessage="Technological Applicability"
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
                id="pages.process.view.processInformation.referenceToTechnologyFlowDiagrammOrPicture"
                defaultMessage="Reference To Technology Flow Diagramm Or Picture"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.processInformation.mathematicalRelations:ModelDescription"
              defaultMessage="Mathematical Relations: Model Description"
            />
          }
        >
          <LangTextItemForm
            name={['processInformation', 'mathematicalRelations', 'modelDescription']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.modelDescription"
                defaultMessage="model Description"
              />
            }
          />
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.lCIMethodAndAllocation"
              defaultMessage="LCI Method And Allocation"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.typeOfDataSet"
                defaultMessage="Type Of Data Set"
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet']}
          >
            <Select options={processTypeOptions} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.lCIMethodPrinciple"
                defaultMessage="LCI Method Principle"
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodPrinciple']}
          >
            <Select options={LCIMethodPrincipleOptions} />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple"
              defaultMessage="Deviations From LCI Method Principle"
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
                id="pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple"
                defaultMessage="Deviations From LCI Method Principle"
              />
            }
          />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.lCIMethodApproaches"
                defaultMessage="LCI Method Approaches"
              />
            }
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodApproaches']}
          >
            <Select options={LCIMethodApproachOptions} />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.DeviationsFromLCIMethodApproaches"
              defaultMessage="Deviations From LCI Method Approaches"
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
                id="pages.process.view.modellingAndValidation.DeviationsFromLCIMethodApproaches"
                defaultMessage="Deviations From LCI Method Approaches"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromModellingConstants"
              defaultMessage="Deviations From Modelling Constants"
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
                id="pages.process.view.modellingAndValidation.deviationsFromModellingConstants"
                defaultMessage="Deviations From Modelling Constants"
              />
            }
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness"
              defaultMessage="Data Sources Treatment And Representativeness"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples"
              defaultMessage="Deviations From Cut Off And Completeness Principles"
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
                id="pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples"
                defaultMessage="Deviations From Cut Off And Completeness Principles"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples"
              defaultMessage="Data Selection And Combination Principles"
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
                id="pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples"
                defaultMessage="Data Selection And Combination Principles"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples"
              defaultMessage="Deviations From Selection And Combination Principles"
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
                id="pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples"
                defaultMessage="Deviations From Selection And Combination Principles"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples"
              defaultMessage="Data Treatment And Extrapolations Principles"
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
                id="pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples"
                defaultMessage="Data Treatment And Extrapolations Principles"
              />
            }
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples"
              defaultMessage="Deviations From Treatment And Extrapolation Principles"
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
                id="pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples"
                defaultMessage="Deviations From Treatment And Extrapolation Principles"
              />
            }
          />

          <SourceSelectForm
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'referenceToDataSource',
            ]}
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.referenceToDataSource"
                defaultMessage="Reference To Data Source"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />

          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.useAdviceForDataSet"
              defaultMessage="Use Advice For DataSet"
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
                id="pages.process.view.modellingAndValidation.useAdviceForDataSet"
                defaultMessage="Use Advice For DataSet"
              />
            }
          />
        </Card>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.process.view.modellingAndValidation.completeness:CompletenessDescription"
            defaultMessage="Completeness: Completeness Description"
          />
        </Divider>
        <LangTextItemForm
          name={['modellingAndValidation', 'completeness', 'completenessDescription']}
          label={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.completenessDescription"
              defaultMessage="Completeness Description"
            />
          }
        />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.validation:Review"
              defaultMessage="Validation: Review"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.type"
                defaultMessage="Type"
              />
            }
            name={['modellingAndValidation', 'validation', 'review', '@type']}
          >
            <Select options={reviewTypeOptions} />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.reviewDetails"
              defaultMessage="Review Details"
            />
          </Divider>
          <LangTextItemForm
            name={['modellingAndValidation', 'validation', 'review', 'common:reviewDetails']}
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.reviewDetails"
                defaultMessage="Review Details"
              />
            }
          />

          <ContactSelectForm
            name={[
              'modellingAndValidation',
              'validation',
              'review',
              'common:referenceToNameOfReviewerAndInstitution',
            ]}
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.referenceToNameOfReviewerAndInstitution"
                defaultMessage="Reference To Name Of Reviewer And Institution"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <ContactSelectForm
          name={[
            'administrativeInformation',
            'dataGenerator',
            'common:referenceToPersonOrEntityGeneratingTheDataSet',
          ]}
          label={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.dataGenerator:RreferenceToPersonOrEntityGeneratingTheDataSet"
              defaultMessage="Data Generator: Rreference To Person Or Entity Generating The Data Set"
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />

        <Form.Item
          label={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.dataEntryBy:TimeStamp"
              defaultMessage="Data Entry By: Time Stamp"
            />
          }
          name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
        >
          <Input disabled={true} style={{ color: '#000' }} />
        </Form.Item>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.dateOfLastRevision"
                defaultMessage="Date Of Last Revision"
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
                id="pages.process.view.administrativeInformation.dataSetVersion"
                defaultMessage="Data Set Version"
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
                id="pages.process.view.administrativeInformation.permanentDataSetURI"
                defaultMessage="Permanent Data Set URI"
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
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            label={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.referenceToOwnershipOfDataSet"
                defaultMessage="Reference To Ownership Of Data Set"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />

          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.copyright"
                defaultMessage="Copyright"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
          >
            <Select options={copyrightOptions} />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id="pages.process.view.administrativeInformation.licenseType"
                defaultMessage="License Type"
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
      <ProTable<ProcessExchangeTable, ListPagination>
        actionRef={actionRefExchangeTable}
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<ProcessExchangeCreate key={0} lang={lang} onData={onExchangeDataCreate} />];
        }}
        dataSource={genProcessExchangeTableData(exchangeDataSource, lang)}
        columns={processExchangeColumns}
      />
    ),
  };

  return (
    <>
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {tabContent[activeTabKey]}
      </Card>
      <Form.Item name="id" hidden>
        <Input />
      </Form.Item>
    </>
  );
};
