import { getFlowpropertiesDetail, updateFlowproperties } from '@/services/flowproperties/api';
// import { langOptions } from '@/services/general/data';
import LangTextItemFrom from '@/components/LangTextItem/from';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  // Select,
  Space,
  // Spin,
  Tooltip,
  Typography,
  message,
  Divider
} from 'antd';
import type { FC } from 'react';
import {
  // useCallback, useEffect,
  useRef, useState
} from 'react';
import { FormattedMessage } from 'umi';
import {
  classificationToJson,
  getLangList,
} from '@/services/general/util';


type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  // setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
// setViewDrawerVisible
const FlowpropertiesEdit: FC<Props> = ({ id, buttonType, actionRef }) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [fromData, setFromData] = useState<any>({});
  const tabList = [
    { key: 'flowPropertiesInformation', tab: 'Flow Properties Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];
  const onTabChange = (key: string) => {
    // setFromData({ ...fromData, [activeTabKey]: formRefEdit.current?.getFieldsValue() });
    setActiveTabKey(key);
    formRefEdit.current?.setFieldsValue(fromData[key]);
  };

  function initFlowPropertiesInformation() {
    return (<Space direction="vertical" style={{ width: '100%' }}>
      <Card size="small" title={'FlowProperties Information'}>
        <Card size="small" title={'Data Set Information'}>
          <Card size="small" title={'Name'}>
            <LangTextItemFrom keyName={['dataSetInformation', 'common:name']} labelName="Name" />
          </Card>
          <br />
          <Card size="small" title={'General Comment'}>
            <LangTextItemFrom keyName={['dataSetInformation', "common:generalComment"]} labelName="General Comment" />
          </Card>
          <br />
          <Card size="small" title={'Classification'}>
            <Space>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_0']}>
                < Input placeholder="Level 1" />
              </Form.Item>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_1']}>
                <Input placeholder="Level 2" />
              </Form.Item>
              <Form.Item name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class', '@level_2']}>
                <Input placeholder="Level 3" />
              </Form.Item>
            </Space>
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
            keyName={['quantitativeReference', 'referenceToReferenceUnitGroup', 'common:shortDescription']}
            labelName="Short Description"
          />
        </Card>
      </Card>
    </Space >)
  }
  function initModellingAndValidation() {
    return (<Space direction="vertical" style={{ width: '100%' }}>
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
        keyName={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', 'common:shortDescription']}
        labelName="Short Description"
      />
      <Form.Item label="Approval Of Overall Compliance" name={['complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
        <Input />
      </Form.Item>
    </Space>)
  }
  function initAdministrativeInformation() {
    return (<Space direction="vertical" style={{ width: '100%' }}>
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
            keyName={[
              'dataEntryBy',
              'common:referenceToDataSetFormat',
              'common:shortDescription',
            ]}
            labelName="Short Description"
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
            keyName={[
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
              'common:shortDescription',
            ]}
            labelName="Short Description"
          />
        </Card>

        <Form.Item label="Permanent Data Set URI" name={['publicationAndOwnership', 'common:permanentDataSetURI']}>
          <Input />
        </Form.Item>
      </Card>
    </Space>)
  }
  const initFlowPropertiesInformationData = (data: any) => {
    let dataSetInformation = data?.['dataSetInformation'];
    let referenceToReferenceUnitGroup = data?.['quantitativeReference']?.['referenceToReferenceUnitGroup'];
    return {
      dataSetInformation: {
        'common:UUID': dataSetInformation?.["common:UUID"],
        'common:name': getLangList(dataSetInformation?.["common:name"]),
        classificationInformation: {
          'common:classification': {
            'common:class': classificationToJson(dataSetInformation?.classificationInformation?.['common:classification']?.['common:class']),
          },
        },
        'common:generalComment': getLangList(dataSetInformation?.["common:generalComment"]),
      },
      quantitativeReference: {
        referenceToReferenceUnitGroup: {
          "@refObjectId": referenceToReferenceUnitGroup?.['@refObjectId'],
          "@type": referenceToReferenceUnitGroup?.['@type'],
          "@uri": referenceToReferenceUnitGroup?.['@uri'],
          "common:shortDescription": getLangList(referenceToReferenceUnitGroup?.["common:shortDescription"])
        }
      }
    }
  }
  const initModellingAndValidationData = (data: any) => {
    let compliance = data?.complianceDeclarations.compliance
    let referenceToComplianceSystem = compliance?.['common:referenceToComplianceSystem']
    return {
      complianceDeclarations: {
        compliance: {
          'common:referenceToComplianceSystem': {
            '@refObjectId': referenceToComplianceSystem?.['@refObjectId'],
            '@type': referenceToComplianceSystem?.['@type'],
            '@uri': referenceToComplianceSystem?.['@uri'],
            'common:shortDescription': getLangList(referenceToComplianceSystem?.['common:shortDescription']),
          },
          'common:approvalOfOverallCompliance': compliance?.['common:approvalOfOverallCompliance'],
        },
      },
    }
  }
  const initAdministrativeInformationData = (data: any) => {
    return {
      dataEntryBy: {
        'common:timeStamp': data?.['dataEntryBy']?.['common:timeStamp'],
        'common:referenceToDataSetFormat': {
          '@type': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@type'],
          '@refObjectId': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@refObjectId'],
          '@uri': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@uri'],
          'common:shortDescription': getLangList(data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
        },
      },
      publicationAndOwnership: {
        'common:dataSetVersion': data?.['publicationAndOwnership']?.['common:dataSetVersion'],
        'common:referenceToPrecedingDataSetVersion': {
          '@type': data?.['publicationAndOwnership']?.['common:referenceToPrecedingDataSetVersion']?.['@type'],
          '@refObjectId': data?.['publicationAndOwnership']?.['common:referenceToPrecedingDataSetVersion']?.['@refObjectId'],
          '@uri': data?.['publicationAndOwnership']?.['common:referenceToPrecedingDataSetVersion']?.['@uri'],
          'common:shortDescription': getLangList(data?.['publicationAndOwnership']?.['common:referenceToPrecedingDataSetVersion']?.['common:shortDescription']),
        },
        'common:permanentDataSetURI': data?.['publicationAndOwnership']?.['common:permanentDataSetURI'],
      },
    }
  }
  const contentList: Record<string, React.ReactNode> = {
    flowPropertiesInformation: initFlowPropertiesInformation(),
    modellingAndValidation: initModellingAndValidation(),
    administrativeInformation: initAdministrativeInformation()
  }
  const initDataFn = (data: any) => {
    let flowPropertiesInformation = initFlowPropertiesInformationData(data?.['flowPropertiesInformation'])
    let modellingAndValidation = initModellingAndValidationData(data?.['modellingAndValidation'])
    let administrativeInformation = initAdministrativeInformationData(data?.['administrativeInformation'])
    return {
      flowPropertiesInformation: flowPropertiesInformation,
      modellingAndValidation: modellingAndValidation,
      administrativeInformation: administrativeInformation,
    }
  }
  // const onEdit = useCallback(() => {
  //   setDrawerVisible(true);
  //   getFlowpropertiesDetail(id).then(async (result: any) => {
  //     let initData = result.data?.json?.['flowPropertyDataSet']
  //     let data = initDataFn(initData)
  //     setFromData({ ...data });
  //     console.log('fromData', fromData, activeTabKey, fromData[activeTabKey]);
  //     formRefEdit.current?.setFieldsValue(fromData[activeTabKey]);
  //   });
  // }, [actionRef, id, setViewDrawerVisible]);
  const onEdit = () => {
    setDrawerVisible(true);
    getFlowpropertiesDetail(id).then(async (result: any) => {
      let initData = result.data?.json?.['flowPropertyDataSet']
      let data: { [key: string]: any } = initDataFn(initData)
      setFromData({ ...data });
      formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
    });
  }
  const onReset = () => {
    getFlowpropertiesDetail(id).then(async (result: any) => {
      let initData = result.data?.json?.['flowPropertyDataSet']
      let data: { [key: string]: any } = initDataFn(initData)
      setFromData({
        ...data
      });
      formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
    });
  };

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
        <ProForm
          formRef={formRefEdit}
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
                  id="options.editsuccess"
                  defaultMessage="Edit Successfully!"
                />,
              );
              setDrawerVisible(false);
              // setViewDrawerVisible(false);
              setActiveTabKey('flowPropertiesInformation')
              actionRef.current?.reload();
            } else {
              message.error(updateResult?.error?.message);
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

export default FlowpropertiesEdit;
