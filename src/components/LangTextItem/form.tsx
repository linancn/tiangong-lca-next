import { langOptions } from '@/services/general/data';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Select } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'umi';

const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  rules?: any[];
};

const LangTextItemForm: FC<Props> = ({ name, label, rules }) => {
  const intl = useIntl();
  const isRequired = rules?.some((rule) => rule.required);

  return (
    <Form.Item>
      <Form.List name={name} initialValue={isRequired ? [{}] : []}>
        {(subFields, subOpt) => {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField, index) => (
                <Row key={subField.key} gutter={[10, 0]} align="top">
                  <Col flex="180px">
                    <Form.Item
                      name={[subField.name, '@xml:lang']}
                      rules={
                        index === 0 && isRequired
                          ? [
                              {
                                required: true,
                                message: (
                                  <FormattedMessage
                                    id="validator.lang.select"
                                    defaultMessage="Please select a language!"
                                  />
                                ),
                              },
                              {
                                validator: (_, value) => {
                                  if (value === 'en') {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(
                                    new Error(
                                      intl.formatMessage({
                                        id: 'validator.lang.mustBeEnglish',
                                        defaultMessage: 'Language must be English!',
                                      }),
                                    ),
                                  );
                                },
                              },
                            ]
                          : []
                      }
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder={
                          <FormattedMessage id="pages.lang.select" defaultMessage="Select a lang" />
                        }
                        optionFilterProp="lang"
                        options={langOptions}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="auto">
                    <Form.Item
                      name={[subField.name, '#text']}
                      rules={index === 0 ? (rules ?? []) : []}
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea rows={1} />
                    </Form.Item>
                  </Col>
                  <Col flex="20px" style={{ paddingTop: '8px' }}>
                    {(index !== 0 || !isRequired) && (
                      <CloseOutlined
                        onClick={() => {
                          subOpt.remove(subField.name);
                        }}
                      />
                    )}
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => subOpt.add()} block style={{ marginTop: '8px' }}>
                + <FormattedMessage id="pages.button.item.add" defaultMessage="Add" /> {label}{' '}
                <FormattedMessage id="pages.button.item.label" defaultMessage="Item" />
              </Button>
            </div>
          );
        }}
      </Form.List>
    </Form.Item>
  );
};

export default LangTextItemForm;
