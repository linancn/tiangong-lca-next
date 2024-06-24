import { getSourceDetail } from '@/services/sources/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import type { DescriptionsProps } from 'antd';
import { Button, Card, Descriptions, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import SourceDelete from './delete';
import SourceEdit from './edit';

type Props = {
    id: string;
    dataSource: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
};
const SourceView: FC<Props> = ({ id, dataSource, actionRef }) => {
    const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [footerButtons, setFooterButtons] = useState<JSX.Element>();

    const onView = () => {
        setDrawerVisible(true);
        setViewDescriptions(
            <div className={styles.loading_spin_div}>
                <Spin />
            </div>,
        );

        getSourceDetail(id).then(async (result: any) => {
            const info_shortName_items: DescriptionsProps['items'] = result.data['common:shortName'].map(
              (shortName: any) => {
                return {
                  label: shortName['@xml:lang'],
                  children: shortName['#text'] ?? '-',
                };
              },
            );
            const info_classification_items: DescriptionsProps['items'] = [
              {
                label: 'Level 1',
                children: result.data['common:class']['@level_0'] ?? '-',
              },
              {
                label: 'Level 2',
                children: result.data['common:class']['@level_1'] ?? '-',
              },
              {
                label: 'Level 3',
                children: result.data['common:class']['@level_2'] ?? '-',
              },
            ];
            const info_items: DescriptionsProps['items'] = [
              {
                label: 'ID',
                children: result.data.id ?? '-',
              },
              {
                label: 'CreateAt',
                children: result.data.createdAt ?? '-',
              },
              {
                label: 'ShortName',
                children: (
                  <Descriptions
                    items={info_shortName_items}
                    bordered
                    size={'small'}
                    column={1}
                    labelStyle={{ width: '100px' }}
                  ></Descriptions>
                ),
              }, 
              {
                label: 'Classification',
                children: (
                  <Descriptions
                    items={info_classification_items}
                    bordered
                    size={'small'}
                    column={1}
                    labelStyle={{ width: '100px' }}
                  ></Descriptions>
                ),
              },             
              {
                label: 'SourceCitation',
                children: result.data.sourceCitation ?? '-',
              },              
              {
                label: 'PublicationType',
                children: result.data.publicationType ?? '-',
              },
            ];

            const dataEntryBy_shortDescription_items: DescriptionsProps['items'] = result.data[
                'dataEntryBy:common:shortDescription'
              ].map((name: any) => {
                return {
                  label: name['@xml:lang'],
                  children: name['#text'] ?? '-',
                };
              });
              const dataEntryBy_items: DescriptionsProps['items'] = [
                {
                  label: 'TimeStamp',
                  children: result.data['dataEntryBy:common:timeStamp'] ?? '-',
                },
                {
                  label: '@type',
                  children: result.data['dataEntryBy:common:@type'] ?? '-',
                },
                {
                  label: '@refObjectId',
                  children: result.data['dataEntryBy:common:@refObjectId'] ?? '-',
                },
                {
                  label: '@uri',
                  children: result.data['dataEntryBy:common:@uri'] ?? '-',
                },
                {
                  label: 'Short Description',
                  children: (
                    <Descriptions
                      items={dataEntryBy_shortDescription_items}
                      bordered
                      size={'small'}
                      column={1}
                      labelStyle={{ width: '100px' }}
                    ></Descriptions>
                  ),
                },
                {
                  label: 'DataSet Version',
                  children: result.data['publicationAndOwnership:common:dataSetVersion'] ?? '-',
                },
              ];

            setViewDescriptions(
                <>
                    <Card size="small" title={'Sources Information'}>
                      <Descriptions
                        items={info_items}
                        bordered
                        size={'small'}
                        column={1}
                        labelStyle={{ width: '100px' }}
                      ></Descriptions>
                    </Card>                    
                    <Card size="small" title={'Administrative Information'}>
                      <Descriptions
                        items={dataEntryBy_items}
                        bordered
                        size={'small'}
                        column={1}
                        labelStyle={{ width: '100px' }}
                      ></Descriptions>
                    </Card>
                </>,
            );
            if (dataSource === 'my') {
                setFooterButtons(
                    <>
                        <SourceDelete
                            id={id}
                            buttonType={'text'}
                            actionRef={actionRef}
                            setViewDrawerVisible={setDrawerVisible}
                        />
                        <SourceEdit
                            id={id}
                            buttonType={'text'}
                            actionRef={actionRef}
                            setViewDrawerVisible={setDrawerVisible}
                        />
                    </>,
                );
            } else {
                setFooterButtons(<></>);
            }
        });
    };
    return (
        <>
            <Tooltip title={<FormattedMessage id="options.view" defaultMessage="View" />}>
                <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="options.view" defaultMessage="View" />}
                width="600px"
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

export default SourceView;
