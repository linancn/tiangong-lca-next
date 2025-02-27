import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import {
  STMultiLang_o,
  STMultiLang_r,
  StringMultiLang_r,
  String_o,
  WWWAddress,
  dataSetVersion,
  emailvalidation,
} from '@/components/Validator/index';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Space, theme } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
};

export const ContactForm: FC<Props> = ({ lang, activeTabKey, formRef, onData, onTabChange }) => {
  const { token } = theme.useToken();
  const tabList = [
    {
      key: 'contactInformation',
      tab: (
        <FormattedMessage
          id="pages.contact.contactInformation"
          defaultMessage="Contact information"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.contact.administrativeInformation"
          defaultMessage="Administrative information"
        />
      ),
    },
  ];
  const tabContent: { [key: string]: JSX.Element } = {
    contactInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.shortName"
                defaultMessage="Short name for contact"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'common:shortName']}
              label={
                <FormattedMessage
                  id="pages.contact.shortName"
                  defaultMessage="Short name for contact"
                />
              }
              rules={StringMultiLang_r}
            />
          </Card>
          <Card
            size="small"
            title={<FormattedMessage id="pages.contact.name" defaultMessage="Name of contact" />}
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'common:name']}
              label={<FormattedMessage id="pages.contact.name" defaultMessage="Name of contact" />}
              rules={StringMultiLang_r}
            />
          </Card>
          <LevelTextItemForm
            name={[
              'contactInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            lang={lang}
            dataType={'Contact'}
            formRef={formRef}
            onData={onData}
          />
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.contactAddress"
                defaultMessage="Contact address"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactAddress']}
              label={
                <FormattedMessage
                  id="pages.contact.contactAddress"
                  defaultMessage="Contact address"
                />
              }
              rules={STMultiLang_o}
            />
          </Card>
          <Form.Item
            label={<FormattedMessage id="pages.contact.telephone" defaultMessage="Telephone" />}
            name={['contactInformation', 'dataSetInformation', 'telephone']}
            rules={String_o}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.telefax" defaultMessage="Telefax" />}
            name={['contactInformation', 'dataSetInformation', 'telefax']}
            rules={String_o}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.email" defaultMessage="E-mail" />}
            name={['contactInformation', 'dataSetInformation', 'email']}
            rules={emailvalidation}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.WWWAddress" defaultMessage="WWW-Address" />}
            name={['contactInformation', 'dataSetInformation', 'WWWAddress']}
            rules={WWWAddress}
          >
            <Input />
          </Form.Item>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.centralContactPoint"
                defaultMessage="Central contact point"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'centralContactPoint']}
              label={
                <FormattedMessage
                  id="pages.contact.centralContactPoint"
                  defaultMessage="Central contact point"
                />
              }
              rules={STMultiLang_r}
            />
          </Card>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.contactDescriptionOrComment"
                defaultMessage="Contact description or comment"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactDescriptionOrComment']}
              label={
                <FormattedMessage
                  id="pages.contact.contactDescriptionOrComment"
                  defaultMessage="Contact description or comment"
                />
              }
              rules={STMultiLang_o}
            />
          </Card>
          <ContactSelectForm
            label={
              <FormattedMessage
                id="pages.contact.referenceToContact"
                defaultMessage="Belongs to:"
              />
            }
            name={['contactInformation', 'dataSetInformation', 'referenceToContact']}
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Space>
      </>
    ),
    administrativeInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card
            size="small"
            title={
              <FormattedMessage id="pages.contact.dataEntryBy" defaultMessage="Data entry by" />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.contact.timeStamp"
                  defaultMessage="Time stamp (last saved)"
                />
              }
              name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            >
              <Input disabled={true} style={{ color: token.colorTextDescription }} />
            </Form.Item>
            <br />
            <SourceSelectForm
              label={
                <FormattedMessage
                  id="pages.contact.referenceToDataSetFormat"
                  defaultMessage="Data set format(s)"
                />
              }
              name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
              lang={lang}
              formRef={formRef}
              onData={onData}
            />
          </Card>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.publicationAndOwnership"
                defaultMessage="Publication and ownership"
              />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.contact.dataSetVersion"
                  defaultMessage="Data set version"
                />
              }
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:dataSetVersion',
              ]}
              rules={dataSetVersion}
            >
              <Input />
            </Form.Item>
            <ContactSelectForm
              label={
                <FormattedMessage
                  id="pages.contact.referenceToPrecedingDataSetVersion"
                  defaultMessage="Preceding data set version"
                />
              }
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToPrecedingDataSetVersion',
              ]}
              lang={lang}
              formRef={formRef}
              onData={onData}
            />
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.contact.permanentDataSetURI"
                  defaultMessage="Permanent data set URI"
                />
              }
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:permanentDataSetURI',
              ]}
            >
              <Input />
            </Form.Item>
          </Card>
        </Space>
      </>
    ),
  };

  return (
    <>
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {Object.keys(tabContent).map((key) => (
          <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
            {tabContent[key]}
          </div>
        ))}
      </Card>
      {/* <Form.Item name="id" hidden>
        <Input />
      </Form.Item> */}
    </>
  );
};
