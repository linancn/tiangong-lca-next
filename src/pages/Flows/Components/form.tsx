import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import LocationTextItemForm from '@/components/LocationTextItem/form';
import {
  CASNumber,
  dataSetVersion,
  StringMultiLang_o,
  StringMultiLang_r,
} from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { FlowpropertyTabTable } from '@/services/flows/data';
import { genFlowPropertyTabTableData } from '@/services/flows/util';
import { ListPagination } from '@/services/general/data';
import { CheckCircleOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProFormInstance, ProTable } from '@ant-design/pro-components';
import { Card, Divider, Form, Input, Select, Space, theme } from 'antd';
import type { FC } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { complianceOptions, myFlowTypeOptions } from './optiondata';
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
  const { token } = theme.useToken();
  const tabList = [
    {
      key: 'flowInformation',
      tab: (
        <FormattedMessage id="pages.flow.view.flowInformation" defaultMessage="Flow information" />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.modellingAndValidation"
          defaultMessage="Modelling and validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.administrativeInformation"
          defaultMessage="Administrative information"
        />
      ),
    },
    {
      key: 'flowProperties',
      tab: <FormattedMessage id="pages.flow.view.flowProperty" defaultMessage="Flow property" />,
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
      title: (
        <FormattedMessage
          id="pages.flow.view.flowProperties.referenceToFlowPropertyDataSet"
          defaultMessage="Flow property"
        />
      ),
      dataIndex: 'referenceToFlowPropertyDataSet',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'referenceToFlowPropertyDataSetVersion',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.flow.view.flowProperties.meanValue"
          defaultMessage="Mean value (of flow property)"
        />
      ),
      dataIndex: 'meanValue',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference unit"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit
            key={0}
            id={row.referenceToFlowPropertyDataSetId}
            version={row.referenceToFlowPropertyDataSetVersion}
            idType={'flowproperty'}
            lang={lang}
          />,
        ];
      },
    },
    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.quantitativeReference"
          defaultMessage="Quantitative reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return <CheckCircleOutlined />;
        }
        // return <CloseCircleOutlined />;
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
              setViewDrawerVisible={() => {}}
            />
            <PropertyDelete
              id={row.dataSetInternalID}
              data={propertyDataSource}
              buttonType={'icon'}
              actionRef={actionRefPropertyTable}
              setViewDrawerVisible={() => {}}
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
            <FormattedMessage id="pages.lifeCycleModel.information.name" defaultMessage="Name" />
          }
        >
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.flow.view.flowInformation.baseName"
                defaultMessage="Base name"
              />
            }
          >
            <LangTextItemForm
              name={['flowInformation', 'dataSetInformation', 'name', 'baseName']}
              label={
                <FormattedMessage
                  id="pages.flow.view.flowInformation.baseName"
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
                id="pages.flow.view.flowInformation.treatmentStandardsRoutes"
                defaultMessage="Treatment, standards, routes"
              />
            }
          >
            <LangTextItemForm
              name={['flowInformation', 'dataSetInformation', 'name', 'treatmentStandardsRoutes']}
              label={
                <FormattedMessage
                  id="pages.flow.view.flowInformation.treatmentStandardsRoutes"
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
                id="pages.flow.view.flowInformation.mixAndLocationTypes"
                defaultMessage="Mix and location types"
              />
            }
          >
            <LangTextItemForm
              name={['flowInformation', 'dataSetInformation', 'name', 'mixAndLocationTypes']}
              label={
                <FormattedMessage
                  id="pages.flow.view.flowInformation.mixAndLocationTypes"
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
                id="pages.flow.view.flowInformation.flowProperties"
                defaultMessage="Quantitative flow properties"
              />
            }
          >
            <LangTextItemForm
              name={['flowInformation', 'dataSetInformation', 'name', 'flowProperties']}
              label={
                <FormattedMessage
                  id="pages.flow.view.flowInformation.flowProperties"
                  defaultMessage="Quantitative flow properties"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
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
              id="pages.flow.view.flowInformation.classificationInformation"
              defaultMessage="Category and classification information"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.modellingAndValidation.typeOfDataSet"
                defaultMessage="Type of flow"
              />
            }
            name={['flowInformation', 'LCIMethod', 'typeOfDataSet']}
          >
            <Select
              options={myFlowTypeOptions}
              onChange={(value) => {
                if (thisFlowType === 'Elementary flow' || value === 'Elementary flow') {
                  const nameElementaryFlow = [
                    'flowInformation',
                    'dataSetInformation',
                    'classificationInformation',
                    'common:elementaryFlowCategorization',
                    'common:category',
                  ];
                  const nameFlow = [
                    'flowInformation',
                    'dataSetInformation',
                    'classificationInformation',
                    'common:classification',
                    'common:class',
                  ];
                  formRef.current?.setFieldValue([...nameElementaryFlow], null);
                  formRef.current?.setFieldValue([...nameFlow], null);
                }
                setThisFlowType(value);
              }}
            />
          </Form.Item>
          <br />
          <LevelTextItemForm
            hidden={thisFlowType !== 'Elementary flow'}
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
          <LevelTextItemForm
            hidden={thisFlowType === 'Elementary flow'}
            dataType={'Flow'}
            lang={lang}
            flowType={thisFlowType}
            formRef={formRef}
            onData={onData}
            name={[
              'flowInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowInformation.CASNumber"
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
              defaultMessage="General comment on data set"
            />
          }
        >
          <LangTextItemForm
            name={['flowInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.generalComment"
                defaultMessage="General comment on data set"
              />
            }
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowInformation.ECNumber"
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
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.geography"
              defaultMessage="Geography"
            />
          }
        >
          <LocationTextItemForm
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.locationOfSupply"
                defaultMessage="Location of supply"
              />
            }
            name={['flowInformation', 'geography', 'locationOfSupply']}
            lang={lang}
            onData={onData}
            rules={StringMultiLang_o}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.technology"
              defaultMessage="Technological representativeness"
            />
          }
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.flowInformation.technologicalApplicability"
              defaultMessage="Technical purpose of product or waste"
            />
          </Divider>
          <LangTextItemForm
            name={['flowInformation', 'technology', 'technologicalApplicability']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.technologicalApplicability"
                defaultMessage="Technical purpose of product or waste"
              />
            }
          />
          <SourceSelectForm
            name={['flowInformation', 'technology', 'referenceToTechnicalSpecification']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.referenceToTechnicalSpecification"
                defaultMessage="Technical specification"
              />
            }
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Card>
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
              id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance"
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
              defaultMessage="Data entry by"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.timeStamp"
                defaultMessage="Time stamp (last saved)"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.referenceToDataSetFormat"
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
                id="pages.flow.view.administrativeInformation.referenceToPersonOrEntityEnteringTheData"
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
              id="pages.flow.view.administrativeInformation.publicationAndOwnership"
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
                id="pages.flow.view.administrativeInformation.referenceToOwnershipOfDataSet"
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
      {Object.keys(tabContent).map(key => (
        <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
          {tabContent[key]}
        </div>
      ))}
    </Card>
  );
};
