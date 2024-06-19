import LangTextItemFrom from '@/components/LangTextItem/from';
import { ListPagination } from '@/services/general/data';
import { getLangText } from '@/services/general/util';
import { createProcess } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Divider,
  Drawer,
  Form,
  Input,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeCreate from './Exchange/create';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletExchangeData = (data: any) => {
    setExchangeDataSource([...exchangeDataSource, data]);
  };

  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    {
      title: <FormattedMessage id="processExchange.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="processExchange.exchangeDirection"
          defaultMessage="Exchange Direction"
        />
      ),
      dataIndex: 'exchangeDirection',
      sorter: true,
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
    },
    {
      title: <FormattedMessage id="processExchange.meanAmount" defaultMessage="Mean Amount" />,
      dataIndex: 'meanAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="processExchange.resultingAmount" defaultMessage="Resulting Amount" />
      ),
      dataIndex: 'resultingAmount',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="processExchange.generalComment" defaultMessage="General Comment" />
      ),
      dataIndex: 'generalComment',
      sorter: false,
      search: false,
      render: (_, row) => getLangText(row.generalComment ?? {}, lang),
    },
    {
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      // render: (_, row) => {
      //   if (dataSource === 'my') {
      //     return [
      //       // <Space size={'small'} key={0}>
      //       //   {/* <ContactView id={row.id} actionRef={actionRef} /> */}
      //       //   <ContactEdit
      //       //     id={row.id}
      //       //     buttonType={'icon'}
      //       //     actionRef={actionRef}
      //       //     setViewDrawerVisible={() => {}}
      //       //   />
      //       //   <ContactDelete
      //       //     id={row.id}
      //       //     buttonType={'icon'}
      //       //     actionRef={actionRef}
      //       //     setViewDrawerVisible={() => {}}
      //       //   />
      //       // </Space>,
      //     ];
      //   }
      //   return [
      //     <Space size={'small'} key={0}>
      //       {/* <ContactView id={row.id} actionRef={actionRef} /> */}
      //     </Space>,
      //   ];
      // },
    },
  ];

  const tabList = [
    { key: 'processInformation', tab: 'Process Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'exchanges', tab: 'Exchanges' },
  ];

  const contentList: Record<string, React.ReactNode> = {
    processInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={'Base Name'}>
          <LangTextItemFrom
            name={['processInformation', 'dataSetInformation', 'name', 'baseName']}
            label="Base Name"
          />
        </Card>

        <Card size="small" title={'General Comment'}>
          <LangTextItemFrom
            name={['processInformation', 'classificationInformation', 'common:generalComment']}
            label="General Comment"
          />
        </Card>

        <Card size="small" title={'Classification'}>
          <Space>
            <Form.Item
              name={[
                'processInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
                '@level_0',
              ]}
            >
              <Input placeholder="Level 1" />
            </Form.Item>
            <Form.Item
              name={[
                'processInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
                '@level_1',
              ]}
            >
              <Input placeholder="Level 2" />
            </Form.Item>
            <Form.Item
              name={[
                'processInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
                '@level_2',
              ]}
            >
              <Input placeholder="Level 3" />
            </Form.Item>
          </Space>
        </Card>

        <Card size="small" title={'Quantitative Reference'}>
          <Form.Item label="Type" name={['processInformation', 'quantitativeReference', '@type']}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Reference To Reference Flow"
            name={['processInformation', 'quantitativeReference', 'referenceToReferenceFlow']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Functional Unit Or Other
          </Divider>
          <LangTextItemFrom
            name={['processInformation', 'quantitativeReference', 'functionalUnitOrOther']}
            label="Functional Unit Or Other"
          />
        </Card>

        <Card size="small" title={'Time'}>
          <Form.Item
            label="Reference Year"
            name={['processInformation', 'time', 'common:referenceYear']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Time Representativeness Description
          </Divider>
          <LangTextItemFrom
            name={['processInformation', 'time', 'common:timeRepresentativenessDescription']}
            label="Time Representativeness Description"
          />
        </Card>

        <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
          <Form.Item
            label="Location"
            name={['processInformation', 'locationOfOperationSupplyOrProduction', '@location']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Description Of Restrictions
          </Divider>
          <LangTextItemFrom
            name={[
              'processInformation',
              'locationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            label="Description Of Restrictions"
          />
        </Card>

        <Card size="small" title={'Technology'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Technology Description And Included Processes
          </Divider>
          <LangTextItemFrom
            name={['processInformation', 'technology', 'technologyDescriptionAndIncludedProcesses']}
            label="Technology Description And Included Processes"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Technological Applicability
          </Divider>
          <LangTextItemFrom
            name={['processInformation', 'technology', 'technologicalApplicability']}
            label="Technological Applicability"
          />
          <Card size="small" title={'Reference To Technology Flow Diagramm Or Picture'}>
            <Form.Item
              label="Type"
              name={[
                'processInformation',
                'technology',
                'referenceToTechnologyFlowDiagrammOrPicture',
                '@type',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'processInformation',
                'technology',
                'referenceToTechnologyFlowDiagrammOrPicture',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={[
                'processInformation',
                'technology',
                'referenceToTechnologyFlowDiagrammOrPicture',
                '@uri',
              ]}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              name={[
                'processInformation',
                'technology',
                'referenceToTechnologyFlowDiagrammOrPicture',
                'common:shortDescription',
              ]}
              label="Short Description"
            />
          </Card>
        </Card>

        <Card size="small" title={'Mathematical Relations: Model Description'}>
          <LangTextItemFrom
            name={['processInformation', 'mathematicalRelations', 'modelDescription']}
            label="Model Description"
          />
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={'LCI Method And Allocation'}>
          <Form.Item
            label="Type Of DataSet"
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="LCI Method Principle"
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodPrinciple']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Principle
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromLCIMethodPrinciple',
            ]}
            label="Deviations From LCI Method Principle"
          />
          <Form.Item
            label="LCI Method Approaches"
            name={['modellingAndValidation', 'LCIMethodAndAllocation', 'LCIMethodApproaches']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Approaches
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromLCIMethodApproaches',
            ]}
            label="Deviations From LCI Method Approaches"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Modelling Constants
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'LCIMethodAndAllocation',
              'deviationsFromModellingConstants',
            ]}
            label="Deviations From Modelling Constants"
          />
        </Card>

        <Card size="small" title={'Data Sources Treatment And Representativeness'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Cut Off And Completeness Principles
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromCutOffAndCompletenessPrinciples',
            ]}
            label="Deviations From Cut Off And Completeness Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Selection And Combination Principles
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataSelectionAndCombinationPrinciples',
            ]}
            label="Data Selection And Combination Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Selection And Combination Principles
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromSelectionAndCombinationPrinciples',
            ]}
            label="Deviations From Selection And Combination Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Treatment And Extrapolations Principles
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'dataTreatmentAndExtrapolationsPrinciples',
            ]}
            label="Data Treatment And Extrapolations Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Treatment And Extrapolation Principles
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromTreatmentAndExtrapolationPrinciples',
            ]}
            label="Deviations From Treatment And Extrapolation Principles"
          />
          <Card size="small" title={'Reference To Data Source'}>
            <Form.Item
              label="Type"
              name={[
                'modellingAndValidation',
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                '@type',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'modellingAndValidation',
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={[
                'modellingAndValidation',
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                '@uri',
              ]}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              name={[
                'modellingAndValidation',
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                'common:shortDescription',
              ]}
              label="Short Description"
            />
          </Card>

          <Divider orientationMargin="0" orientation="left" plain>
            Use Advice For DataSet
          </Divider>
          <LangTextItemFrom
            name={[
              'modellingAndValidation',
              'dataSourcesTreatmentAndRepresentativeness',
              'useAdviceForDataSet',
            ]}
            label="Use Advice For DataSet"
          />
        </Card>
        <Divider orientationMargin="0" orientation="left" plain>
          Completeness: Completeness Description
        </Divider>
        <LangTextItemFrom
          name={['modellingAndValidation', 'completeness', 'completenessDescription']}
          label="Completeness Description"
        />
        <Card size="small" title={'Validation: Review'}>
          <Form.Item label="Type" name={['validation', 'review', '@type']}>
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Review Details
          </Divider>
          <LangTextItemFrom
            name={['modellingAndValidation', 'validation', 'review', 'common:reviewDetails']}
            label="Review Details"
          />

          <Card size="small" title={'Reference To Name Of Reviewer And Institution'}>
            <Form.Item
              label="Type"
              name={[
                'modellingAndValidation',
                'validation',
                'review',
                'common:referenceToNameOfReviewerAndInstitution',
                '@type',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'modellingAndValidation',
                'validation',
                'review',
                'common:referenceToNameOfReviewerAndInstitution',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={[
                'modellingAndValidation',
                'validation',
                'review',
                'common:referenceToNameOfReviewerAndInstitution',
                '@uri',
              ]}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              name={[
                'modellingAndValidation',
                'validation',
                'review',
                'common:referenceToNameOfReviewerAndInstitution',
                'common:shortDescription',
              ]}
              label="Short Description"
            />
          </Card>
        </Card>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={'Data Generator: Reference To Person Or Entity Generating The DataSet'}
        >
          <Form.Item
            label="Type"
            name={[
              'administrativeInformation',
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              '@type',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Ref Object Id"
            name={[
              'administrativeInformation',
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              '@refObjectId',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="URI"
            name={[
              'administrativeInformation',
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              '@uri',
            ]}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom
            name={[
              'administrativeInformation',
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              'common:shortDescription',
            ]}
            label="Short Description"
          />
        </Card>

        <Form.Item label="Data Entry By: Time Stamp" name={['dataEntryBy', 'common:timeStamp']}>
          <Input />
        </Form.Item>

        <Card size="small" title={'Publication And Ownership'}>
          <Form.Item
            label="Date Of Last Revision"
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:dateOfLastRevision',
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Data Set Version"
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Permanent Data Set URI"
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
          >
            <Input />
          </Form.Item>

          <Card size="small" title={'Reference To Ownership Of Data Set'}>
            <Form.Item
              label="Type"
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                '@type',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                '@uri',
              ]}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                'common:shortDescription',
              ]}
              label="Short Description"
            />
          </Card>

          <Form.Item
            label="Copyright"
            name={['administrativeInformation', 'publicationAndOwnership', 'common:copyright']}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="License Type"
            name={['administrativeInformation', 'publicationAndOwnership', 'common:licenseType']}
          >
            <Input />
          </Form.Item>
        </Card>
      </Space>
    ),
    exchanges: (
      <ProTable<ProcessExchangeTable, ListPagination>
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<ProcessExchangeCreate key={0} onData={handletExchangeData} />];
        }}
        dataSource={exchangeDataSource}
        columns={processExchangeColumns}
      />
    ),
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  useEffect(() => {
    setFromData({ ...fromData, exchanges: { exchange: exchangeDataSource } });
  }, [exchangeDataSource]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="processes.create" defaultMessage="Process Create" />}
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            const result = await createProcess({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <Card
            style={{ width: '100%' }}
            // title="Card title"
            // extra={<a href="#">More</a>}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
          <Form.Item noStyle shouldUpdate>
            {() => (
              <Typography>
                <pre>{JSON.stringify(fromData, null, 2)}</pre>
              </Typography>
            )}
          </Form.Item>
        </ProForm>
      </Drawer>
    </>
  );
};

export default ProcessCreate;
