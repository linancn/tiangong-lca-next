import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
import { createSource } from '@/services/sources/api';
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
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import SourceSelectFrom from './select/from';
type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};
const SourceCreate: FC<Props> = ({ actionRef, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const tabList = [
    {
      key: 'sourceInformation',
      tab: (
        <FormattedMessage
          id="pages.source.create.sourceInformation"
          defaultMessage="Source Information"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.source.create.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
  ];

  const sourceList: Record<string, React.ReactNode> = {
    sourceInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.create.sourceInformation.shortName"
              defaultMessage="Short Name"
            />
          }
        >
          <LangTextItemFrom
            name={['sourceInformation', 'dataSetInformation', 'common:shortName']}
            label={
              <FormattedMessage
                id="pages.source.create.sourceInformation.shortName"
                defaultMessage="Short Name"
              />
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.create.sourceInformation.classification"
              defaultMessage="Classification"
            />
          }
        >
          <LevelTextItemFrom
            name={[
              'sourceInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            dataType={'Source'}
            formRef={formRefCreate}
            onData={handletFromData}
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.source.create.sourceInformation.sourceCitation"
              defaultMessage="Source Citation"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'sourceCitation']}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage
              id="pages.source.create.sourceInformation.publicationType"
              defaultMessage="Publication Type"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'publicationType']}
        >
          <Input />
        </Form.Item>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.create.sourceInformation.sourceDescriptionOrComment"
              defaultMessage="Source Description Or Comment"
            />
          }
        >
          <LangTextItemFrom
            name={['sourceInformation', 'dataSetInformation', 'sourceDescriptionOrComment']}
            label={
              <FormattedMessage
                id="pages.source.create.sourceInformation.sourceDescriptionOrComment"
                defaultMessage="Source Description Or Comment"
              />
            }
          />
        </Card>
        <br />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.source.create.sourceInformation.referenceToDigitalFile"
              defaultMessage="Reference To Digital File"
            />
          }
          name={['sourceInformation', 'dataSetInformation', 'referenceToDigitalFile', '@uri']}
        >
          <Input />
        </Form.Item>
        <br />
        <ContactSelectFrom
          name={['sourceInformation', 'dataSetInformation', 'referenceToContact']}
          label={
            <FormattedMessage
              id="pages.source.create.sourceInformation.referenceToContact"
              defaultMessage="Reference To Contact"
            />
          }
          lang={lang}
          formRef={formRefCreate}
          onData={handletFromData}
        />
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.create.administrativeInformation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.create.administrativeInformation.timeStamp"
                defaultMessage="Time Stamp"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input />
          </Form.Item>
          <SourceSelectFrom
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            label={
              <FormattedMessage
                id="pages.source.create.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
            formRef={formRefCreate}
            onData={handletFromData}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.create.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.create.administrativeInformation.dataSetVersion"
                defaultMessage="DataSet Version"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={
              <FormattedMessage
                id="pages.source.create.administrativeInformation.permanentDataSetURI"
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
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  useEffect(() => {
    if (drawerVisible === false) return;
    setFromData({});
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue({});
  }, [drawerVisible]);

  // useEffect(() => {
  //     setFromData({
  //         ...fromData,
  //         [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
  //     });
  // }, [formRefCreate.current?.getFieldsValue()]);

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
        {/* {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<PlusOutlined />} size="small" onClick={() => setDrawerVisible(true)} />
                ) : (
                    <Button onClick={() => setDrawerVisible(true)}>
                        <FormattedMessage id="options.create" defaultMessage="Edit" />
                    </Button>
                )} */}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.source.drawer.title.create" defaultMessage="Create Source" />
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
            const result = await createSource({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              setFromData({});
              formRefCreate.current?.resetFields();
              formRefCreate.current?.setFieldsValue({});
              setDrawerVisible(false);
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <Card
            style={{ width: '100%' }}
            // title="Card title"
            // extra={<a href="#">More</a>}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {sourceList[activeTabKey]}
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

export default SourceCreate;
