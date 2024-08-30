import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import FlowpropertiesSelect from '@/pages/Flowproperties/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { createFlows } from '@/services/flows/api';
import { complianceOptions, flowTypeOptions } from '@/services/flows/data';
import { formatDateTime } from '@/services/general/util';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Input,
  message,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [initData, setInitData] = useState<any>({});
  const [flowType, setFlowType] = useState<string>();
  const [fromData, setFromData] = useState<any>({});

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

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

  const contentList: Record<string, React.ReactNode> = {
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
          <LangTextItemFrom
            name={['flowInformation', 'dataSetInformation', 'name', 'baseName']}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.baseName"
                defaultMessage="Base Name"
              />
            }
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
          <LangTextItemFrom
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
                  formRefCreate.current?.setFieldValue([...nameList, '@level_0'], null);
                  formRefCreate.current?.setFieldValue([...nameList, '@level_1'], null);
                  formRefCreate.current?.setFieldValue([...nameList, '@level_2'], null);
                  formRefCreate.current?.setFieldValue([...nameList, '@catId_0'], null);
                  formRefCreate.current?.setFieldValue([...nameList, '@catId_1'], null);
                  formRefCreate.current?.setFieldValue([...nameList, '@catId_2'], null);
                }
                setFlowType(value);
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
            <LevelTextItemFrom
              dataType={'Flow'}
              flowType={flowType}
              formRef={formRefCreate}
              onData={handletFromData}
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
          <LangTextItemFrom
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
        <SourceSelectFrom
          lang={lang}
          formRef={formRefCreate}
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
          onData={handletFromData}
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
          <SourceSelectFrom
            lang={lang}
            formRef={formRefCreate}
            label={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            onData={handletFromData}
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
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* <Card size="small" title={'Flow Property'}> */}
        {/* <Form.Item label="Data Set Internal ID" name={['flowProperties', 'flowProperty', '@dataSetInternalID']}>
                    <Input />
                </Form.Item>
                <br /> */}
        <FlowpropertiesSelect
          label={
            <FormattedMessage
              id="pages.flow.view.flowProperties.referenceToDataSetFormat"
              defaultMessage="Reference To Data Set Format"
            />
          }
          name={['flowProperties', 'flowProperty', 'referenceToFlowPropertyDataSet']}
          lang={lang}
          drawerVisible={drawerVisible}
          formRef={formRefCreate}
          onData={handletFromData}
        />
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowProperties.meanValue"
              defaultMessage="Mean Value"
            />
          }
          name={['flowProperties', 'flowProperty', 'meanValue']}
        >
          <Input />
        </Form.Item>
        {/* </Card> */}
      </Space>
    ),
  };

  useEffect(() => {
    if (drawerVisible === false) return;
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
      },
    };
    setInitData(newData);
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData(newData);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
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
        title={<FormattedMessage id="pages.button.create" defaultMessage="Flows Create" />}
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
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          initialValues={initData}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
          }}
          onFinish={async () => {
            const result = await createFlows({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="pages.flows.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              setActiveTabKey('flowInformation');
              setFromData({});
              reload();
            } else {
              message.error(result.error.message);
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
        </ProForm>
        <Collapse
          items={[
            {
              key: '1',
              label: 'JSON Data',
              children: (
                <Typography>
                  <pre>{JSON.stringify(fromData, null, 2)}</pre>
                </Typography>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  );
};
export default FlowsCreate;
