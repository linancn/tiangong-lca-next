import LangTextItemForm from '@/components/LangTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import { reviewTypeOptions } from '@/pages/Processes/Components/optiondata';
import schema from '@/pages/Processes/processes_schema.json';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import { CloseOutlined } from '@ant-design/icons';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Col, Divider, Form, Row, Select, Space } from 'antd';
import { FC, useState } from 'react';
import { FormattedMessage } from 'umi';
import DataQualityIndicatorItemForm from './DataQualityIndicator/form';
import ScopeItemForm from './Scope/form';
// const { TextArea } = Input;

type Props = {
  name: any;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const ReveiwItemForm: FC<Props> = ({ name, lang, formRef, onData }) => {
  const [reviewDetailsError, setReviewDetailsError] = useState(false);
  return (
    <Form.Item>
      <Form.List name={[...name]}>
        {(subFields, subOpt) => {
          const displayFields = subFields.length > 0 ? subFields : [null];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {displayFields.map((subField) => (
                <Row key={subField?.key ?? 'empty'}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Card
                      size='small'
                      title={
                        <>
                          <FormattedMessage
                            id='pages.process.modellingAndValidation.validation.review'
                            defaultMessage='Review'
                          />{' '}
                        </>
                      }
                      extra={
                        subFields.length > 1 ? (
                          <CloseOutlined
                            style={{
                              cursor: 'pointer',
                              marginTop: '10px',
                            }}
                            onClick={() => {
                              subOpt.remove(subField!.name);
                            }}
                          />
                        ) : null
                      }
                    >
                      <Col flex='auto' style={{ marginRight: '10px' }}>
                        <Form.Item
                          label={
                            <FormattedMessage
                              id='pages.process.validation.modellingAndValidation.review.type'
                              defaultMessage='Type of review'
                            />
                          }
                          name={subField ? [subField.name, '@type'] : [...name, 0, '@type']}
                          rules={getRules(
                            schema['processDataSet']['modellingAndValidation']['validation'][
                              'review'
                            ]['@type']['rules'],
                          )}
                        >
                          <Select options={reviewTypeOptions} />
                        </Form.Item>
                      </Col>
                      <Card
                        size='small'
                        title={
                          <FormattedMessage
                            id='pages.process.modellingAndValidation.validation.review.scope'
                            defaultMessage='Scope of review'
                          />
                        }
                      >
                        <ScopeItemForm
                          name={
                            subField
                              ? [subField.name, 'common:scope']
                              : [...name, 0, 'common:scope']
                          }
                        />
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
                        <DataQualityIndicatorItemForm
                          name={
                            subField
                              ? [
                                  subField.name,
                                  'common:dataQualityIndicators',
                                  'common:dataQualityIndicator',
                                ]
                              : [
                                  ...name,
                                  0,
                                  'common:dataQualityIndicators',
                                  'common:dataQualityIndicator',
                                ]
                          }
                        />
                      </Card>
                      <Divider
                        className='required-divider'
                        orientationMargin='0'
                        orientation='left'
                        plain
                      >
                        <RequiredMark
                          label={
                            <FormattedMessage
                              id='pages.process.view.modellingAndValidation.validation.reviewDetails'
                              defaultMessage='Review details'
                            />
                          }
                          showError={reviewDetailsError}
                        />
                      </Divider>
                      <LangTextItemForm
                        name={
                          subField
                            ? [subField.name, 'common:reviewDetails']
                            : [...name, 0, 'common:reviewDetails']
                        }
                        listName={[...name]}
                        label={
                          <FormattedMessage
                            id='pages.process.view.modellingAndValidation.validation.reviewDetails'
                            defaultMessage='Review details'
                          />
                        }
                        setRuleErrorState={setReviewDetailsError}
                        rules={getRules(
                          schema['processDataSet']['modellingAndValidation']['validation'][
                            'review'
                          ]['common:reviewDetails']['rules'],
                        )}
                      />
                      <Divider orientationMargin='0' orientation='left' plain>
                        <FormattedMessage
                          id='pages.process.view.modellingAndValidation.validation.otherReviewDetails'
                          defaultMessage='Other review details'
                        />
                      </Divider>
                      <LangTextItemForm
                        name={
                          subField
                            ? [subField.name, 'common:otherReviewDetails']
                            : [...name, 0, 'common:otherReviewDetails']
                        }
                        listName={[...name]}
                        label={
                          <FormattedMessage
                            id='pages.process.view.modellingAndValidation.validation.otherReviewDetails'
                            defaultMessage='Other review details'
                          />
                        }
                      />
                      <ContactSelectForm
                        parentName={name}
                        name={
                          subField
                            ? [subField.name, 'common:referenceToNameOfReviewerAndInstitution']
                            : [...name, 0, 'common:referenceToNameOfReviewerAndInstitution']
                        }
                        label={
                          <FormattedMessage
                            id='pages.process.view.modellingAndValidation.referenceToNameOfReviewerAndInstitution'
                            defaultMessage='Reviewer name and institution'
                          />
                        }
                        lang={lang}
                        formRef={formRef}
                        onData={onData}
                        rules={getRules(
                          schema['processDataSet']['modellingAndValidation']['validation'][
                            'review'
                          ]['common:referenceToNameOfReviewerAndInstitution']['@refObjectId'][
                            'rules'
                          ],
                        )}
                      />
                      <br />
                      <SourceSelectForm
                        type='reviewReport'
                        parentName={name}
                        name={
                          subField
                            ? [subField.name, 'common:referenceToCompleteReviewReport']
                            : [...name, 0, 'common:referenceToCompleteReviewReport']
                        }
                        label={
                          <FormattedMessage
                            id='pages.process.view.modellingAndValidation.referenceToCompleteReviewReport'
                            defaultMessage='Complete review report'
                          />
                        }
                        lang={lang}
                        formRef={formRef}
                        onData={onData}
                        rules={getRules(
                          schema['processDataSet']['modellingAndValidation']['validation'][
                            'review'
                          ]['common:referenceToCompleteReviewReport']['@refObjectId']['rules'],
                        )}
                      />
                    </Card>
                  </Space>
                </Row>
              ))}
            </div>
          );
        }}
      </Form.List>
    </Form.Item>
  );
};

export default ReveiwItemForm;
