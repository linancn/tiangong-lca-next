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
            defaultMessage="Name of flow property"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowPropertiesInformation?.dataSetInformation?.['common:name']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.FlowProperties.view.flowPropertiesInformation.generalComment"
            defaultMessage="General comment on data set"
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
          lang={lang}
          categoryType={'FlowProperty'}
        />
        <br />
        <UnitGroupDescription
          lang={lang}
          title={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.referenceToReferenceUnitGroup"
              defaultMessage="Reference unit"
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
              defaultMessage="Compliance system name"
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
                defaultMessage="Approval of overall compliance"
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
              defaultMessage="Data entry by"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.modellingAndValidation.timeStamp"
                  defaultMessage="Time stamp (last saved)"
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
                defaultMessage="Data set format(s)"
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
              defaultMessage="Publication and ownership"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.FlowProperties.view.modellingAndValidation.dataSetVersion"
                  defaultMessage="Data set version"
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
                defaultMessage="Preceding data set version"
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
                  defaultMessage="Permanent data set URI"
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
            defaultMessage="View Flow property"
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
