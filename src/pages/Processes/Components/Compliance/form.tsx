import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { CloseOutlined } from '@ant-design/icons';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Form, Row, Select, Space } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';
import {
  approvalOfOverallComplianceOptions,
  documentationComplianceOptions,
  methodologicalComplianceOptions,
  nomenclatureComplianceOptions,
  qualityComplianceOptions,
  reviewComplianceOptions,
} from '../optiondata';
// const { TextArea } = Input;

type Props = {
  name: any;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const ComplianceItemForm: FC<Props> = ({ name, lang, formRef, onData }) => {
  return (
    <Form.Item>
      <Form.List name={name}>
        {(subFields, subOpt) => (
          <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
            {subFields.map((subField) => (
              <Row key={subField.key}>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Card
                    size='small'
                    title={
                      <>
                        <FormattedMessage
                          id='pages.process.modellingAndValidation.compliance'
                          defaultMessage='Compliance'
                        />{' '}
                        {` ${subField.key + 1}`}
                      </>
                    }
                    extra={
                      <CloseOutlined
                        style={{ marginTop: '10px' }}
                        onClick={() => {
                          subOpt.remove(subField.name);
                        }}
                      />
                    }
                  >
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.approvalOfOverallCompliance'
                            defaultMessage='Approval of overall compliance'
                          />
                        }
                        name={[subField.name, 'common:approvalOfOverallCompliance']}
                      >
                        <Select options={approvalOfOverallComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.nomenclatureCompliance'
                            defaultMessage='Nomenclature compliance'
                          />
                        }
                        name={[subField.name, 'common:nomenclatureCompliance']}
                      >
                        <Select options={nomenclatureComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.methodologicalCompliance'
                            defaultMessage='Methodological compliance'
                          />
                        }
                        name={[subField.name, 'common:methodologicalCompliance']}
                      >
                        <Select options={methodologicalComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.reviewCompliance'
                            defaultMessage='Review compliance'
                          />
                        }
                        name={[subField.name, 'common:reviewCompliance']}
                      >
                        <Select options={reviewComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.documentationCompliance'
                            defaultMessage='Documentation compliance'
                          />
                        }
                        name={[subField.name, 'common:documentationCompliance']}
                      >
                        <Select options={documentationComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto' style={{ marginRight: '10px' }}>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.validation.modellingAndValidation.compliance.qualityCompliance'
                            defaultMessage='Quality compliance'
                          />
                        }
                        name={[subField.name, 'common:qualityCompliance']}
                      >
                        <Select options={qualityComplianceOptions} />
                      </Form.Item>
                    </Col>
                    <br />
                    <SourceSelectForm
                      parentName={name}
                      name={[subField.name, 'common:referenceToComplianceSystem']}
                      label={
                        <FormattedMessage
                          id='pages.process.view.modellingAndValidation.referenceToComplianceSystem'
                          defaultMessage='Compliance system'
                        />
                      }
                      lang={lang}
                      formRef={formRef}
                      onData={onData}
                    />
                  </Card>
                </Space>
              </Row>
            ))}
            <Button type='dashed' onClick={() => subOpt.add()} block>
              + <FormattedMessage id='pages.button.item.add' defaultMessage='Add' />{' '}
              <FormattedMessage id='pages.process.validation.review' defaultMessage='Review' />{' '}
              <FormattedMessage id='pages.button.item.label' defaultMessage='Item' />
            </Button>
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
};

export default ComplianceItemForm;
