import { createFlows } from '@/services/flows/api';
import { formatDateTime } from '@/services/general/util';
import { getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { FlowForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [initData, setInitData] = useState<any>(undefined);
  const [fromData, setFromData] = useState<any>(undefined);
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);
  const intl = useIntl();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletPropertyData = (data: any) => {
    if (fromData) setPropertyDataSource([...data]);
  };

  const handletPropertyDataCreate = (data: any) => {
    if (fromData)
      setPropertyDataSource([
        ...propertyDataSource,
        { ...data, '@dataSetInternalID': propertyDataSource.length.toString() },
      ]);
  };

  useEffect(() => {
    setFromData({
      ...fromData,
      flowProperties: {
        flowProperty: [...propertyDataSource],
      },
    });
  }, [propertyDataSource]);

  useEffect(() => {
    if (!drawerVisible) return;
    const referenceToComplianceSystemId = '9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a';
    const referenceToDataSetFormatId = 'a97a0155-0234-4b87-b4ce-a45da52f2a40';

    getSourceDetail(referenceToComplianceSystemId, '').then(async (result1: any) => {
      const referenceToComplianceSystemData = genSourceFromData(
        result1.data?.json?.sourceDataSet ?? {},
      );
      const referenceToComplianceSystem = {
        '@refObjectId': referenceToComplianceSystemId,
        '@type': 'source data set',
        '@uri': `../sources/${referenceToComplianceSystemId}.xml`,
        '@version': result1.data?.version,
        'common:shortDescription':
          referenceToComplianceSystemData?.sourceInformation?.dataSetInformation?.[
            'common:shortName'
          ] ?? [],
      };

      getSourceDetail(referenceToDataSetFormatId, '').then(async (result2: any) => {
        const referenceToDataSetFormatData = genSourceFromData(
          result2.data?.json?.sourceDataSet ?? {},
        );
        const referenceToDataSetFormat = {
          '@refObjectId': referenceToDataSetFormatId,
          '@type': 'source data set',
          '@uri': `../sources/${referenceToDataSetFormatId}.xml`,
          '@version': result2.data?.version,
          'common:shortDescription':
            referenceToDataSetFormatData?.sourceInformation?.dataSetInformation?.[
              'common:shortName'
            ] ?? [],
        };

        const currentDateTime = formatDateTime(new Date());
        const newData = {
          modellingAndValidation: {
            complianceDeclarations: {
              compliance: {
                'common:referenceToComplianceSystem': referenceToComplianceSystem,
              },
            },
          },
          administrativeInformation: {
            dataEntryBy: {
              'common:timeStamp': currentDateTime,
              'common:referenceToDataSetFormat': referenceToDataSetFormat,
            },
            publicationAndOwnership: {
              'common:dataSetVersion': '01.01.000',
            },
          },
        };

        setInitData(newData);

        setPropertyDataSource([]);
        formRefCreate.current?.resetFields();
        formRefCreate.current?.setFieldsValue(newData);
        setFromData(newData);
      });
    });
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
        getContainer={() => document.body}
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
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
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
            const result = await createFlows(v4(), fromData);
            if (result.data) {
              message.success(
                intl.formatMessage({
                  id: 'pages.button.create.success',
                  defaultMessage: 'Created successfully!',
                }),
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
          <FlowForm
            lang={lang}
            activeTabKey={activeTabKey}
            drawerVisible={drawerVisible}
            formRef={formRefCreate}
            onData={handletFromData}
            flowType={undefined}
            onTabChange={onTabChange}
            propertyDataSource={propertyDataSource}
            onPropertyData={handletPropertyData}
            onPropertyDataCreate={handletPropertyDataCreate}
          />
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
