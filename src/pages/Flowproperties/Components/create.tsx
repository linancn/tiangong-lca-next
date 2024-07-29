import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { createFlowproperties } from '@/services/flowproperties/api';
// import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  // DatePicker,
  Drawer,
  Form,
  Input,
  // Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import React, {
  useCallback,
  useEffect,
  // useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage } from 'umi';
// import UnitgroupsFrom from '@/pages/Unitgroups/Components/Unit/edit';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import UnitGroupSelectFrom from '@/pages/Unitgroups/Components/select/from';
import FlowpropertiesSelectFrom from './select/from';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};
const FlowpropertiesCreate: FC<Props> = ({ actionRef, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [fromData, setFromData] = useState<any>({});

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const tabList = [
    { key: 'flowPropertiesInformation',
       tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.flowPropertiesInformation"
          defaultMessage="Flow Properties Information"
        />
      ), },
    { key: 'modellingAndValidation',
       tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ), },
    { key: 'administrativeInformation',
       tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ), },
  ];

  const contentList: Record<string, React.ReactNode> = {
    flowPropertiesInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.dataSetInformation" defaultMessage="Data Set Information" />}>
          <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.name" defaultMessage="Name" />}>
            <LangTextItemFrom
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:name']}
              label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.name" defaultMessage="Name" />}
            />
          </Card>
          <br />
          <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.classification" defaultMessage="Classification" />}>
            <LevelTextItemFrom
              dataType={'FlowProperty'}
              formRef={formRefCreate}
              onData={handletFromData}
              name={[
                'flowPropertiesInformation',
                'dataSetInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
              ]}
            />
          </Card>
          <br />
          <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.generalComment" defaultMessage="General Comment" />}>
            <LangTextItemFrom
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:generalComment']}
              label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.generalComment" defaultMessage="General Comment" />}
            />
          </Card>
        </Card>
        <br />
        <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.quantitativeReference" defaultMessage="Quantitative Reference" />}>
          <UnitGroupSelectFrom
            name={[
              'flowPropertiesInformation',
              'quantitativeReference',
              'referenceToReferenceUnitGroup',
            ]}
            label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.referenceToReferenceUnitGroup" defaultMessage="Reference To Reference Unit Group" />}
            lang={lang}
            formRef={formRefCreate}
            onData={handletFromData}
          />
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <SourceSelectFrom
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:referenceToComplianceSystem',
          ]}
          lang={lang}
          label={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.referenceToComplianceSystem" defaultMessage="Reference To Compliance System" />}
          formRef={formRefCreate}
          onData={handletFromData}
        />
        <Form.Item
          label={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance" defaultMessage="Approval Of Overall Compliance" />}
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Input />
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.dataEntryBy" defaultMessage="Data Entry By" />}>
          <Form.Item
            label={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.timeStamp" defaultMessage="Time Stamp" />}
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input />
          </Form.Item>
          <SourceSelectFrom
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            lang={lang}
            label={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.referenceToComplianceSystem" defaultMessage="Reference To Compliance System" />}
            formRef={formRefCreate}
            onData={handletFromData}
          />
        </Card>

        <Card size="small" title={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.publicationAndOwnership" defaultMessage="Publication And Ownership" />}>
          <Form.Item
            label={<FormattedMessage id="pages.FlowProperties.view.modellingAndValidation.dataSetVersion" defaultMessage="Data Set Version" />}
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>
          <FlowpropertiesSelectFrom
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
            ]}
            lang={lang}
            label={<FormattedMessage id="pages.FlowProperties.view.administrativeInformation.referenceToPrecedingDataSetVersion" defaultMessage="Reference To Preceding Data Set Version" />}
            formRef={formRefCreate}
            onData={handletFromData}
          />
          <Form.Item
            label={<FormattedMessage id="pages.FlowProperties.view.administrativeInformation.permanentDataSetURI" defaultMessage="Permanent Data Set URI" />}
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
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  useEffect(() => {
    if (drawerVisible === false) return;
    setFromData({});
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue({});
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
        title={
          <FormattedMessage
            id="pages.flowproperty.drawer.title.create"
            defaultMessage="Create Flow Property"
          />
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
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            const result = await createFlowproperties({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="pages.flowproperties.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              setActiveTabKey('flowPropertiesInformation');
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
export default FlowpropertiesCreate;
