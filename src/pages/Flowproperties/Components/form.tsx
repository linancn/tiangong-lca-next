import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import type { ProFormInstance } from '@ant-design/pro-form';
import {
  StringMultiLang_r,
} from '@/components/Validator/index';
import {
  Card,
  Form,
  Input,
  // Select,
  Space,
} from 'antd';
import type { FC } from 'react';
import { FormattedMessage } from 'umi';

import SourceSelectForm from '@/pages/Sources/Components/select/form';
import UnitGroupSelectFrom from '@/pages/Unitgroups/Components/select/form';
import FlowpropertiesSelectForm from './select/form';

type Props = {
  lang: string;
  activeTabKey: string;
  drawerVisible: boolean;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
};
export const FlowpropertyForm: FC<Props> = ({
  lang,
  activeTabKey,
  drawerVisible,
  formRef,
  onData,
  onTabChange,
}) => {
  const tabList = [
    {
      key: 'flowPropertiesInformation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.flowPropertiesInformation"
          defaultMessage="Flow Properties Information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
  ];

  const tabContent: { [key: string]: JSX.Element } = {
    flowPropertiesInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.dataSetInformation"
              defaultMessage="Data Set Information"
            />
          }
        >
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.name"
                defaultMessage="Name"
              />
            }
          >
            <LangTextItemForm
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:name']}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.flowPropertiesInformation.name"
                  defaultMessage="Name"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.classification"
                defaultMessage="Classification"
              />
            }
          >
            <LevelTextItemForm
              dataType={'FlowProperty'}
              formRef={formRef}
              onData={onData}
              name={[
                'flowPropertiesInformation',
                'dataSetInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
              ]}
            />
          </Card>
          <br />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
                defaultMessage="General Comment"
              />
            }
          >
            <LangTextItemForm
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:generalComment']}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
                  defaultMessage="General Comment"
                />
              }
            />
          </Card>
        </Card>
        <br />
        <UnitGroupSelectFrom
          name={[
            'flowPropertiesInformation',
            'quantitativeReference',
            'referenceToReferenceUnitGroup',
          ]}
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.referenceToReferenceUnitGroup"
              defaultMessage="Reference To Reference Unit Group"
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <SourceSelectForm
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:referenceToComplianceSystem',
          ]}
          lang={lang}
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference To Compliance System"
            />
          }
          formRef={formRef}
          onData={onData}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval Of Overall Compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Input />
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.timeStamp"
                defaultMessage="Time Stamp"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
          >
            <Input disabled={true} style={{ color: '#000' }} />
          </Form.Item>
          <SourceSelectForm
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            lang={lang}
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.referenceToComplianceSystem"
                defaultMessage="Reference To Compliance System"
              />
            }
            formRef={formRef}
            onData={onData}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.dataSetVersion"
                defaultMessage="Data Set Version"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          >
            <Input />
          </Form.Item>
          <FlowpropertiesSelectForm
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToPrecedingDataSetVersion',
            ]}
            lang={lang}
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.administrativeInformation.referenceToPrecedingDataSetVersion"
                defaultMessage="Reference To Preceding Data Set Version"
              />
            }
            drawerVisible={drawerVisible}
            formRef={formRef}
            onData={onData}
          />
          <Form.Item
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.administrativeInformation.permanentDataSetURI"
                defaultMessage="Permanent Data Set URI"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
          >
            <Input />
          </Form.Item>
        </Card>
      </Space>
    ),
  };

  return (
    <>
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {tabContent[activeTabKey]}
      </Card>
      <Form.Item name="id" hidden>
        <Input />
      </Form.Item>
    </>
  );
};
