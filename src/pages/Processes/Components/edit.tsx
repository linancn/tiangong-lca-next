import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import YearInput from '@/components/YearInput';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import {
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  ProcessExchangeTable,
  processTypeOptions,
  reviewTypeOptions,
} from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { ProColumns, ProForm, ProTable } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeCreate from './Exchange/create';
import ProcessExchangeDelete from './Exchange/delete';
import ProcessExchangeEdit from './Exchange/edit';
import ProcessExchangeView from './Exchange/view';

type Props = {
  id: string;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ProcessEdit: FC<Props> = ({ id, lang, buttonType, actionRef, setViewDrawerVisible }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);

  const actionRefExchangeTable = useRef<ActionType>();

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const handletExchangeDataCreate = (data: any) => {
    setExchangeDataSource([
      ...exchangeDataSource,
      { ...data, '@dataSetInternalID': exchangeDataSource.length.toString() },
    ]);
  };

  const handletExchangeData = (data: any) => {
    setExchangeDataSource([...data]);
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
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
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
              onData={handletExchangeData}
              setViewDrawerVisible={() => {}}
            />
            <ProcessExchangeDelete
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              actionRef={actionRef}
              setViewDrawerVisible={() => {}}
              onData={handletExchangeData}
            />
          </Space>,
        ];
      },
    },
  ];

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

  const contentList: Record<string, React.ReactNode> = {
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
          <LangTextItemFrom
            name={['processInformation', 'dataSetInformation', 'name', 'baseName']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.baseName"
                defaultMessage="Base Name"
              />
            }
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
          <LevelTextItemFrom
            name={[
              'processInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            dataType={'Process'}
            formRef={formRefEdit}
            onData={handletFromData}
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
          <LangTextItemFrom
            name={['processInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.generalComment"
                defaultMessage="General Comment"
              />
            }
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
          >
            <YearInput
              initValue={initData?.processInformation?.time?.['common:referenceYear'] ?? ''}
            />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.timeRepresentativenessDescription"
              defaultMessage="Time Representativeness Description"
            />
          </Divider>
          <LangTextItemFrom
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
          <Form.Item
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
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.processInformation.descriptionOfRestrictions"
              defaultMessage="Description Of Restrictions"
            />
          </Divider>
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
            name={['processInformation', 'technology', 'technologicalApplicability']}
            label={
              <FormattedMessage
                id="pages.process.view.processInformation.technologicalApplicability"
                defaultMessage="Technological Applicability"
              />
            }
          />

          <SourceSelectFrom
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
            formRef={formRefEdit}
            onData={handletFromData}
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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
          <LangTextItemFrom
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

          <SourceSelectFrom
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
            formRef={formRefEdit}
            onData={handletFromData}
          />

          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.modellingAndValidation.useAdviceForDataSet"
              defaultMessage="Use Advice For DataSet"
            />
          </Divider>
          <LangTextItemFrom
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
        <LangTextItemFrom
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
          <LangTextItemFrom
            name={['modellingAndValidation', 'validation', 'review', 'common:reviewDetails']}
            label={
              <FormattedMessage
                id="pages.process.view.modellingAndValidation.reviewDetails"
                defaultMessage="Review Details"
              />
            }
          />

          <ContactSelectFrom
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
            formRef={formRefEdit}
            onData={handletFromData}
          />
        </Card>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <ContactSelectFrom
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
          formRef={formRefEdit}
          onData={handletFromData}
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

          <ContactSelectFrom
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
            formRef={formRefEdit}
            onData={handletFromData}
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
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<ProcessExchangeCreate key={0} lang={lang} onData={handletExchangeDataCreate} />];
        }}
        dataSource={genProcessExchangeTableData(exchangeDataSource, lang)}
        columns={processExchangeColumns}
      />
    ),
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getProcessDetail(id).then(async (result) => {
      formRefEdit.current?.setFieldsValue({
        ...genProcessFromData(result.data?.json?.processDataSet ?? {}),
        id: id,
      });
      const quantitativeReferenceId =
        result.data?.json?.processDataSet?.processInformation?.quantitativeReference
          ?.referenceToReferenceFlow ?? '';
      setExchangeDataSource(
        (
          genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []
        ).map((item: any) => {
          if (item['@dataSetInternalID'] === quantitativeReferenceId) {
            return {
              ...item,
              quantitativeReference: true,
            };
          } else {
            return {
              ...item,
              quantitativeReference: false,
            };
          }
        }),
      );
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      setInitData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}), id: id });
      setFromData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}), id: id });
      setExchangeDataSource(
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? [],
      );
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genProcessFromData(result.data?.json?.processDataSet ?? {}),
        id: id,
      });
      setSpinning(false);
    });
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({
      ...fromData,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
    });
  }, [exchangeDataSource]);

  // useEffect(() => {
  //   if (activeTabKey === 'exchanges') return;
  //   setFromData({
  //     ...fromData,
  //     [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
  //   });
  // }, [formRefEdit.current?.getFieldsValue()]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.process.drawer.title.edit" defaultMessage="Edit Process" />
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefEdit}
            initialValues={initData}
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              setSpinning(true);
              const updateResult = await updateProcess({
                ...fromData,
                id: id,
                exchanges: { exchange: [...exchangeDataSource] },
              });
              if (updateResult?.data) {
                message.success(
                  <FormattedMessage
                    id="options.createsuccess"
                    defaultMessage="Created Successfully!"
                  />,
                );
                setSpinning(false);
                setDrawerVisible(false);
                setViewDrawerVisible(false);
                actionRef.current?.reload();
              } else {
                setSpinning(false);
                message.error(updateResult?.error?.message);
              }
              return true;
            }}
          >
            <Card
              style={{ width: '100%' }}
              tabList={tabList}
              activeTabKey={activeTabKey}
              onTabChange={onTabChange}
            >
              {contentList[activeTabKey]}
            </Card>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </ProForm>
          <Collapse
            items={[
              {
                key: '1',
                label: 'JSON Data',
                children: (
                  <Typography>
                    <pre>{JSON.stringify(fromData, null, 2)}</pre>
                    <pre>
                      {JSON.stringify(
                        {
                          exchanges: {
                            exchange: [...exchangeDataSource],
                          },
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </Typography>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessEdit;
