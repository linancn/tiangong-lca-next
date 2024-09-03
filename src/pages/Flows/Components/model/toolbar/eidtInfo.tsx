import LangTextItemForm from '@/components/LangTextItem/form';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowsView from '../../view';

const { TextArea } = Input;

type Props = {
  flowId: string;
  lang: string;
  data: any;
  onData: (data: any) => void;
};
const ModelToolbarEditInfo: FC<Props> = ({ flowId, lang, data, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [refleshSpinning, setRefleshSpinning] = useState(false);

  const refleshFlowInfo = () => {
    setRefleshSpinning(true);
    getFlowDetail(flowId).then(async (result: any) => {
      const flow = genFlowFromData(result.data?.json?.flowDataSet ?? {});
      formRefCreate.current?.setFieldValue(
        ['productInformation', 'referenceToFlowDataSet', 'common:name'],
        flow?.flowInformation?.dataSetInformation?.name?.baseName,
      );
      formRefCreate.current?.setFieldValue(
        ['productInformation', 'referenceToFlowDataSet', 'common:generalComment'],
        flow?.flowInformation?.dataSetInformation?.['common:generalComment'],
      );
      setFromData({
        ...fromData,
        productInformation: {
          ...fromData.productInformation,
          referenceToFlowDataSet: {
            ...fromData.productInformation.referenceToFlowDataSet,
            'common:name': flow?.flowInformation?.dataSetInformation?.name?.baseName,
            'common:generalComment':
              flow?.flowInformation?.dataSetInformation?.['common:generalComment'],
          },
        },
      });
      setRefleshSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(data);
    setFromData(data);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.button.model.info" defaultMessage="Base Infomation" />}
        placement="left"
      >
        <Button
          shape="circle"
          size="small"
          icon={<InfoOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        ></Button>
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.info"
            defaultMessage="Model Base Infomation"
          ></FormattedMessage>
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button
              onClick={() => {
                setDrawerVisible(false);
              }}
            >
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel"></FormattedMessage>
            </Button>
            <Button
              onClick={() => {
                formRefCreate.current?.submit();
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit"></FormattedMessage>
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          initialValues={data}
          onValuesChange={(_, allValues) => {
            setFromData(allValues);
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData({ ...fromData });
            formRefCreate.current?.resetFields();
            setDrawerVisible(false);
            return true;
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={['productInformation', 'dataSetInformation', 'common:UUID']} hidden>
              <Input />
            </Form.Item>
            <Card
              size="small"
              title={
                <FormattedMessage
                  id="pages.product.productInformation.name"
                  defaultMessage="Name"
                />
              }
            >
              <LangTextItemForm
                name={['productInformation', 'dataSetInformation', 'name']}
                label={
                  <FormattedMessage
                    id="pages.product.productInformation.name"
                    defaultMessage="Name"
                  />
                }
              />
            </Card>
            <Card
              size="small"
              title={
                <FormattedMessage
                  id="pages.product.productInformation.generalComment"
                  defaultMessage="General Comment"
                />
              }
            >
              <LangTextItemForm
                name={['productInformation', 'dataSetInformation', 'common:generalComment']}
                label={
                  <FormattedMessage
                    id="pages.product.productInformation.generalComment"
                    defaultMessage="General Comment"
                  />
                }
              />
            </Card>
            <Spin spinning={refleshSpinning}>
              <Card
                size="small"
                title={
                  <FormattedMessage
                    id="pages.product.belongToFlow"
                    defaultMessage="Belong to The Flow"
                  />
                }
              >
                <Space direction="horizontal">
                  <Form.Item
                    label={
                      <FormattedMessage
                        id="pages.product.belongToFlow.id"
                        defaultMessage="Ref Object Id"
                      />
                    }
                    name={['productInformation', 'referenceToFlowDataSet', '@refObjectId']}
                  >
                    <Input disabled={true} style={{ width: '350px', color: '#000' }} />
                  </Form.Item>
                  <Space direction="horizontal" style={{ marginTop: '6px' }}>
                    {flowId && (
                      <>
                        <FlowsView lang={lang} id={flowId} buttonType="text" />
                        <Button onClick={refleshFlowInfo}>
                          <FormattedMessage id="pages.button.refresh" defaultMessage="Refresh" />
                        </Button>
                      </>
                    )}
                  </Space>
                </Space>

                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage id="pages.product.belongToFlow.name" defaultMessage="Name" />
                </Divider>
                <Form.Item>
                  <Form.List name={['productInformation', 'referenceToFlowDataSet', 'common:name']}>
                    {(subFields) => (
                      <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                        {subFields.map((subField) => (
                          <Row key={subField.key}>
                            <Col flex="100px" style={{ marginRight: '10px' }}>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Input disabled={true} style={{ width: '100px', color: '#000' }} />
                              </Form.Item>
                            </Col>
                            <Col flex="auto" style={{ marginRight: '10px' }}>
                              <Form.Item noStyle name={[subField.name, '#text']}>
                                <TextArea
                                  placeholder="text"
                                  rows={1}
                                  disabled={true}
                                  style={{ color: '#000' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        ))}
                        {subFields.length < 1 && <Input disabled={true} />}
                      </div>
                    )}
                  </Form.List>
                </Form.Item>
                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage
                    id="pages.product.belongToFlow.generalComment"
                    defaultMessage="General Comment"
                  />
                </Divider>
                <Form.Item>
                  <Form.List
                    name={['productInformation', 'referenceToFlowDataSet', 'common:generalComment']}
                  >
                    {(subFields) => (
                      <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                        {subFields.map((subField) => (
                          <Row key={subField.key}>
                            <Col flex="100px" style={{ marginRight: '10px' }}>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Input disabled={true} style={{ width: '100px', color: '#000' }} />
                              </Form.Item>
                            </Col>
                            <Col flex="auto" style={{ marginRight: '10px' }}>
                              <Form.Item noStyle name={[subField.name, '#text']}>
                                <TextArea
                                  placeholder="text"
                                  rows={1}
                                  disabled={true}
                                  style={{ color: '#000' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        ))}
                        {subFields.length < 1 && <Input disabled={true} />}
                      </div>
                    )}
                  </Form.List>
                </Form.Item>
              </Card>
            </Spin>
          </Space>
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

export default ModelToolbarEditInfo;
