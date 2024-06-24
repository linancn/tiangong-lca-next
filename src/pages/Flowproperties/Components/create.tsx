import { createFlowproperties } from '@/services/flowproperties/api';
import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
// import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  // DatePicker,
  Drawer,
  Form,
  Input,
  // Select,
  Space,
  Tooltip,
  Typography,
  message,
  Divider
} from 'antd';
import type { FC } from 'react';
import React, {
  useCallback,
  // useEffect,
  useRef, useState
} from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowpropertiesCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [fromData, setFromData] = useState<any>({});

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const tabList = [
    { key: 'flowPropertiesInformation', tab: 'Flow Properties Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];
  const contentList: Record<string, React.ReactNode> = {
    flowPropertiesInformation: (<Space direction="vertical" style={{ width: '100%' }}>
      <Card size="small" title={'FlowProperties Information'}>
        <Card size="small" title={'Data Set Information'}>
          <Card size="small" title={'Name'}>
            <LangTextItemFrom name={['dataSetInformation', 'common:name']} label="Name" />
          </Card>
          <br />
          <Card size="small" title={'General Comment'}>
            <LangTextItemFrom name={['dataSetInformation', "common:generalComment"]} label="General Comment" />
          </Card>
          <br />
          <Card size="small" title={'Classification'}>
            <LevelTextItemFrom name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class']} />
            {/* <Space>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_0']}>
                <Input placeholder="Level 1" />
              </Form.Item>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_1']}>
                <Input placeholder="Level 2" />
              </Form.Item>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_2']}>
                <Input placeholder="Level 3" />
              </Form.Item>
            </Space> */}
          </Card>

        </Card>
        <br />
        <Card size="small" title={'Quantitative Reference'}>
          <Form.Item label='Ref Object Id' name={['quantitativeReference', 'referenceToReferenceUnitGroup', '@refObjectId']}>
            <Input />
          </Form.Item>
          <Form.Item label="Type" name={['quantitativeReference', 'referenceToReferenceUnitGroup', '@type']}>
            <Input />
          </Form.Item>
          <Form.Item label="URI" name={['quantitativeReference', 'referenceToReferenceUnitGroup', '@uri']}>
            <Input placeholder="@uri" />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom
            name={['quantitativeReference', 'referenceToReferenceUnitGroup', 'common:shortDescription']}
            label="Short Description"
          />
        </Card>
      </Card>
    </Space>),
    modellingAndValidation: (<Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="Ref Object Id" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@refObjectId']}>
        <Input placeholder="@refObjectId" />
      </Form.Item>
      <Form.Item label='Type' name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@type']}>
        <Input placeholder="@type" />
      </Form.Item>
      <Form.Item label='URI' name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@uri']}>
        <Input placeholder="@uri" />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      <LangTextItemFrom
        name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', 'common:shortDescription']}
        label="Short Description"
      />
      <Form.Item label="Approval Of Overall Compliance" name={['complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
        <Input />
      </Form.Item>
    </Space>),
    administrativeInformation: (<Space direction="vertical" style={{ width: '100%' }}>
      <Card
        size="small"
        title={'Data Entry By'}
      >
        <Form.Item label="Time Stamp" name={['dataEntryBy', 'common:timeStamp']}>
          <Input />
        </Form.Item>
        <Card
          size="small"
          title={'Reference To Data Set Format'}
        >
          <Form.Item
            label="Type"
            name={[
              'dataEntryBy',
              'common:referenceToDataSetFormat',
              '@type',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Ref Object Id"
            name={[
              'dataEntryBy',
              'common:referenceToDataSetFormat',
              '@refObjectId',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="URI"
            name={['dataEntryBy', 'common:referenceToDataSetFormat', '@uri']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom
            name={[
              'dataEntryBy',
              'common:referenceToDataSetFormat',
              'common:shortDescription',
            ]}
            label="Short Description"
          />
        </Card>

      </Card>

      <Card size="small" title={'Publication And Ownership'}>
        <Form.Item label="Data Set Version" name={['publicationAndOwnership', 'common:dataSetVersion']}>
          <Input />
        </Form.Item>
        <Card size="small" title={'Reference To Preceding Data Set Version'}>
          <Form.Item
            label="Type"
            name={[
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
              '@type',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Ref Object Id"
            name={[
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
              '@refObjectId',
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="URI"
            name={['publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion', '@uri']}
          >
            <Input />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom
            name={[
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
              'common:shortDescription',
            ]}
            label="Short Description"
          />
        </Card>

        <Form.Item label="Permanent Data Set URI" name={['publicationAndOwnership', 'common:permanentDataSetURI']}>
          <Input />
        </Form.Item>
      </Card>
    </Space>)
  }
  const onTabChange = (key: string) => {
    // setFromData({ ...fromData, [activeTabKey]: formRefCreate.current?.getFieldsValue() });
    setActiveTabKey(key);
  };
  // useEffect(() => {
  //   setFromData({ ...fromData, [activeTabKey]: formRefCreate.current?.getFieldsValue() });
  // }, [drawerVisible, formRefCreate.current?.getFieldsValue()]);
  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.create" defaultMessage="Create" />}>
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
        title={<FormattedMessage id="pages.table.option.create" defaultMessage="Flow Properties Create" />}
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
              <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit" />
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
          onValuesChange={async (changedValues, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues })
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
export default FlowpropertiesCreate;
