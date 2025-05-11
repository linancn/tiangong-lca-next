import { Col, Descriptions, Row } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';
import { methodNameOptions, scopeNameOptions } from '../../reviewProcess/optiondata';

type Props = {
  data: any[];
};

const ScopeItemView: FC<Props> = ({ data }) => {
  const getScopeName = (nameValue: string) => {
    const option = scopeNameOptions.find((item) => item.value === nameValue);
    return option ? option.label : nameValue;
  };

  const getMethodName = (nameValue: string) => {
    const option = methodNameOptions.find((item) => item.value === nameValue);
    return option ? option.label : nameValue;
  };

  return (
    <>
      {(data || []).map((item, index) => (
        <Row key={index}>
          <Col flex='50' style={{ marginRight: '10px' }}>
            <Descriptions
              key={index}
              bordered
              size='small'
              column={1}
              style={{ marginBottom: index < data.length - 1 ? '16px' : 0 }}
            >
              <Descriptions.Item
                labelStyle={{ width: '120px' }}
                label={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.scope.name'
                    defaultMessage='Scope name'
                  />
                }
              >
                {getScopeName(item['@name']) || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col flex='50' style={{ marginRight: '10px' }}>
            <Descriptions
              key={index}
              bordered
              size='small'
              column={1}
              style={{ marginBottom: index < data.length - 1 ? '16px' : 0 }}
            >
              <Descriptions.Item
                labelStyle={{ width: '120px' }}
                label={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.scope.method.name'
                    defaultMessage='Method name'
                  />
                }
              >
                {getMethodName(item['common:method']?.['@name']) || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      ))}
    </>
  );
};

export default ScopeItemView;
