import { addContacts } from '@/services/contacts/api';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography } from 'antd';
import React from 'react';

const { TextArea } = Input;

const Add: React.FC = () => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      layout="vertical"
      autoComplete="off"
      initialValues={{ items: [{}] }}
    >
      <Space direction="vertical">
        <Card
          size="small"
          title={"Short Name"}
        >
          <Form.Item>
            <Form.List name={'common:shortName'}>
              {(subFields, subOpt) => (
                <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                  {subFields.map((subField) => (
                    <>
                      <Space key={subField.key} direction="vertical">
                        <Space>
                          <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                            <Input placeholder="lang" />
                          </Form.Item>
                          <CloseOutlined
                            onClick={() => {
                              subOpt.remove(subField.name);
                            }}
                          />
                        </Space>
                        <Form.Item noStyle name={[subField.name, '#text']}>
                          <TextArea placeholder="text" rows={1} />
                        </Form.Item>
                      </Space>
                    </>
                  ))}
                  <Button type="dashed" onClick={() => subOpt.add()} block>
                    + Add Name Item
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>
        </Card>
        <Card
          size="small"
          title={"Name"}
        >
          <Form.Item>
            <Form.List name={'common:name'}>
              {(subFields, subOpt) => (
                <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                  {subFields.map((subField) => (
                    <Space key={subField.key}>
                      <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                        <Input placeholder="lang" />
                      </Form.Item>
                      <Form.Item noStyle name={[subField.name, '#text']}>
                        <Input placeholder="text" />
                      </Form.Item>
                      <CloseOutlined
                        onClick={() => {
                          subOpt.remove(subField.name);
                        }}
                      />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => subOpt.add()} block>
                    + Add Name Item
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>
        </Card>
        <Card
          size="small"
          title={"Classification"}
        >
          <Space >
            <Form.Item name={['common:class', '@level_0']}>
              <Input placeholder="Level 1" />
            </Form.Item>
            <Form.Item name={['common:class', '@level_1']}>
              <Input placeholder="Level 2" />
            </Form.Item>
            <Form.Item name={['common:class', '@level_2']}>
              <Input placeholder="Level 3" />
            </Form.Item>
          </Space>
        </Card>
        <Form.Item label="Email" name={'email'}>
          <Input />
        </Form.Item>
        <Form.Item label="Data Set Version" name={'common:dataSetVersion'}>
          <Input />
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {() => (
            <Typography>
              <pre>{JSON.stringify(form.getFieldsValue(), null, 2)}</pre>
            </Typography>
          )}
        </Form.Item>
        <Button type="primary" htmlType="submit" onClick={() => addContacts(form.getFieldsValue())}>
          Submit
        </Button>
      </Space>
    </Form>
  );
};

export default Add;