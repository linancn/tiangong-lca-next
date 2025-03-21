import { CloseOutlined } from '@ant-design/icons';
import { Button, Col, Form, Row, Select } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';
import { methodNameOptions, scopeNameOptions } from '../../optiondata';

type Props = {
  name: any;
};

const ScopeItemForm: FC<Props> = ({ name }) => {
  return (
    <Form.Item>
      <Form.List name={name}>
        {(subFields, subOpt) => (
          <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
            {subFields.map((subField, index) => (
              <Row key={subField.key}>
                <Col flex='50' style={{ marginRight: '10px' }}>
                  {index === 0 && (
                    <FormattedMessage
                      id='pages.process.modellingAndValidation.validation.review.scope.name'
                      defaultMessage='Scope name'
                    />
                  )}
                  <Form.Item noStyle name={[subField.name, '@name']}>
                    <Select options={scopeNameOptions} />
                  </Form.Item>
                </Col>
                <Col flex='50' style={{ marginRight: '10px' }}>
                  {index === 0 && (
                    <FormattedMessage
                      id='pages.process.modellingAndValidation.validation.review.scope.method.name'
                      defaultMessage='Method name'
                    />
                  )}
                  <Form.Item noStyle name={[subField.name, 'common:method', '@name']}>
                    <Select options={methodNameOptions} />
                  </Form.Item>
                </Col>
                <Col flex='20px'>
                  {index === 0 && <br />}
                  <CloseOutlined
                    style={{ marginTop: '10px' }}
                    onClick={() => {
                      subOpt.remove(subField.name);
                    }}
                  />
                </Col>
              </Row>
            ))}
            <Button type='dashed' onClick={() => subOpt.add()} block>
              + <FormattedMessage id='pages.button.item.add' defaultMessage='Add' />{' '}
              <FormattedMessage
                id='pages.process.modellingAndValidation.validation.review.scope'
                defaultMessage='Scope of review'
              />{' '}
              <FormattedMessage id='pages.button.item.label' defaultMessage='Item' />
            </Button>
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
};

export default ScopeItemForm;
