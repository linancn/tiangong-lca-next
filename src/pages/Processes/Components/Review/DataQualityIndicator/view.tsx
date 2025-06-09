import { Col, Descriptions, Row } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';
import {
  dataQualityIndicatorNameOptions,
  dataQualityIndicatorValueOptions,
} from '../../optiondata';

type Props = {
  data: any[];
};

const DataQualityIndicatorItemView: FC<Props> = ({ data }) => {
  const getIndicatorName = (nameValue: string) => {
    const option = dataQualityIndicatorNameOptions.find((item) => item.value === nameValue);
    return option ? option.label : nameValue;
  };

  const getIndicatorValue = (valueValue: string) => {
    const option = dataQualityIndicatorValueOptions.find((item) => item.value === valueValue);
    return option ? option.label : valueValue;
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
                labelStyle={{ width: '160px' }}
                label={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.dataQualityIndicator.name'
                    defaultMessage='Name'
                  />
                }
              >
                {getIndicatorName(item['@name']) || '-'}
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
                labelStyle={{ width: '160px' }}
                label={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.dataQualityIndicator.value'
                    defaultMessage='Value'
                  />
                }
              >
                {getIndicatorValue(item['@value']) || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      ))}
    </>
  );
};

export default DataQualityIndicatorItemView;
