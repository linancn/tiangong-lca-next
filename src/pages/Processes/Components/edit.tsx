import LangTextItemFrom from '@/components/LangTextItem/from';
import { ListPagination } from '@/services/general/data';
import { getProcessDetail } from '@/services/processes/api';
import { ProcessExchangeTable } from '@/services/processes/data';
import { genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProColumns, ProForm, ProTable } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Card, Divider, Drawer, Form, Input, Space, Spin, Tooltip, Typography } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ProcessExchangeCreate from './Exchange/create';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ProcessEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);

  const handletExchangeData = (data: any) => {
    setExchangeDataSource([...exchangeDataSource, data]);
  };

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
            keyName={['processInformation', 'dataSetInformation', 'name', 'baseName']}
            labelName="Base Name"
          />
        </Card>

        <Card size="small" title={'General Comment'}>
          <LangTextItemFrom
            keyName={['processInformation', 'classificationInformation', 'common:generalComment']}
            labelName="General Comment"
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
            keyName={['processInformation', 'quantitativeReference', 'functionalUnitOrOther']}
            labelName="Functional Unit Or Other"
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
            keyName={['processInformation', 'time', 'common:timeRepresentativenessDescription']}
            labelName="Time Representativeness Description"
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
            keyName={[
              'processInformation',
              'locationOfOperationSupplyOrProduction',
              'descriptionOfRestrictions',
            ]}
            labelName="Description Of Restrictions"
          />
        </Card>

        <Card size="small" title={'Technology'}>
          <Divider orientationMargin="0" orientation="left" plain>
            Technology Description And Included Processes
          </Divider>
          <LangTextItemFrom
            keyName={[
              'processInformation',
              'technology',
              'technologyDescriptionAndIncludedProcesses',
            ]}
            labelName="Technology Description And Included Processes"
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Technological Applicability
          </Divider>
          <LangTextItemFrom
            keyName={['processInformation', 'technology', 'technologicalApplicability']}
            labelName="Technological Applicability"
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
              keyName={[
                'processInformation',
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
            keyName={['processInformation', 'mathematicalRelations', 'modelDescription']}
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
          <Card size="small" title={'Reference To Data Source'}>
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
        <Divider orientationMargin="0" orientation="left" plain>
          Completeness: Completeness Description
        </Divider>
        <LangTextItemFrom
          keyName={['completeness', 'completenessDescription']}
          labelName="Completeness Description"
        />
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

          <Card size="small" title={'Reference To Name Of Reviewer And Institution'}>
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

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getProcessDetail(id).then(async (result) => {
      formRefEdit.current?.setFieldsValue(
        genProcessFromData(result.data?.json?.processDataSet ?? {}),
      );
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (drawerVisible) return;
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      setInitData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}) });
      setFromData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}) });
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue(
        genProcessFromData(result.data?.json?.processDataSet ?? {}),
      );
      setSpinning(false);
    });
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="options.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}
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
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="options.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefEdit}
            initialValues={initData}
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues ?? {} });
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              // const result = await createProcess({ ...fromData });
              // if (result.data) {
              //   message.success(
              //     <FormattedMessage
              //       id="options.createsuccess"
              //       defaultMessage="Created Successfully!"
              //     />,
              //   );
              //   formRefCreate.current?.resetFields();
              //   setDrawerVisible(false);
              //   reload();
              // } else {
              //   message.error(result.error.message);
              // }
              formRefEdit.current?.resetFields();
              setDrawerVisible(false);
              reload();
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
          </ProForm>
          <Typography>
            <pre>{JSON.stringify(fromData, null, 2)}</pre>
          </Typography>
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessEdit;
