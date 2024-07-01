import { getFlowpropertiesDetail } from '@/services/flowproperties/api';
import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Descriptions, Card, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { FormattedMessage } from 'umi';
// import FlowpropertiesDelete from './delete';
// import FlowpropertiesEdit from './edit';
import {
  classificationToList,
} from '@/services/general/util';
type Props = {
  id: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  buttonType: string;
  lang: string
};
const FlowpropertiesView: FC<Props> = ({ id, dataSource, buttonType, }) => {
  const [contentList, setContentList] = useState<Record<string, React.ReactNode>>({
    flowPropertiesInformation: <></>,
    modellingAndValidation: <></>,
    administrativeInformation: <></>,
  });
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');

  const tabList = [
    { key: 'flowPropertiesInformation', tab: 'Flow Properties Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];
  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };
  function initFlowPropertiesInformation(data: any) {
    let dataSetInformation = data?.dataSetInformation
    let referenceToReferenceUnitGroup = data?.quantitativeReference?.referenceToReferenceUnitGroup
    let classList = classificationToList(dataSetInformation?.classificationInformation?.['common:classification']?.['common:class'])
    return (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {dataSetInformation?.[
              'common:UUID'
            ] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          Name
        </Divider>
        <LangTextItemDescription data={dataSetInformation?.["common:name"]} />

        <Divider orientationMargin="0" orientation="left" plain>
          General Comment
        </Divider>
        <LangTextItemDescription data={dataSetInformation?.['common:generalComment']} />

        <Divider orientationMargin="0" orientation="left" plain>
          Classification
        </Divider>
        <LevelTextItemDescription data={classList} />
        <br />

        <Card size="small" title={'Quantitative Reference'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '100px' }}>
              {referenceToReferenceUnitGroup?.['@refObjectId'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
              {referenceToReferenceUnitGroup?.['@type'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="URI" labelStyle={{ width: '100px' }}>
              {referenceToReferenceUnitGroup?.['@uri'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemDescription
            data={referenceToReferenceUnitGroup?.['common:shortDescription']}
          />
        </Card>

      </>
    )
  }
  function initModellingAndValidation(data: any) {
    let referenceToComplianceSystem = data?.complianceDeclarations?.compliance?.["common:referenceToComplianceSystem"]
    let approvalOfOverallCompliance = data?.complianceDeclarations?.compliance?.["common:approvalOfOverallCompliance"]
    return (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '220px' }}>
            {referenceToComplianceSystem?.["@refObjectId"] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Type" labelStyle={{ width: '220px' }}>
            {referenceToComplianceSystem?.["@type"] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="URI" labelStyle={{ width: '220px' }}>
            {referenceToComplianceSystem?.["@uri"] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin="0" orientation="left" plain>
          Short Description
        </Divider>
        <LangTextItemDescription data={referenceToComplianceSystem?.["common:shortDescription"]} />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Approval Of Overall Compliance" labelStyle={{ width: '220px' }}>
            {approvalOfOverallCompliance ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
      </>
    )
  }
  function initAdministrativeInformation(data: any) {
    let dataEntryBy = data?.dataEntryBy
    let publicationAndOwnership = data?.publicationAndOwnership
    return (
      <>
        <Card size="small" title={'Data Entry By'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Time Stamp" labelStyle={{ width: '100px' }}>
              {dataEntryBy?.["common:timeStamp"] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Card size="small" title={'Reference To Data Set Format'}>
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '100px' }}>
                {dataEntryBy?.['common:referenceToDataSetFormat']?.["@refObjectId"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                {dataEntryBy?.['common:referenceToDataSetFormat']?.["@type"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="URI" labelStyle={{ width: '100px' }}>
                {dataEntryBy?.['common:referenceToDataSetFormat']?.["@uri"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemDescription data={dataEntryBy?.['common:referenceToDataSetFormat']?.["common:shortDescription"]} />

          </Card>

        </Card>
        <br />
        <Card size="small" title={'Publication And Ownership'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '100px' }}>
              {publicationAndOwnership?.["common:dataSetVersion"] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Card size="small" title={'Reference To Preceding Data Set Version'}>
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '100px' }}>
                {publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.["@refObjectId"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                {publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.["@type"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="URI" labelStyle={{ width: '100px' }}>
                {publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.["@uri"] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemDescription data={publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']?.["common:shortDescription"]} />

          </Card>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Permanent Data Set URI" labelStyle={{ width: '100px' }}>
              {publicationAndOwnership?.["common:permanentDataSetURI"] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </>
    )
  }
  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );

    getFlowpropertiesDetail(id).then(async (result: any) => {
      let flowPropertyDataSet = result.data?.json?.['flowPropertyDataSet']
      let flowPropertiesInformation = initFlowPropertiesInformation(flowPropertyDataSet?.flowPropertiesInformation)
      let modellingAndValidation = initModellingAndValidation(flowPropertyDataSet?.modellingAndValidation)
      let administrativeInformation = initAdministrativeInformation(flowPropertyDataSet?.administrativeInformation)
      setContentList({
        flowPropertiesInformation: flowPropertiesInformation,
        modellingAndValidation: modellingAndValidation,
        administrativeInformation: administrativeInformation,
      });
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            {/* <FlowpropertiesDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            <FlowpropertiesEdit
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            /> */}
          </>,
        );
      } else {
        setFooterButtons(<></>);
      }
    });
  };
  useEffect(() => {
    setViewDescriptions(
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {contentList[activeTabKey]}
      </Card>,
    );
  }, [contentList, activeTabKey]);
  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.view" defaultMessage="View" />}>
        {/* <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} /> */}
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.table.option.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="pages.table.option.view" defaultMessage="View" />}
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            {footerButtons}
          </Space>
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {viewDescriptions}
      </Drawer>
    </>
  );
};

export default FlowpropertiesView;
