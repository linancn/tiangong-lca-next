import { langOptions } from '@/services/general/data';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Select } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage } from 'umi';

const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  rules?: any[];
  setRuleErrorState?: (showError: boolean) => void;
  formRef?: any;
}

const LangTextItemForm: FC<Props> = ({ name, label, rules=[], setRuleErrorState=()=>{},formRef }) => {
  const isRequired = rules?.some((rule) => rule.required);
  
  const formContext = Form.useFormInstance();
  const form = formRef?.current || formContext;
  
  const watchedValues = Form.useWatch(name, form);
  const formValues = watchedValues || [];

  const selectedLangValues = formValues
    .filter((item: any) => item && item['@xml:lang'])
    .map((item: any) => item['@xml:lang']);

  return (
    <Form.Item>
      <Form.List name={name} initialValue={isRequired ? [undefined] : []}
       rules={[
        {
          // When adding or deleting items, check whether the language meets the requirements
          validator: async (_, value) => {
            const lists= value.filter((item:any)=>item&&item.hasOwnProperty('@xml:lang'));
            const langs = lists.map((item:any)=>item['@xml:lang']);
            const enIndex = langs.indexOf('en');
            if (langs&&langs.length&&enIndex === -1) {
              setRuleErrorState(true);
              return Promise.reject(new Error());
            }
            setRuleErrorState(false);
            return Promise.resolve();
          }
        }
      ]}
      >
        {(subFields, subOpt) => {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => {
                const currentLang = formValues?.[subField.name]?.['@xml:lang'];
                
                const optionsWithDisabled = langOptions.map(option => ({
                  ...option,
                  disabled: selectedLangValues.includes(option.value) && option.value !== currentLang
                }));
                
                return (
                  <Row key={subField.key} gutter={[10, 0]} align="top">
                    <Col flex="180px">
                      <Form.Item
                        name={[subField.name, '@xml:lang']}
                        rules={
                          isRequired
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
                                  validator: async (_, value) => {
                                    if(value==='en'){
                                      setRuleErrorState(false);
                                    };
                                    return Promise.resolve();
                                  }
                                }
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
                          options={optionsWithDisabled}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex="auto">
                      <Form.Item
                        name={[subField.name, '#text']}
                        rules={rules }
                        style={{ marginBottom: 0 }}
                      >
                        <TextArea rows={1} />
                      </Form.Item>
                    </Col>
                    <Col flex="20px" style={{ paddingTop: '8px' }}>
                        <CloseOutlined
                          style={{cursor:isRequired && subFields.length === 1 ? 'not-allowed' : 'pointer'}}
                          onClick={() => {
                            if(isRequired && subFields.length === 1){
                              return 
                            }
                            subOpt.remove(subField.name);
                          }}
                        />
                    </Col>
                  </Row>
                );
              })}
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
