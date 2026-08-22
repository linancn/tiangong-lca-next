import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { getLang, jsonToList } from '@/services/general/util';
import { ProcessComplianceItem } from '@/services/processes/data';
import { Card, Descriptions, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import {
  approvalOfOverallComplianceOptions,
  documentationComplianceOptions,
  methodologicalComplianceOptions,
  nomenclatureComplianceOptions,
  qualityComplianceOptions,
  reviewComplianceOptions,
} from '../optiondata';

type Props = {
  data: ProcessComplianceItem | ProcessComplianceItem[];
};

const ComplianceItemView: FC<Props> = ({ data }) => {
  const getOptionLabel = (
    options: { value: string; label: ReactNode }[],
    value: string | undefined,
  ) => {
    const option = options.find((item) => item.value === value);
    return option ? option.label : (value ?? '-');
  };
  const intl = useIntl();
  const lang = getLang(intl.locale);
  const complianceData = jsonToList(data) as ProcessComplianceItem[];

  return (
    <>
      {complianceData.map((item, index) => (
        <Card
          key={index}
          size='small'
          title={
            <FormattedMessage
              id='pages.process.modellingAndValidation.compliance'
              defaultMessage='Compliance'
            />
          }
          style={{ marginBottom: '16px' }}
        >
          <Space orientation='vertical' style={{ width: '100%' }}>
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.approvalOfOverallCompliance'
                      defaultMessage='Approval of overall compliance'
                    />
                  ),
                  children: getOptionLabel(
                    approvalOfOverallComplianceOptions,
                    item['common:approvalOfOverallCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.nomenclatureCompliance'
                      defaultMessage='Nomenclature compliance'
                    />
                  ),
                  children: getOptionLabel(
                    nomenclatureComplianceOptions,
                    item['common:nomenclatureCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.methodologicalCompliance'
                      defaultMessage='Methodological compliance'
                    />
                  ),
                  children: getOptionLabel(
                    methodologicalComplianceOptions,
                    item['common:methodologicalCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.reviewCompliance'
                      defaultMessage='Review compliance'
                    />
                  ),
                  children: getOptionLabel(
                    reviewComplianceOptions,
                    item['common:reviewCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.documentationCompliance'
                      defaultMessage='Documentation compliance'
                    />
                  ),
                  children: getOptionLabel(
                    documentationComplianceOptions,
                    item['common:documentationCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <Descriptions
              bordered
              size='small'
              column={1}
              items={[
                {
                  styles: {
                    label: {
                      width: '180px',
                    },
                  },
                  label: (
                    <FormattedMessage
                      id='pages.process.validation.modellingAndValidation.compliance.qualityCompliance'
                      defaultMessage='Quality compliance'
                    />
                  ),
                  children: getOptionLabel(
                    qualityComplianceOptions,
                    item['common:qualityCompliance'],
                  ),
                },
              ]}
            />
            <br />
            <SourceSelectDescription
              title={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.referenceToComplianceSystem'
                  defaultMessage='Compliance system name'
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
