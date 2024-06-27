import { langOptions } from '@/services/general/data';
import { getSourceDetail } from '@/services/sources/api';
import { ActionType, ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Select, Space } from 'antd';
import React, { FC } from 'react';
import SourceView from '../view';
import SourceSelectDrawer from './drawer';

const { TextArea } = Input;

type Props = {
  name: any;
  label: string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
};

const SourceSelectFrom: FC<Props> = ({ name, label, lang, formRef }) => {
  const handletSourcetData = (rowKey: any) => {
    getSourceDetail(rowKey).then(async (result: any) => {
      console.log('getSourceDetail',result);
      formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'source data set',
        '@uri': `../source/${rowKey}.xml`,
        'common:shortDescription': result.data.json?.sourceDataSet?.sourceInformation?.dataSetInformation?.['common:shortName'],
      });
    });
  };

  const actionRef = React.useRef<ActionType | undefined>(undefined);

  const id = formRef.current?.getFieldValue([...name, '@refObjectId']);

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item label="Ref Object Id" name={[...name, '@refObjectId']}>
          <Input disabled={true} style={{ width: '300px' }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <SourceSelectDrawer buttonType="text" lang={lang} onData={handletSourcetData} />
          {id && <SourceView id={id} dataSource="tg" buttonType="text" actionRef={actionRef} />}
          {id && (
            <Button onClick={() => formRef.current?.setFieldValue([...name], {})}>Clear</Button>
          )}
        </Space>
      </Space>
      <Form.Item label="Type" name={[...name, '@type']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="URI" name={[...name, '@uri']}>
        <Input disabled={true} />
      </Form.Item>
      {/* <Form.Item label="Version" name={[...name, '@version']}>
        <Input disabled={true} />
      </Form.Item> */}
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="120px" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                      <Select
                        placeholder="Select a lang"
                        optionFilterProp="lang"
                        options={langOptions}
                        disabled={true}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="auto" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea placeholder="text" rows={1} disabled={true} />
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
  );
};

export default SourceSelectFrom;
