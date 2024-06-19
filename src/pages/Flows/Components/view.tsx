import { getFlowsDetail } from '@/services/flows/api';
import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Descriptions, Card, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
    id: string;
    dataSource: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsView: FC<Props> = ({ id, dataSource }) => {
    const [contentList, setContentList] = useState<Record<string, React.ReactNode>>({
        flowInformation: <></>,
        modellingAndValidation: <></>,
        administrativeInformation: <></>,
        flowproperties: <></>,
    });
    const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [footerButtons, setFooterButtons] = useState<JSX.Element>();
    const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');

    const tabList = [
        { key: 'flowInformation', tab: 'Flow Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'flowproperties', tab: 'Flow Properties' },
    ];
    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };
    function initFlowInformation(data: any) {
        let dataSetInformation = data?.dataSetInformation
        let referenceToReferenceFlowProperty = data?.quantitativeReference?.referenceToReferenceFlowProperty
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
                <LangTextItemDescription data={dataSetInformation?.["name"]?.["baseName"]} />

                <Divider orientationMargin="0" orientation="left" plain>
                    Synonyms
                </Divider>
                <LangTextItemDescription data={dataSetInformation?.["common:synonyms"]} />

                <Divider orientationMargin="0" orientation="left" plain>
                    Classification
                </Divider>
                <LevelTextItemDescription data={dataSetInformation?.classificationInformation?.['common:elementaryFlowCategorization']?.['common:category']} />

                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="CAS Number" labelStyle={{ width: '100px' }}>
                        {dataSetInformation?.[
                            'CASNumber'
                        ] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                    General Comment
                </Divider>
                <LangTextItemDescription data={dataSetInformation?.['common:generalComment']} />

                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="EC Number" labelStyle={{ width: '100px' }}>
                        {dataSetInformation?.[
                            'common:other'
                        ]?.["ecn:ECNumber"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br />

                <Card size="small" title={'Quantitative Reference'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Reference To Reference Flow Property" labelStyle={{ width: '100px' }}>
                            {referenceToReferenceFlowProperty ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
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
                    <Descriptions.Item key={0} label="Type Of Data Set" labelStyle={{ width: '220px' }}>
                        {data?.["LCIMethod"]?.["typeOfDataSet"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br />
                <Card size="small" title={'Compliance Declarations'}>
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
                </Card>
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
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Permanent Data Set URI" labelStyle={{ width: '100px' }}>
                            {publicationAndOwnership?.["common:permanentDataSetURI"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            </>
        )
    }
    function initFlowProperties(data: any) {
        let flowProperty = data?.flowProperty
        return (
            <>
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="Data Set Internal ID" labelStyle={{ width: '100px' }}>
                        {flowProperty?.["@dataSetInternalID"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br />
                <Card size="small" title={'Reference To Data Set Format'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '100px' }}>
                            {flowProperty?.['referenceToFlowPropertyDataSet']?.["@refObjectId"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                            {flowProperty?.['referenceToFlowPropertyDataSet']?.["@type"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="URI" labelStyle={{ width: '100px' }}>
                            {flowProperty?.['referenceToFlowPropertyDataSet']?.["@uri"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                    <Divider orientationMargin="0" orientation="left" plain>
                        Short Description
                    </Divider>
                    <LangTextItemDescription data={flowProperty?.['referenceToFlowPropertyDataSet']?.["common:shortDescription"]} />

                </Card>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="Mean Value" labelStyle={{ width: '100px' }}>
                        {flowProperty?.["meanValue"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
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

        getFlowsDetail(id).then(async (result: any) => {
            let flowDataSet = result.data?.json?.['flowDataSet']
            let flowInformation = initFlowInformation(flowDataSet?.flowInformation)
            let modellingAndValidation = initModellingAndValidation(flowDataSet?.modellingAndValidation)
            let administrativeInformation = initAdministrativeInformation(flowDataSet?.administrativeInformation)
            let flowproperties = initFlowProperties(flowDataSet?.flowProperties)
            setContentList({
                flowInformation: flowInformation,
                modellingAndValidation: modellingAndValidation,
                administrativeInformation: administrativeInformation,
                flowproperties: flowproperties
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
            <Tooltip title={<FormattedMessage id="options.view" defaultMessage="View" />}>
                <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="options.view" defaultMessage="View" />}
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

export default FlowsView;
