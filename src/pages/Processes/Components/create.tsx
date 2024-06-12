import LangTextItemFrom from '@/components/LangTextItem/from';
import { ListPagination } from '@/services/general/data';
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
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

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
          <LangTextItemFrom keyName="baseName" labelName="Base Name" />
        </Card>

        <Card size="small" title={'General Comment'}>
          <LangTextItemFrom keyName="common:generalComment" labelName="General Comment" />
        </Card>

        <Card size="small" title={'Classification'}>
          <Space>
            <Form.Item name={['common:class', '@level_0']}>
              <Input placeholder="Level 1" />
            </Form.Item>
            <Form.Item name={['common:class', '@level_1']}>
              <Input placeholder="Level 2" />
            </Form.Item>
            <Form.Item name={['common:class', '@level_2']}>
              <Input placeholder="Level 3" />
            </Form.Item>
          </Space>
        </Card>

        <Card size="small" title={'Quantitative Reference'}>
          <Form.Item label="Type" name={['quantitativeReference', '@type']}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Reference To Reference Flow"
            name={['quantitativeReference', 'referenceToReferenceFlow']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Functional Unit Or Other
          </Divider>
          <LangTextItemFrom
            keyName={['quantitativeReference', 'functionalUnitOrOther']}
            labelName="Functional Unit Or Other"
          />
        </Card>

        <Card size="small" title={'Time'}>
          <Form.Item label="Reference Year" name={['time', 'common:referenceYear']}>
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Time Representativeness Description
          </Divider>
          <LangTextItemFrom
            keyName={['time', 'common:timeRepresentativenessDescription']}
            labelName="Time Representativeness Description"
          />
        </Card>

        <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
          <Form.Item label="Location" name={['locationOfOperationSupplyOrProduction', '@location']}>
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Description Of Restrictions
          </Divider>
          <LangTextItemFrom
            keyName={['locationOfOperationSupplyOrProduction', 'descriptionOfRestrictions']}
            labelName="Description Of Restrictions"
          />
        </Card>

        <Card size="small" title={'Technology'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Technology Description And Included Processes
          </Divider>
          <LangTextItemFrom
            keyName={['technology', 'technologyDescriptionAndIncludedProcesses']}
            labelName="Technology Description And Included Processes"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Technological Applicability
          </Divider>
          <LangTextItemFrom
            keyName={['technology', 'technologicalApplicability']}
            labelName="Technological Applicability"
          />
          <Card size="small" title={'Reference To Technology Flow Diagramm Or Picture'}>
            <Form.Item
              label="Type"
              name={['technology', 'referenceToTechnologyFlowDiagrammOrPicture', '@type']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={['technology', 'referenceToTechnologyFlowDiagrammOrPicture', '@refObjectId']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={['technology', 'referenceToTechnologyFlowDiagrammOrPicture', '@uri']}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              keyName={[
                'technology',
                'referenceToTechnologyFlowDiagrammOrPicture',
                'common:shortDescription',
              ]}
              labelName="Short Description"
            />
          </Card>
        </Card>

        <Card size="small" title={'Mathematical Relations: Model Description'}>
          <LangTextItemFrom
            keyName={['mathematicalRelations', 'modelDescription']}
            labelName="Model Description"
          />
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={'LCI Method And Allocation'}>
          <Form.Item label="Type Of DataSet" name={['LCIMethodAndAllocation', 'typeOfDataSet']}>
            <Input />
          </Form.Item>
          <Form.Item
            label="LCI Method Principle"
            name={['LCIMethodAndAllocation', 'LCIMethodPrinciple']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Principle
          </Divider>
          <LangTextItemFrom
            keyName={['LCIMethodAndAllocation', 'deviationsFromLCIMethodPrinciple']}
            labelName="Deviations From LCI Method Principle"
          />
          <Form.Item
            label="LCI Method Approaches"
            name={['LCIMethodAndAllocation', 'LCIMethodApproaches']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From LCI Method Approaches
          </Divider>
          <LangTextItemFrom
            keyName={['LCIMethodAndAllocation', 'deviationsFromLCIMethodApproaches']}
            labelName="Deviations From LCI Method Approaches"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Modelling Constants
          </Divider>
          <LangTextItemFrom
            keyName={['LCIMethodAndAllocation', 'deviationsFromModellingConstants']}
            labelName="Deviations From Modelling Constants"
          />
        </Card>

        <Card size="small" title={'Data Sources Treatment And Representativeness'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Cut Off And Completeness Principles
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromCutOffAndCompletenessPrinciples',
            ]}
            labelName="Deviations From Cut Off And Completeness Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Selection And Combination Principles
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataSourcesTreatmentAndRepresentativeness',
              'dataSelectionAndCombinationPrinciples',
            ]}
            labelName="Data Selection And Combination Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Selection And Combination Principles
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromSelectionAndCombinationPrinciples',
            ]}
            labelName="Deviations From Selection And Combination Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Data Treatment And Extrapolations Principles
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataSourcesTreatmentAndRepresentativeness',
              'dataTreatmentAndExtrapolationsPrinciples',
            ]}
            labelName="Data Treatment And Extrapolations Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Deviations From Treatment And Extrapolation Principles
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataSourcesTreatmentAndRepresentativeness',
              'deviationsFromTreatmentAndExtrapolationPrinciples',
            ]}
            labelName="Deviations From Treatment And Extrapolation Principles"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Reference To DataSource
          </Divider>
          <Card size="small" title={'Reference To Technology Flow Diagramm Or Picture'}>
            <Form.Item
              label="Type"
              name={['dataSourcesTreatmentAndRepresentativeness', 'referenceToDataSource', '@type']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={['dataSourcesTreatmentAndRepresentativeness', 'referenceToDataSource', '@uri']}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              keyName={[
                'dataSourcesTreatmentAndRepresentativeness',
                'referenceToDataSource',
                'common:shortDescription',
              ]}
              labelName="Short Description"
            />
          </Card>

          <Divider orientationMargin="0" orientation="left" plain>
            Use Advice For DataSet
          </Divider>
          <LangTextItemFrom
            keyName={['dataSourcesTreatmentAndRepresentativeness', 'useAdviceForDataSet']}
            labelName="Use Advice For DataSet"
          />
        </Card>
        <Form.Item label="Completeness" name={'completeness'}>
          <Input />
        </Form.Item>
        <Card size="small" title={'Validation: Review'}>
          <Form.Item label="Type" name={['validation', 'review', '@type']}>
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Review Details
          </Divider>
          <LangTextItemFrom
            keyName={['validation', 'review', 'common:reviewDetails']}
            labelName="Review Details"
          />

          <Card size="small" title={'Reference To Technology Flow Diagramm Or Picture'}>
            <Form.Item
              label="Type"
              name={[
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
              keyName={[
                'validation',
                'review',
                'common:referenceToNameOfReviewerAndInstitution',
                'common:shortDescription',
              ]}
              labelName="Short Description"
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
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              '@refObjectId',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="URI"
            name={['dataGenerator', 'common:referenceToPersonOrEntityGeneratingTheDataSet', '@uri']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom
            keyName={[
              'dataGenerator',
              'common:referenceToPersonOrEntityGeneratingTheDataSet',
              'common:shortDescription',
            ]}
            labelName="Short Description"
          />
        </Card>

        <Form.Item label="Data Entry By: Time Stamp" name={['dataEntryBy', 'common:timeStamp']}>
          <Input />
        </Form.Item>

        <Card size="small" title={'Publication And Ownership'}>
          <Form.Item
            label="Date Of Last Revision"
            name={['publicationAndOwnership', 'common:dateOfLastRevision']}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Data Set Version"
            name={['publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Permanent Data Set URI"
            name={['publicationAndOwnership', 'common:permanentDataSetURI']}
          >
            <Input />
          </Form.Item>

          <Card size="small" title={'Reference To Ownership Of Data Set'}>
            <Form.Item
              label="Type"
              name={['publicationAndOwnership', 'common:referenceToOwnershipOfDataSet', '@type']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ref Object Id"
              name={[
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                '@refObjectId',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="URI"
              name={['publicationAndOwnership', 'common:referenceToOwnershipOfDataSet', '@uri']}
            >
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              keyName={[
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
                'common:shortDescription',
              ]}
              labelName="Short Description"
            />
          </Card>

          <Form.Item label="Copyright" name={['publicationAndOwnership', 'common:copyright']}>
            <Input />
          </Form.Item>

          <Form.Item label="License Type" name={['publicationAndOwnership', 'common:licenseType']}>
            <Input />
          </Form.Item>
        </Card>
      </Space>
    ),
    exchanges: (
      <ProTable<ProcessExchangeTable, ListPagination>
        actionRef={actionRef}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<ProcessExchangeCreate key={0} actionRef={actionRef} />];
        }}
        // request={async (
        //   params: {
        //     pageSize: number;
        //     current: number;
        //   },
        //   sort,
        // ) => {
        //   return getProcessTable(params, sort, lang, dataSource);
        // }}
        columns={processExchangeColumns}
      />
    ),
  };

  const onTabChange = (key: string) => {
    setFromData({ ...fromData, [activeTabKey]: formRefCreate.current?.getFieldsValue() });
    setActiveTabKey(key);
  };

  useEffect(() => {
    setFromData({ ...fromData, [activeTabKey]: formRefCreate.current?.getFieldsValue() });
  }, [drawerVisible, formRefCreate.current?.getFieldsValue()]);

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
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async (values) => {
            const result = await createProcess({ ...values });
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