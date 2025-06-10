import LangTextItemDescription from '@/components/LangTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { getLang } from '@/services/general/util';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { reviewTypeOptions } from '../optiondata';

import DataQualityIndicatorItemView from './DataQualityIndicator/view';
import ScopeItemView from './Scope/view';

type Props = {
  data: any;
};

const ReviewItemView: FC<Props> = ({ data = [] }) => {
  const intl = useIntl();
  const lang = getLang(intl.locale);
  return (
    <>
      {data.map((item: any, index: number) => {
        const reviewType = reviewTypeOptions.find((option) => option.value === item['@type']);
        return (
          <Card
            key={index}
            size='small'
            title={
              <>
                <FormattedMessage
                  id='pages.process.modellingAndValidation.validation.review'
                  defaultMessage='Review'
                />{' '}
              </>
            }
            style={{ marginBottom: '16px' }}
          >
            <Space direction='vertical' style={{ width: '100%' }}>
              <Descriptions bordered size='small' column={1}>
                <Descriptions.Item
                  labelStyle={{ width: '120px' }}
                  label={
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.review.type'
                      defaultMessage='Type of review'
                    />
                  }
                >
                  {reviewType ? reviewType.label : item['@type'] || '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Card
                size='small'
                title={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.scope'
                    defaultMessage='Scope of review'
                  />
                }
              >
                <ScopeItemView data={item?.['common:scope']} />
              </Card>
              <br />
              <Card
                size='small'
                title={
                  <FormattedMessage
                    id='pages.process.modellingAndValidation.validation.review.dataQualityIndicators'
                    defaultMessage='Data quality indicators'
                  />
                }
              >
                <DataQualityIndicatorItemView
                  data={item?.['common:dataQualityIndicators']?.['common:dataQualityIndicator']}
                />
              </Card>
              <Divider className='required-divider' orientationMargin='0' orientation='left' plain>
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.validation.reviewDetails'
                  defaultMessage='Review details'
                />
              </Divider>
              <LangTextItemDescription data={item?.['common:reviewDetails']} />
              <Divider orientationMargin='0' orientation='left' plain>
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.validation.otherReviewDetails'
                  defaultMessage='Other review details'
                />
              </Divider>
              <LangTextItemDescription data={item?.['common:otherReviewDetails']} />
              <br />
              <ContactSelectDescription
                data={item?.['common:referenceToNameOfReviewerAndInstitution']}
                lang={lang}
                title={
                  <FormattedMessage
                    id='pages.process.view.modellingAndValidation.referenceToNameOfReviewerAndInstitution'
                    defaultMessage='Reviewer name and institution'
                  />
                }
              ></ContactSelectDescription>
              <br />
              <SourceSelectDescription
                title={
                  <FormattedMessage
                    id='pages.process.view.modellingAndValidation.referenceToCompleteReviewReport'
                    defaultMessage='Complete review report'
                  />
                }
                data={item?.['common:referenceToCompleteReviewReport']}
                lang={lang}
              />
            </Space>
          </Card>
        );
      })}
    </>
  );
};

export default ReviewItemView;
