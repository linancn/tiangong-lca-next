import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import { Card, Form, Input, Select, Space, theme } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

import SourceSelectForm from '@/pages/Sources/Components/select/form';
import UnitGroupSelectFrom from '@/pages/Unitgroups/Components/select/form';
import { ProFormInstance } from '@ant-design/pro-components';
import { complianceOptions } from './optiondata';
import FlowpropertiesSelectForm from './select/form';
import { getRules } from '@/pages/Utils';
import schema from '../flowproperties_schema.json';
import RequiredMark from '@/components/RequiredMark';

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
  const { token } = theme.useToken();
  const [nameErrorState, setNameErrorState] = useState(false);
  const tabList = [
    {
      key: 'flowPropertiesInformation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.flowPropertiesInformation"
          defaultMessage="Flow property information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.modellingAndValidation"
          defaultMessage="Modelling and validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.FlowProperties.view.administrativeInformation"
          defaultMessage="Administrative information"
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
              defaultMessage="Data set information"
            />
          }
        >
          <Card
            size="small"
            title={
              <RequiredMark 
              label={<FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.name"
                defaultMessage="Name of flow property"
              />}
              showError={nameErrorState}
              />
            }
          >
            <LangTextItemForm
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:name']}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.flowPropertiesInformation.name"
                  defaultMessage="Name of flow property"
                />
              }
              setRuleErrorState={setNameErrorState}
              rules={getRules(schema['flowPropertyDataSet']['flowPropertiesInformation']['dataSetInformation']['common:name']['rules'])}
            />
          </Card>
          <br />
          <LevelTextItemForm
            dataType={'FlowProperty'}
            onData={onData}
            name={[
              'flowPropertiesInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            formRef={formRef}
            lang={lang}
            rules={getRules(schema['flowPropertyDataSet']['flowPropertiesInformation']['dataSetInformation']['classificationInformation']['common:classification']['common:class']['rules'])}
          />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
                defaultMessage="General comment on data set"
              />
            }
          >
            <LangTextItemForm
              name={['flowPropertiesInformation', 'dataSetInformation', 'common:generalComment']}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
                  defaultMessage="General comment on data set"
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
              defaultMessage="Reference unit"
            />
          }
          rules={getRules(schema['flowPropertyDataSet']['flowPropertiesInformation']['quantitativeReference']['referenceToReferenceUnitGroup']['rules'])}
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
              defaultMessage="Compliance system name"
            />
          }
          formRef={formRef}
          onData={onData}
          rules={getRules(schema['flowPropertyDataSet']['modellingAndValidation']['complianceDeclarations']['compliance']['common:referenceToComplianceSystem']['rules'])}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval of overall compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
          rules={getRules(schema['flowPropertyDataSet']['modellingAndValidation']['complianceDeclarations']['compliance']['common:approvalOfOverallCompliance']['rules'])}
        >
          <Select options={complianceOptions} />
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
              defaultMessage="Data entry by"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.timeStamp"
                defaultMessage="Time stamp (last saved)"
              />
            }
            name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            rules={getRules(schema['flowPropertyDataSet']['administrativeInformation']['dataEntryBy']['common:timeStamp']['rules'])}
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <SourceSelectForm
            name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
            lang={lang}
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.referenceToDataSetFormat"
                defaultMessage="Data set format(s)"
              />
            }
            formRef={formRef}
            onData={onData}
            rules={getRules(schema['flowPropertyDataSet']['administrativeInformation']['dataEntryBy']['common:referenceToDataSetFormat']['rules'])}
          />
        </Card>

        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.publicationAndOwnership"
              defaultMessage="Publication and ownership"
            />
          }
        >
          <Form.Item
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.dataSetVersion"
                defaultMessage="Data set version"
              />
            }
            name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
            rules={getRules(schema['flowPropertyDataSet']['administrativeInformation']['publicationAndOwnership']['common:dataSetVersion']['rules'])}
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
                defaultMessage="Preceding data set version"
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
                defaultMessage="Permanent data set URI"
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
        {Object.keys(tabContent).map((key) => (
          <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
            {tabContent[key]}
          </div>
        ))}
      </Card>
    </>
  );
};
