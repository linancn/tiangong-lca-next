import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import FlowpropertiesDescription from '@/pages/Flowproperties/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
    id: string;
    lang: string;
    buttonType: string;
};
const FlowsView: FC<Props> = ({ id, buttonType, lang }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
    const [spinning, setSpinning] = useState(false);
    const [initData, setInitData] = useState<any>({});

    const tabList = [
        { key: 'flowInformation', tab: 'Flow Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'flowProperties', tab: 'Flow Property' },
    ];
    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };

    const contentList: Record<string, React.ReactNode> = {
        flowInformation: (
            <>
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
                        {initData?.flowInformation?.dataSetInformation?.[
                            'common:UUID'
                        ] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <Divider orientationMargin="0" orientation="left" plain>
                    Base Name
                </Divider>
                <LangTextItemDescription data={initData?.flowInformation?.dataSetInformation?.["name"]?.["baseName"]} />

                <Divider orientationMargin="0" orientation="left" plain>
                    Synonyms
                </Divider>
                <LangTextItemDescription data={initData?.flowInformation?.dataSetInformation?.["common:synonyms"]} />

                <Divider orientationMargin="0" orientation="left" plain>
                    Classification
                </Divider>
                <LevelTextItemDescription data={initData?.flowInformation?.dataSetInformation?.classificationInformation?.['common:elementaryFlowCategorization']?.['common:category']} />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="CAS Number" labelStyle={{ width: '140px' }}>
                        {initData?.flowInformation?.dataSetInformation?.[
                            'CASNumber'
                        ] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                    General Comment
                </Divider>
                <LangTextItemDescription data={initData?.flowInformation?.dataSetInformation?.['common:generalComment']} />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="EC Number" labelStyle={{ width: '140px' }}>
                        {initData?.flowInformation?.dataSetInformation?.[
                            'common:other'
                        ]?.["ecn:ECNumber"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br />

                {/* <Card size="small" title={'Quantitative Reference'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Reference To Reference Flow Property" labelStyle={{ width: '200px' }}>
                            {initData?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card> */}
            </>
        ),
        modellingAndValidation: (
            <>
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="LCI Method: Type Of Data Set" labelStyle={{ width: '220px' }}>
                        {initData?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br />
                <Card size="small" title={'Compliance Declarations'}>
                    <SourceSelectDescription data={initData?.modellingAndValidation?.complianceDeclarations?.compliance?.["common:referenceToComplianceSystem"]} title={'Reference To Compliance System'} lang={lang} />
                    <br />
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Approval Of Overall Compliance" labelStyle={{ width: '240px' }}>
                            {initData?.modellingAndValidation?.complianceDeclarations?.compliance?.["common:approvalOfOverallCompliance"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                </Card>
            </>
        ),
        administrativeInformation: (
            <>
                <Card size="small" title={'Data Entry By'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Time Stamp" labelStyle={{ width: '150px' }}>
                            {initData?.administrativeInformation?.dataEntryBy?.["common:timeStamp"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                    <SourceSelectDescription data={initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']} title={'Reference To Data Set Format'} lang={lang} />
                </Card>
                <br />
                <Card size="small" title={'Publication And Ownership'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '160px' }}>
                            {initData?.administrativeInformation?.publicationAndOwnership?.["common:dataSetVersion"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                    <br />
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Permanent Data Set URI" labelStyle={{ width: '200px' }}>
                            {initData?.administrativeInformation?.publicationAndOwnership?.["common:permanentDataSetURI"] ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            </>
        ),
        flowProperties: (
            <>
                {/* <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="Data Set Internal ID" labelStyle={{ width: '200px' }}>
                        {initData?.flowProperties?.flowProperty?.["@dataSetInternalID"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
                <br /> */}
                <FlowpropertiesDescription data={initData?.flowProperties?.flowProperty?.['referenceToFlowPropertyDataSet']} lang={lang} title={'Reference To Data Set Format'} />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item key={0} label="Mean Value" labelStyle={{ width: '150px' }}>
                        {initData?.flowProperties?.flowProperty?.["meanValue"] ?? '-'}
                    </Descriptions.Item>
                </Descriptions>
            </>
        ),
    };

    const onView = () => {
        setDrawerVisible(true);
        setSpinning(true);
        getFlowDetail(id).then(async (result: any) => {
            setInitData({ ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id });
            setSpinning(false);
        });
    };

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
                {/* <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} /> */}
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
                ) : (
                    <Button onClick={onView}>
                        <FormattedMessage id="pages.button.view" defaultMessage="View" />
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}
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

export default FlowsView;
