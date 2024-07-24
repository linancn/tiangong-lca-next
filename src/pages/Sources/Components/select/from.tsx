import { getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Button, Card, Col, Divider, Form, Input, Row, Space } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import SourceView from '../view';
import SourceSelectDrawer from './drawer';

const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const SourceSelectFrom: FC<Props> = ({ name, label, lang, formRef, onData }) => {
  const [id, setId] = useState<string | undefined>(undefined);

  const handletSourceData = (rowKey: any) => {
    getSourceDetail(rowKey).then(async (result: any) => {
      const selectedData = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'source data set',
        '@uri': `../sources/${rowKey}.xml`,
        'common:shortDescription':
          selectedData?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? [],
      });
      onData();
    });
  };

  // const id = formRef.current?.getFieldValue([...name, '@refObjectId']);

  useEffect(() => {
    setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item
          label={<FormattedMessage id="pages.contact.refObjectId" defaultMessage="Ref Object Id" />}
          name={[...name, '@refObjectId']}
        >
          <Input disabled={true} style={{ width: '350px', color: '#000' }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <SourceSelectDrawer buttonType="text" lang={lang} onData={handletSourceData} />
          {id && <SourceView lang={lang} id={id} buttonType="text" />}
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
        <Input disabled={true} style={{ color: '#000' }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: '#000' }} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage id="pages.contact.shortDescription" defaultMessage="Short Description" />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
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
  );
};

export default SourceSelectFrom;
