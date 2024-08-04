import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import FlowpropertiesSelect from '@/pages/Flowproperties/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { getFlowDetail, updateFlows } from '@/services/flows/api';
import { complianceOptions, flowTypeOptions } from '@/services/flows/data';
import { genFlowFromData } from '@/services/flows/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsEdit: FC<Props> = ({ id, buttonType, actionRef, lang }) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [spinning, setSpinning] = useState(false);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
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
              id="pages.flow.view.flowInformation.classification"
              defaultMessage="Classification"
            />
          }
        >
          <LevelTextItemFrom
            dataType="Flow"
            formRef={formRefEdit}
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
        {/* <Card size="small" title={'LCI Method'}> */}
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
        {/* </Card> */}
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.modellingAndValidation.complianceDeclarations"
              defaultMessage="Compliance Declarations"
            />
          }
        >
          <SourceSelectFrom
            lang={lang}
            formRef={formRefEdit}
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
        </Card>
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
            <Input />
          </Form.Item>
          <SourceSelectFrom
            lang={lang}
            formRef={formRefEdit}
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
          formRef={formRefEdit}
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

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowDetail(id).then(async (result: any) => {
      formRefEdit.current?.setFieldsValue({
        ...genFlowFromData(result.data?.json?.flowDataSet ?? {}),
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (drawerVisible === false) return;
    setSpinning(true);
    getFlowDetail(id).then(async (result: any) => {
      setInitData({ ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id });
      setFromData({ ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id });
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genFlowFromData(result.data?.json?.flowDataSet ?? {}),
        id: id,
      });
      setSpinning(false);
    });
  }, [drawerVisible]);

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
        title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}
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
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              const updateResult = await updateFlows({ ...fromData, id });
              if (updateResult?.data) {
                message.success(
                  <FormattedMessage
                    id="pages.flows.editsuccess"
                    defaultMessage="Edit Successfully!"
                  />,
                );
                setDrawerVisible(false);
                setActiveTabKey('flowInformation');
                actionRef.current?.reload();
              } else {
                message.error(updateResult?.error?.message);
              }
              return true;
            }}
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
        </Spin>
      </Drawer>
    </>
  );
};

export default FlowsEdit;
