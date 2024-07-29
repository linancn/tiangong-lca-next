import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { getFlowpropertyDetail, updateFlowproperties } from '@/services/flowproperties/api';
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
  // Select,
  Space,
  Spin,
  // Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import {
  useEffect,
  // useCallback, useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage } from 'umi';

import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import UnitGroupSelectFrom from '@/pages/Unitgroups/Components/select/from';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
import FlowpropertiesSelectFrom from './select/from';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};
const FlowpropertiesEdit: FC<Props> = ({ id, buttonType, actionRef, lang }) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
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
              formRef={formRefEdit}
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
        <UnitGroupSelectFrom
          name={[
            'flowPropertiesInformation',
            'quantitativeReference',
            'referenceToReferenceUnitGroup',
          ]}
          label={<FormattedMessage id="pages.FlowProperties.view.quantitativeReference:ReferenceToReferenceUnitGroup" defaultMessage="Quantitative Reference: Reference To Reference Unit Group" />}
          lang={lang}
          formRef={formRefEdit}
          onData={handletFromData}
        />
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
          formRef={formRefEdit}
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
            formRef={formRefEdit}
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
            formRef={formRefEdit}
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

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowpropertyDetail(id).then(async (result: any) => {
      formRefEdit.current?.setFieldsValue({
        ...genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {}),
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (drawerVisible === false) return;
    setSpinning(true);
    getFlowpropertyDetail(id).then(async (result: any) => {
      setInitData({
        ...genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {}),
        id: id,
      });
      setFromData({
        ...genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {}),
        id: id,
      });
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {}),
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
              const updateResult = await updateFlowproperties({ ...fromData, id });
              if (updateResult?.data) {
                message.success(
                  <FormattedMessage
                    id="pages.flowproperties.editsuccess"
                    defaultMessage="Edit flowproperties Successfully!"
                  />,
                );
                setDrawerVisible(false);
                // setViewDrawerVisible(false);
                setActiveTabKey('flowPropertiesInformation');
                actionRef.current?.reload();
              } else {
                message.error(updateResult?.error?.message);
              }
              return true;
            }}
            onValuesChange={async (changedValues, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues });
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

export default FlowpropertiesEdit;
