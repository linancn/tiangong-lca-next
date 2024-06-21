import { getContactDetail } from '@/services/contacts/api';
import { langOptions } from '@/services/general/data';
import { ActionType, ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Select, Space } from 'antd';
import React, { FC } from 'react';
import ContactView from '../view';
import ContactSelectDrawer from './drawer';

const { TextArea } = Input;

type Props = {
  name: any;
  label: string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
};

const ContactSelectFrom: FC<Props> = ({ name, label, lang, formRef }) => {
  const getShortDescription = (dataSetInformation: any) => {
    const shortName = dataSetInformation?.['common:shortName'];
    if (Array.isArray(shortName)) {
      return shortName.map((item: any) => {
        return { ...item, '#text': `${item['#text']}, ${dataSetInformation.email}` };
      });
    } else {
      return { ...shortName, '#text': `${shortName['#text']}, ${dataSetInformation.email}` };
    }
  };

  const handletContactData = (rowKey: any) => {
    getContactDetail(rowKey).then(async (result: any) => {
      formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'contact data set',
        '@uri': `../contacts/${rowKey}.xml`,
        'common:shortDescription': getShortDescription(
          result.data.json?.contactDataSet?.contactInformation?.dataSetInformation,
        ),
        '@version':
          result.data.json?.contactDataSet?.administrativeInformation?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ],
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
          <ContactSelectDrawer buttonType="text" lang={lang} onData={handletContactData} />
          {id && <ContactView id={id} dataSource="tg" buttonType="text" actionRef={actionRef} />}
          <Button onClick={() => formRef.current?.setFieldValue([...name], {})}>Clear</Button>
        </Space>
      </Space>
      <Form.Item label="Type" name={[...name, '@type']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="URI" name={[...name, '@uri']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="Version" name={[...name, '@version']}>
        <Input disabled={true} />
      </Form.Item>
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

export default ContactSelectFrom;
