import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { getContactDetail } from '@/services/contacts/api';
import {
  ContactDataSetObjectKeys,
  ContactDetailResponse,
  FormContact,
} from '@/services/contacts/data';
import { genContactFromData } from '@/services/contacts/util';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import ContractDescription from './select/description';
type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
};

const getClassificationValues = (value: unknown): string[] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (!('value' in value)) {
    return undefined;
  }
  const raw = (value as { value?: unknown }).value;
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return raw.filter((item): item is string => typeof item === 'string');
};

const ContactView: FC<Props> = ({ id, version, lang, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<Partial<FormContact>>({});
  const [activeTabKey, setActiveTabKey] = useState<ContactDataSetObjectKeys>('contactInformation');
  const tabList: { key: ContactDataSetObjectKeys; tab: ReactNode }[] = [
    {
      key: 'contactInformation',
      tab: (
        <FormattedMessage
          id='pages.contact.contactInformation'
          defaultMessage='Contact information'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.contact.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key as ContactDataSetObjectKeys);
  };

  const classificationValues = getClassificationValues(
    initData.contactInformation?.dataSetInformation?.classificationInformation?.[
      'common:classification'
    ]?.['common:class'],
  );

  const contactList: Record<ContactDataSetObjectKeys, React.ReactNode> = {
    contactInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.contact.id' defaultMessage='ID' />}
            labelStyle={{ width: '100px' }}
          >
            {initData.contactInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.contact.name' defaultMessage='Name' />
        </Divider>
        <LangTextItemDescription
          data={initData.contactInformation?.dataSetInformation?.['common:name']}
        />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.contact.shortName' defaultMessage='Short name' />
        </Divider>
        <LangTextItemDescription
          data={initData.contactInformation?.dataSetInformation?.['common:shortName']}
        />
        <br />
        <LevelTextItemDescription
          data={classificationValues}
          lang={lang}
          categoryType={'Contact'}
        />
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.contact.contactAddress' defaultMessage='Contact address' />
        </Divider>
        <LangTextItemDescription
          data={initData.contactInformation?.dataSetInformation?.['contactAddress']}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.contact.telephone' defaultMessage='Telephone' />}
            labelStyle={{ width: '100px' }}
          >
            {initData.contactInformation?.dataSetInformation?.telephone ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.contact.telefax' defaultMessage='Telefax' />}
            labelStyle={{ width: '100px' }}
          >
            {initData.contactInformation?.dataSetInformation?.telefax ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />}
            labelStyle={{ width: '100px' }}
          >
            {initData.contactInformation?.dataSetInformation?.email ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.contact.WWWAddress' defaultMessage='WWW-Address' />}
            labelStyle={{ width: '140px' }}
          >
            {initData.contactInformation?.dataSetInformation?.WWWAddress ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.contact.centralContactPoint'
            defaultMessage='Central contact point'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.contactInformation?.dataSetInformation?.['centralContactPoint']}
        />
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.contact.contactDescriptionOrComment'
            defaultMessage='Contact description or comment'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.contactInformation?.dataSetInformation?.['contactDescriptionOrComment']}
        />
        <br />
        <ContractDescription
          data={initData.contactInformation?.dataSetInformation?.referenceToContact}
          lang={lang}
          title={
            <FormattedMessage id='pages.contact.referenceToContact' defaultMessage='Belongs to:' />
          }
        ></ContractDescription>
        <br />

        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.contact.referenceToLogo'
              defaultMessage='Logo of organisation or source'
            />
          }
          data={initData.contactInformation?.dataSetInformation?.referenceToLogo}
          lang={lang}
        />
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size='small'
          title={<FormattedMessage id='pages.contact.dataEntryBy' defaultMessage='Data entry by' />}
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.contact.timeStamp'
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
                id='pages.contact.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            data={
              initData.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            lang={lang}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.contact.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.contact.dataSetVersion'
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
          <ContractDescription
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
            lang={lang}
            title={
              <FormattedMessage
                id='pages.contact.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
          ></ContractDescription>
          <br />
          <ContractDescription
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToPrecedingDataSetVersion'
              ]
            }
            lang={lang}
            title={
              <FormattedMessage
                id='pages.contact.referenceToPrecedingDataSetVersion'
                defaultMessage='Preceding data set version'
              />
            }
          ></ContractDescription>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.contact.permanentDataSetURI'
                  defaultMessage='Permanent data set URI'
                />
              }
              labelStyle={{ width: '220px' }}
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
    getContactDetail(id, version).then(async (result: ContactDetailResponse) => {
      const contactData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      setInitData(contactData ? { ...contactData } : {});
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
          <FormattedMessage id='pages.contact.drawer.title.view' defaultMessage='View Contact' />
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
            {contactList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactView;
