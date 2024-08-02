import FileGallery from '@/components/FileViewer/gallery';
import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import { getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import SourceSelectDescription from './select/description';
type Props = {
  id: string;
  // dataSource: string;
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};
const SourceView: FC<Props> = ({ id, buttonType, lang }) => {
  const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const tabList = [
    {
      key: 'sourceInformation',
      tab: (
        <FormattedMessage
          id="pages.source.view.sourceInformation"
          defaultMessage="Source Information"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.source.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const sourceList: Record<string, React.ReactNode> = {
    sourceInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="pages.source.view.sourceInformation.id" defaultMessage="ID" />
            }
            labelStyle={{ width: '100px' }}
          >
            {initData.sourceInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.source.view.sourceInformation.shortName"
            defaultMessage="Short Name"
          />
        </Divider>
        <LangTextItemDescription
          data={initData.sourceInformation?.dataSetInformation?.['common:shortName']}
        />
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.source.view.sourceInformation.classification"
            defaultMessage="Classification"
          />
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
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.source.view.sourceInformation.sourceCitation"
                defaultMessage="Source Citation"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {initData.sourceInformation?.dataSetInformation?.sourceCitation ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.source.view.sourceInformation.publicationType"
                defaultMessage="Publication Type"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {initData.sourceInformation?.dataSetInformation?.publicationType ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.source.view.sourceInformation.sourceDescriptionOrComment"
            defaultMessage="Source Description Or Comment"
          />
        </Divider>
        <LangTextItemDescription
          data={initData.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment}
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.edit.sourceInformation.referenceToDigitalFile"
              defaultMessage="Reference To Digital File"
            />
          }
        >
          <FileGallery
            data={initData.sourceInformation?.dataSetInformation?.referenceToDigitalFile?.['@uri']}
          />
        </Card>
        <br />
        <ContactSelectDescription
          title={
            <FormattedMessage
              id="pages.source.view.sourceInformation.referenceToContact"
              defaultMessage="Reference To Contact"
            />
          }
          lang={lang}
          data={initData.sourceInformation?.dataSetInformation?.referenceToContact}
        />
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.view.administrativeInformation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.source.view.administrativeInformation.dataEntryBy:TimeStamp"
                  defaultMessage="Data Entry By: Time Stamp"
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id="pages.source.view.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.source.view.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.source.view.administrativeInformation.dataSetVersion"
                  defaultMessage="Data Set Version"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.source.view.administrativeInformation.permanentDataSetURI"
                  defaultMessage="Permanent Data Set URI"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
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
    getSourceDetail(id).then(async (result: any) => {
      setInitData({ ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id });
      // if (dataSource === 'my') {
      //   setFooterButtons(
      //     <>
      //       {/* <ContactDelete
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       />
      //       <ContactEdit
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       /> */}
      //     </>,
      //   );
      // } else {
      //   setFooterButtons(<></>);
      // }
      setSpinning(false);
    });
  };
  return (
    <>
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
          <FormattedMessage id="pages.source.drawer.title.view" defaultMessage="View Source" />
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
        // footer={
        //   <Space size={'middle'} className={styles.footer_right}>
        //     {footerButtons}
        //   </Space>
        // }
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
