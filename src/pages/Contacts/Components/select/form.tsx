import { getContactDetail } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import { jsonToList } from '@/services/general/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
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

const ContactSelectForm: FC<Props> = ({ name, label, lang, formRef, onData }) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();

  const handletContactData = (rowId: string, rowVersion: string) => {
    getContactDetail(rowId, rowVersion).then(async (result: any) => {
      const selectedData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': rowId,
        '@type': 'contact data set',
        '@uri': `../contacts/${rowId}.xml`,
        '@version': result.data?.version,
        'common:shortDescription':
          jsonToList(selectedData?.contactInformation?.dataSetInformation?.['common:shortName']) ??
          [],
      });
      setId(rowId);
      setVersion(result.data?.version);
      onData();
    });
  };

  useEffect(() => {
    setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
    setVersion(formRef.current?.getFieldValue([...name, '@version']));
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item
          label={<FormattedMessage id="pages.contact.refObjectId" defaultMessage="Ref object id" />}
          name={[...name, '@refObjectId']}
        >
          <Input disabled={true} style={{ width: '350px', color: token.colorTextDescription }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          {!id && <ContactSelectDrawer buttonType="text" lang={lang} onData={handletContactData} />}
          {id && (
            <ContactSelectDrawer
              buttonType="text"
              buttonText={<FormattedMessage id="pages.button.reselect" defaultMessage="Reselect" />}
              lang={lang}
              onData={handletContactData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletContactData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id="pages.button.updateReference"
                defaultMessage="Update reference"
              />
            </Button>
          )}
          {id && <ContactView lang={lang} id={id} version={version ?? ''} buttonType="text" />}
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
        label={<FormattedMessage id="pages.contact.type" defaultMessage="Type" />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.version" defaultMessage="Version" />}
        name={[...name, '@version']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage id="pages.contact.shortDescription" defaultMessage="Short description" />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="100px" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                      <Input
                        disabled={true}
                        style={{ width: '100px', color: token.colorTextDescription }}
                      />
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
    </Card>
  );
};

export default ContactSelectForm;
