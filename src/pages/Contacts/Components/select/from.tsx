import { getContactDetail } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import { langOptions } from '@/services/general/data';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Select, Space } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactView from '../view';
import ContactSelectDrawer from './drawer';

const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const ContactSelectFrom: FC<Props> = ({ name, label, lang, formRef, onData }) => {
  const [id, setId] = useState<string | undefined>(undefined);

  const handletContactData = (rowKey: any) => {
    getContactDetail(rowKey).then(async (result: any) => {
      const selectedData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'contact data set',
        '@uri': `../contacts/${rowKey}.xml`,
        'common:shortDescription':
          selectedData?.contactInformation?.dataSetInformation?.['common:shortName']?.map(
            (item: any) => {
              return {
                ...item,
                '#text': `${item['#text']}, ${
                  selectedData?.contactInformation?.dataSetInformation?.email ?? ''
                }`,
              };
            },
          ) ?? [],
        '@version':
          result.data.json?.contactDataSet?.administrativeInformation?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ],
      });
      onData();
    });
  };

  // const actionRef = React.useRef<ActionType | undefined>(undefined);

  // const id = formRef.current?.getFieldValue([...name, '@refObjectId']);

  useEffect(() => {
    setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item label="Ref Object Id" name={[...name, '@refObjectId']}>
          <Input disabled={true} style={{ width: '300px' }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <ContactSelectDrawer buttonType="text" lang={lang} onData={handletContactData} />
          {id && <ContactView lang={lang} id={id} buttonType="text" />}
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
