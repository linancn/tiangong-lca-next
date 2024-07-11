import LangTextItemFrom from '@/components/LangTextItem/from';
import FlowsSelectFrom from '@/pages/Flows/Components/select/from';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
  Button,
  Card,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: any;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
};
const ProcessExchangeEdit: FC<Props> = ({
  id,
  data,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  onData,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);

  const handletFromData = () => {
    setFromData(formRefEdit.current?.getFieldsValue() ?? {},);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    // setSpinning(true);
    formRefEdit.current?.resetFields();
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setInitData(filteredData);
    formRefEdit.current?.setFieldsValue(filteredData);
    setFromData(filteredData);
    setFunctionalUnitOrOther(filteredData?.quantitativeReference ?? false);
    // setSpinning(false);
  };

  useEffect(() => {
    if (drawerVisible) return;
    onReset();
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
        title={<FormattedMessage id="pages.process.exchange.drawer.title.edit" defaultMessage="Edit Exchange" />}
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
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefEdit}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
            setFunctionalUnitOrOther(allValues?.quantitativeReference ?? false);
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData(
              data.map((item: any) => {
                if (item['@dataSetInternalID'] === id) {
                  return fromData;
                }
                return item;
              }),
            );
            formRefEdit.current?.resetFields();
            setDrawerVisible(false);
            actionRef.current?.reload();
            return true;
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={'@dataSetInternalID'} hidden>
              <Input />
            </Form.Item>
            <Form.Item label="Exchange Direction" name={'exchangeDirection'}>
              <Select
                placeholder="Select a direction"
                optionFilterProp="direction"
                options={[
                  { value: 'input', label: 'Input' },
                  { value: 'output', label: 'Output' },
                ]}
              />
            </Form.Item>
            <FlowsSelectFrom
              name={['referenceToFlowDataSet']}
              label="Reference To Flow Data Set"
              lang={lang}
              formRef={formRefEdit}
              onData={handletFromData}
            />
            <Form.Item label="Mean Amount" name={'meanAmount'}>
              <Input />
            </Form.Item>
            <Form.Item label="Resulting Amount" name={'resultingAmount'}>
              <Input />
            </Form.Item>
            <Form.Item label="Data Derivation Type Status" name={'dataDerivationTypeStatus'}>
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              General Comment
            </Divider>
            <LangTextItemFrom name="generalComment" label="General Comment" />

            <Card size="small" title={'Quantitative Reference'}>
              <Form.Item label="Reference To Reference Flow" name={'quantitativeReference'}>
                <Switch />
              </Form.Item>
              {functionalUnitOrOther ? (<>
                <Divider orientationMargin="0" orientation="left" plain>
                  Functional Unit Or Other
                </Divider>
                <LangTextItemFrom name="functionalUnitOrOther" label="Functional Unit Or Other" /></>)
                : <></>}
            </Card>
          </Space>
        </ProForm>
        <Typography>
          <pre>{JSON.stringify(fromData, null, 2)}</pre>
        </Typography>
      </Drawer>
    </>
  );
};

export default ProcessExchangeEdit;
