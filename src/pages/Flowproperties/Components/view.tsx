import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

import SourcesDescription from '@/pages/Sources/Components/select/description';
import UnitGroupDescription from '@/pages/Unitgroups/Components/select/description';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
import FlowpropertiesSelectDescription from './select/description';

type Props = {
  id: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  buttonType: string;
  lang: string;
};
const FlowpropertyView: FC<Props> = ({ id, buttonType, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

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

  const contentList: Record<string, React.ReactNode> = {
    flowPropertiesInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.flowPropertiesInformation.id"
                defaultMessage="ID"
              />
            }
            labelStyle={{ width: '100px' }}
          >
            {initData?.flowPropertiesInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.FlowProperties.view.flowPropertiesInformation.name"
            defaultMessage="Name"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowPropertiesInformation?.dataSetInformation?.['common:name']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
            defaultMessage="General Comment"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowPropertiesInformation?.dataSetInformation?.['common:generalComment']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.FlowProperties.view.flowPropertiesInformation.classification"
            defaultMessage="Classification"
          />
        </Divider>
        <LevelTextItemDescription
          data={
            initData.flowPropertiesInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']
          }
        />
        <br />
        <UnitGroupDescription
          lang={lang}
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.quantitativeReference:ReferenceToReferenceUnitGroup"
              defaultMessage="Quantitative Reference: Reference To Reference Unit Group"
            />
          }
          data={
            initData.flowPropertiesInformation?.quantitativeReference?.referenceToReferenceUnitGroup
          }
        />
      </>
    ),
    modellingAndValidation: (
      <>
        <SourcesDescription
          data={
            initData?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:referenceToComplianceSystem'
            ]
          }
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference To Compliance System"
            />
          }
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance"
                defaultMessage="Approval Of Overall Compliance"
              />
            }
            labelStyle={{ width: '240px' }}
          >
            {initData?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:approvalOfOverallCompliance'
            ] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.modellingAndValidation.timeStamp"
                  defaultMessage="Time Stamp"
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {initData?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourcesDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.modellingAndValidation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.modellingAndValidation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.modellingAndValidation.dataSetVersion"
                  defaultMessage="Data Set Version"
                />
              }
              labelStyle={{ width: '140px' }}
            >
              {initData?.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <FlowpropertiesSelectDescription
            data={
              initData?.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]
            }
            lang={lang}
            title={
              <FormattedMessage
                id="pages.FlowProperties.view.administrativeInformation.referenceToPrecedingDataSetVersion"
                defaultMessage="Reference To Preceding Data Set Version"
              />
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.administrativeInformation.permanentDataSetURI"
                  defaultMessage="Permanent Data Set URI"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData?.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </>
    ),
  };

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getFlowpropertyDetail(id).then(async (result: any) => {
      setInitData({
        ...genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {}),
        id: id,
      });
      setSpinning(false);
    });
  };

  return (
    <>
      {/* <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} /> */}
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="pages.button.view" defaultMessage="View" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage
            id="pages.flowproperty.drawer.title.view"
            defaultMessage="View Flow Property"
          />
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default FlowpropertyView;
