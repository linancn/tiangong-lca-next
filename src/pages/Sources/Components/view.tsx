import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import SourceSelectDescription from './select/description';

type Props = {
  id: string;
  dataSource: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const SourceView: FC<Props> = ({ id, dataSource, buttonType }) => {
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});


  const tabList = [
    { key: 'sourceInformation', tab: 'sourceInformation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const sourceList: Record<string, React.ReactNode> = {
    sourceInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {initData.sourceInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          Short Name
        </Divider>
        <LangTextItemDescription
          data={initData.sourceInformation?.dataSetInformation?.['common:shortName']}
        />
        <Divider orientationMargin="0" orientation="left" plain>
          Classification
        </Divider>
        <LevelTextItemDescription
          data={
            initData.sourceInformation?.dataSetInformation?.classificationInformation?.[
            'common:classification'
            ]?.['common:class']
          }
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Source Citation" labelStyle={{ width: '180px' }}>
            {initData.sourceInformation?.dataSetInformation?.sourceCitation ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Publication Type" labelStyle={{ width: '180px' }}>
            {initData.sourceInformation?.dataSetInformation?.publicationType ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    administrativeInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label="Data Entry By: Time Stamp"
            labelStyle={{ width: '220px' }}
          >
            {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <SourceSelectDescription
          title={'Reference To Data Set Format'}
          data={
            initData.administrativeInformation?.dataEntryBy?.[
            'common:referenceToDataSetFormat'
            ]
          }
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Data Set Version" labelStyle={{ width: '180px' }}>
            {initData.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
  };

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getSourceDetail(id).then(async (result: any) => {
      console.log('getSourceDetail', result);
      console.log('genSourceFromData', genSourceFromData(result.data?.json?.sourceDataSet ?? {}));
      setInitData({ ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id });
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            {/* <ContactDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            <ContactEdit
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
      setSpinning(false);
    });
  };
  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.table.option.view" defaultMessage="View Cantact" />}
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.table.option.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>

      <Drawer
        title={<FormattedMessage id="options.view" defaultMessage="Source View" />}
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
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {sourceList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceView;
