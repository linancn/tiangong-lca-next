import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import { CASNumber, dataSetVersion, StringMultiLang_r } from '@/components/Validator/index';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { complianceOptions, FlowpropertyTabTable } from '@/services/flows/data';
import { genFlowPropertyTabTableData } from '@/services/flows/util';
import { ListPagination } from '@/services/general/data';
import { CheckCircleTwoTone, CloseCircleOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import { Card, Form, Input, Select, Space } from 'antd';
import type { FC } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { flowTypeOptions } from './optiondata';
import PropertyCreate from './Property/create';
import PropertyDelete from './Property/delete';
import PropertyEdit from './Property/edit';
import PropertyView from './Property/view';

type Props = {
  lang: string;
  activeTabKey: string;
  drawerVisible: boolean;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  flowType: string | undefined;
  propertyDataSource: FlowpropertyTabTable[];
  onPropertyData: (data: any) => void;
  onPropertyDataCreate: (data: any) => void;
  onTabChange: (key: string) => void;
};
export const FlowForm: FC<Props> = ({
  lang,
  activeTabKey,
  drawerVisible,
  formRef,
  onData,
  flowType,
  propertyDataSource,
  onPropertyData,
  onPropertyDataCreate,
  onTabChange,
}) => {
  const [thisFlowType, setThisFlowType] = useState<string | undefined>(flowType);
  const actionRefPropertyTable = useRef<ActionType>();

  const tabList = [
    {
      key: 'flowInformation',
      tab: (
        <FormattedMessage id="pages.flow.view.flowInformation" defaultMessage="Flow Information" />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
    {
      key: 'flowProperties',
      tab: <FormattedMessage id="pages.flow.view.flowProperty" defaultMessage="Flow Property" />,
    },
  ];

  const propertyColumns: ProColumns<FlowpropertyTabTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.flow.flowProperties.referenceToFlowDataSet" defaultMessage="Reference" />,
      dataIndex: 'referenceToFlowPropertyDataSet',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.flow.view.flowProperties.meanValue" defaultMessage="Mean Value" />
      ),
      dataIndex: 'meanValue',
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
          <ReferenceUnit key={0} id={row.referenceToFlowPropertyDataSetId} idType={'flowproperty'} lang={lang} />,
        ];
      },
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
            <PropertyView
              id={row.dataSetInternalID}
              data={propertyDataSource}
              lang={lang}
              buttonType={'icon'}
            />
            <PropertyEdit
              id={row.dataSetInternalID}
              data={propertyDataSource}
              lang={lang}
              buttonType={'icon'}
              actionRef={actionRefPropertyTable}
              onData={onPropertyData}
              setViewDrawerVisible={() => { }}
            />
            <PropertyDelete
              id={row.dataSetInternalID}
              data={propertyDataSource}
              buttonType={'icon'}
              actionRef={actionRefPropertyTable}
              setViewDrawerVisible={() => { }}
              onData={onPropertyData}
            />
          </Space>,
        ];
      },
    },
  ];

  const tabContent: { [key: string]: JSX.Element } = {
    flowInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* <Card size="small" title={'Data Set Information'}> */}
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.baseName"
              defaultMessage="Base Name"
            />
          }
        >
          <LangTextItemForm
            name={['flowInformation', 'dataSetInformation', 'name', 'baseName']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.baseName"
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
              id="pages.flow.view.flowInformation.synonyms"
              defaultMessage="Synonyms"
            />
          }
        >
          <LangTextItemForm
            name={['flowInformation', 'dataSetInformation', 'common:synonyms']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.synonyms"
                defaultMessage="Synonyms"
              />
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.typeAndClassificationOfDataSet"
              defaultMessage="Type and Classification of Data Set"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.modellingAndValidation.typeOfDataSet"
                defaultMessage="Type Of Data Set"
              />
            }
            name={['flowInformation', 'LCIMethod', 'typeOfDataSet']}
          >
            <Select
              options={flowTypeOptions}
              onChange={(value) => {
                if (flowType === 'Elementary flow' || value === 'Elementary flow') {
                  const nameList = [
                    'flowInformation',
                    'dataSetInformation',
                    'classificationInformation',
                    'common:elementaryFlowCategorization',
                    'common:category',
                  ];
                  formRef.current?.setFieldValue([...nameList, '@level_0'], null);
                  formRef.current?.setFieldValue([...nameList, '@level_1'], null);
                  formRef.current?.setFieldValue([...nameList, '@level_2'], null);
                  formRef.current?.setFieldValue([...nameList, '@catId_0'], null);
                  formRef.current?.setFieldValue([...nameList, '@catId_1'], null);
                  formRef.current?.setFieldValue([...nameList, '@catId_2'], null);
                }
                setThisFlowType(value);
              }}
            />
          </Form.Item>

          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.flow.view.flowInformation.classification"
                defaultMessage="Classification"
              />
            }
          >
            <LevelTextItemForm
              dataType={'Flow'}
              lang={lang}
              flowType={thisFlowType}
              formRef={formRef}
              onData={onData}
              name={[
                'flowInformation',
                'dataSetInformation',
                'classificationInformation',
                'common:elementaryFlowCategorization',
                'common:category',
              ]}
            />
          </Card>
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowInformation.cASNumber"
              defaultMessage="CAS Number"
            />
          }
          name={['flowInformation', 'dataSetInformation', 'CASNumber']}
          rules={CASNumber}
        >
          <Input />
        </Form.Item>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.generalComment"
              defaultMessage="General Comment"
            />
          }
        >
          <LangTextItemForm
            name={['flowInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.generalComment"
                defaultMessage="General Comment"
              />
            }
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowInformation.eCNumber"
              defaultMessage="EC Number"
            />
          }
          name={['flowInformation', 'dataSetInformation', 'common:other', 'ecn:ECNumber']}
        >
          <Input />
        </Form.Item>
        {/* </Card> */}
        {/* <br />
                    <Card size="small" title={'Quantitative Reference'}>
                        <Form.Item label='Reference To Reference Flow Property' name={['flowInformation', 'quantitativeReference', 'referenceToReferenceFlowProperty']}>
                            <Input />
                        </Form.Item>
                    </Card> */}
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* <Card size="small" title={'LCI Method'}>
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.modellingAndValidation.lCIMethod:TypeOfDataSet"
                defaultMessage="LCI Method: Type Of Data Set"
              />
            }
            name={['modellingAndValidation', 'LCIMethod', 'typeOfDataSet']}
          >
            <Select options={flowTypeOptions} />
          </Form.Item>
        </Card>
        <br /> */}
        {/* <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.modellingAndValidation.complianceDeclarations"
              defaultMessage="Compliance Declarations"
            />
          }
        > */}
        <SourceSelectForm
          lang={lang}
          formRef={formRef}
          label={
            <FormattedMessage
              id="pages.flow.view.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference To Compliance System"
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
              id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval Of Overall Compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Select options={complianceOptions} />
        </Form.Item>
        {/* </Card> */}
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.timeStamp"
                defaultMessage="Time Stamp"
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
                id="pages.flow.view.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            onData={onData}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.dataSetVersion"
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
                id="pages.flow.view.administrativeInformation.permanentDataSetURI"
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
        </Card>
      </Space>
    ),
    flowProperties: (
      <ProTable<FlowpropertyTabTable, ListPagination>
        actionRef={actionRefPropertyTable}
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<PropertyCreate key={0} lang={lang} onData={onPropertyDataCreate} />];
        }}
        dataSource={genFlowPropertyTabTableData(propertyDataSource, lang)}
        columns={propertyColumns}
      />
    ),
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setThisFlowType(flowType);
  }, [flowType]);

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
