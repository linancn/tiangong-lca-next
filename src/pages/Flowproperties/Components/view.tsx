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
    { key: 'flowPropertiesInformation', tab: 'Flow Properties Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];

  const contentList: Record<string, React.ReactNode> = {
    flowPropertiesInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {initData?.flowPropertiesInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          Name
        </Divider>
        <LangTextItemDescription
          data={initData?.flowPropertiesInformation?.dataSetInformation?.['common:name']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          General Comment
        </Divider>
        <LangTextItemDescription
          data={initData?.flowPropertiesInformation?.dataSetInformation?.['common:generalComment']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          Classification
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
          title={'Quantitative Reference: Reference To Reference Unit Group'}
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
          title={'Reference To Compliance System'}
          lang={lang}
        />

        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label="Approval Of Overall Compliance"
            labelStyle={{ width: '220px' }}
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
        <Card size="small" title={'Data Entry By'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Time Stamp" labelStyle={{ width: '100px' }}>
              {initData?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourcesDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            title={'Reference To Data Set Format'}
            lang={lang}
          />
        </Card>
        <br />
        <Card size="small" title={'Publication And Ownership'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '100px' }}>
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
            title={'Reference To Preceding Data Set Version'}
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Permanent Data Set URI"
              labelStyle={{ width: '100px' }}
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
