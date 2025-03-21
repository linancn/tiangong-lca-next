import FileGallery from '@/components/FileViewer/gallery';
import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import { isValidURL } from '@/services/general/util';
import { getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { CloseOutlined, LinkOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import { publicationTypeOptions } from './optiondata';
import SourceSelectDescription from './select/description';

type Props = {
  id: string;
  version: string;
  // dataSource: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};

const getPublicationTypeLabel = (value: string) => {
  const option = publicationTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const SourceView: FC<Props> = ({ id, version, buttonType, lang }) => {
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
          id='pages.source.view.sourceInformation'
          defaultMessage='Source information'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.source.view.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const contentList: Record<string, React.ReactNode> = {
    sourceInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.source.view.sourceInformation.id' defaultMessage='ID' />
            }
            labelStyle={{ width: '100px' }}
          >
            {initData.sourceInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.source.view.sourceInformation.shortName'
            defaultMessage='Short name of source'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.sourceInformation?.dataSetInformation?.['common:shortName']}
        />
        <br />
        <LevelTextItemDescription
          data={
            initData.sourceInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']?.['value']
          }
          lang={lang}
          categoryType={'Source'}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.source.view.sourceInformation.sourceCitation'
                defaultMessage='Source citation'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {isValidURL(initData.sourceInformation?.dataSetInformation?.sourceCitation) ? (
              <Tooltip
                placement='topLeft'
                title={initData.sourceInformation?.dataSetInformation?.sourceCitation}
              >
                <Button
                  type='link'
                  target='blank'
                  href={initData.sourceInformation?.dataSetInformation?.sourceCitation}
                >
                  <LinkOutlined />
                </Button>
              </Tooltip>
            ) : (
              (initData.sourceInformation?.dataSetInformation?.sourceCitation ?? '-')
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.source.view.sourceInformation.publicationType'
                defaultMessage='Publication type'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {getPublicationTypeLabel(
              initData.sourceInformation?.dataSetInformation?.publicationType,
            )}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.source.view.sourceInformation.sourceDescriptionOrComment'
            defaultMessage='Source description or comment'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.sourceInformation?.dataSetInformation?.sourceDescriptionOrComment}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.edit.sourceInformation.referenceToDigitalFile'
              defaultMessage='Link to digital file'
            />
          }
        >
          <FileGallery
            data={initData.sourceInformation?.dataSetInformation?.referenceToDigitalFile}
          />
        </Card>
        <br />
        <ContactSelectDescription
          title={
            <FormattedMessage
              id='pages.source.view.sourceInformation.referenceToContact'
              defaultMessage='Belongs to:'
            />
          }
          lang={lang}
          data={initData.sourceInformation?.dataSetInformation?.referenceToContact}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id="pages.source.view.sourceInformation.referenceToLogo"
              defaultMessage="Logo of organisation or source"
            />
          }
          data={initData.sourceInformation?.dataSetInformation?.referenceToLogo}
          lang={lang}
        />
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.source.view.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.source.view.administrativeInformation.TimeStamp'
                  defaultMessage='Time stamp (last saved)'
                />
              }
              styles={{ label: { width: '200px' } }}
            >
              {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.source.view.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
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
          size='small'
          title={
            <FormattedMessage
              id='pages.source.view.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.source.view.administrativeInformation.dataSetVersion'
                  defaultMessage='Data set version'
                />
              }
              labelStyle={{ width: '160px' }}
            >
              <Space>
                {initData.administrativeInformation?.publicationAndOwnership?.[
                  'common:dataSetVersion'
                ] ?? '-'}
              </Space>
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
            lang={lang}
            title={
              <FormattedMessage
                id='pages.source.view.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
          ></ContactSelectDescription>
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id="pages.source.view.administrativeInformation.referenceToPrecedingDataSetVersion"
                defaultMessage="Preceding data set version"
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.['common:referenceToPrecedingDataSetVersion']
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.source.view.administrativeInformation.permanentDataSetURI'
                  defaultMessage='Permanent data set URI'
                />
              }
              styles={{ label: { width: '210px' } }}
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
    getSourceDetail(id, version).then(async (result: any) => {
      setInitData(genSourceFromData(result.data?.json?.sourceDataSet ?? {}));
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
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button shape='circle' icon={<ProfileOutlined />} size='small' onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='pages.button.view' defaultMessage='View' />
        </Button>
      )}
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.source.drawer.title.view' defaultMessage='View Source' />
        }
        width='90%'
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
            {contentList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default SourceView;
