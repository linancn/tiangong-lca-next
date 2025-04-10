import { Descriptions, Card, Space } from 'antd';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import {
  approvalOfOverallComplianceOptions,
  documentationComplianceOptions,
  methodologicalComplianceOptions,
  nomenclatureComplianceOptions,
  qualityComplianceOptions,
  reviewComplianceOptions,
} from '../optiondata';
import { getLang } from '@/services/general/util';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';

type Props = {
  data: any[];
};

const ComplianceItemView: FC<Props> = ({ data }) => {
  const getOptionLabel = (options: any[], value: string) => {
    const option = options.find(item => item.value === value);
    return option ? option.label : value;
  };
  const intl = useIntl();
  const lang = getLang(intl.locale);


  return (
    <>
      {(data || []).map((item, index) => (
        <Card key={index}
          size="small"
          title={
            <FormattedMessage
              id='pages.process.modellingAndValidation.compliance'
              defaultMessage='Compliance'
            />
          }
          style={{ marginBottom: '16px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.approvalOfOverallCompliance'
                    defaultMessage='Approval of overall compliance'
                  />
                }
              >
                {getOptionLabel(approvalOfOverallComplianceOptions, item['common:approvalOfOverallCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.nomenclatureCompliance'
                    defaultMessage='Nomenclature compliance'
                  />
                }
              >
                {getOptionLabel(nomenclatureComplianceOptions, item['common:nomenclatureCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.methodologicalCompliance'
                    defaultMessage='Methodological compliance'
                  />
                }
              >
                {getOptionLabel(methodologicalComplianceOptions, item['common:methodologicalCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.reviewCompliance'
                    defaultMessage='Review compliance'
                  />
                }
              >
                {getOptionLabel(reviewComplianceOptions, item['common:reviewCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.documentationCompliance'
                    defaultMessage='Documentation compliance'
                  />
                }
              >
                {getOptionLabel(documentationComplianceOptions, item['common:documentationCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                labelStyle={{ width: '180px' }}
                label={
                  <FormattedMessage
                    id='pages.process.validation.modellingAndValidation.compliance.qualityCompliance'
                    defaultMessage='Quality compliance'
                  />
                }
              >
                {getOptionLabel(qualityComplianceOptions, item['common:qualityCompliance']) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <SourceSelectDescription
              title={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.referenceToComplianceSystem'
                  defaultMessage='Compliance system'
                />
              }
              data={item['common:referenceToComplianceSystem']}
              lang={lang}
            />
          </Space>
        </Card>
      ))}
    </>
  );
};

export default ComplianceItemView;
