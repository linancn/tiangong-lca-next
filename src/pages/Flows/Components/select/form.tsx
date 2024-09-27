import UnitGroupFromMini from '@/pages/Unitgroups/Components/select/formMini';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowsView from '../view';
import FlowsSelectDrawer from './drawer';
const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  drawerVisible: boolean;
  onData: () => void;
};

const FlowsSelectForm: FC<Props> = ({ name, label, lang, formRef, drawerVisible, onData }) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();

  const handletFlowsData = (rowKey: any) => {
    getFlowDetail(rowKey).then(async (result: any) => {
      const selectedData = genFlowFromData(result.data?.json?.flowDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'flow data set',
        '@uri': `../flows/${rowKey}.xml`,
        'common:shortDescription':
          selectedData?.flowInformation?.dataSetInformation?.name?.baseName ?? [],
      });
      onData();
    });
  };

  useEffect(() => {
    if (drawerVisible) {
      if (formRef.current?.getFieldValue([...name, '@refObjectId'])) {
        setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      }
    }
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item
          label={
            <FormattedMessage
              id="pages.process.view.exchange.refObjectId"
              defaultMessage="Ref object id"
            />
          }
          name={[...name, '@refObjectId']}
        >
          <Input disabled={true} style={{ width: '350px', color: token.colorTextDescription }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <FlowsSelectDrawer buttonType="text" lang={lang} onData={handletFlowsData} />
          {id && <FlowsView lang={lang} id={id} buttonType="text" />}
          {id && (
            <Button
              onClick={() => {
                formRef.current?.setFieldValue([...name], {});
                onData();
              }}
            >
              <FormattedMessage id="pages.button.clear" defaultMessage="Clear" />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        label={<FormattedMessage id="pages.process.view.exchange.type" defaultMessage="Type" />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.process.view.exchange.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage
          id="pages.process.view.exchange.shortDescription"
          defaultMessage="Short description"
        />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="100px" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                      <Input disabled={true} style={{ width: '100px', color: token.colorTextDescription }} />
                    </Form.Item>
                  </Col>
                  <Col flex="auto" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea
                        placeholder="text"
                        rows={1}
                        disabled={true}
                        style={{ color: token.colorTextDescription }}
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

      <UnitGroupFromMini
        id={id}
        idType={'flow'}
        name={name}
        formRef={formRef}
        drawerVisible={drawerVisible}
      />
    </Card>
  );
};

export default FlowsSelectForm;
