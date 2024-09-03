import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Space } from 'antd';
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
  const tabList = [
    {
      key: 'contactInformation',
      tab: (
        <FormattedMessage
          id="pages.contact.contactInformation"
          defaultMessage="Contact Information"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.contact.administrativeInformation"
          defaultMessage="Administrative Information"
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
            title={<FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />}
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'common:shortName']}
              label={<FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />}
            />
          </Card>
          <Card
            size="small"
            title={<FormattedMessage id="pages.contact.name" defaultMessage="Name" />}
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'common:name']}
              label={<FormattedMessage id="pages.contact.name" defaultMessage="Name" />}
            />
          </Card>
          <Card
            size="small"
            title={
              <FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />
            }
          >
            <LevelTextItemForm
              name={[
                'contactInformation',
                'dataSetInformation',
                'classificationInformation',
                'common:classification',
                'common:class',
              ]}
              dataType={'Contact'}
              formRef={formRef}
              onData={onData}
            />
          </Card>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.contactAddress"
                defaultMessage="Contact Address"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactAddress']}
              label={
                <FormattedMessage
                  id="pages.contact.contactAddress"
                  defaultMessage="Contact Address"
                />
              }
            />
          </Card>
          <Form.Item
            label={<FormattedMessage id="pages.contact.telephone" defaultMessage="Telephone" />}
            name={['contactInformation', 'dataSetInformation', 'telephone']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.telefax" defaultMessage="Telefax" />}
            name={['contactInformation', 'dataSetInformation', 'telefax']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.email" defaultMessage="Email" />}
            name={['contactInformation', 'dataSetInformation', 'email']}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.WWWAddress" defaultMessage="WWWAddress" />}
            name={['contactInformation', 'dataSetInformation', 'WWWAddress']}
          >
            <Input />
          </Form.Item>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.centralContactPoint"
                defaultMessage="Central Contact Point"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'centralContactPoint']}
              label={
                <FormattedMessage
                  id="pages.contact.centralContactPoint"
                  defaultMessage="Central Contact Point"
                />
              }
            />
          </Card>
          <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.contact.contactDescriptionOrComment"
                defaultMessage="Contact Description Or Comment"
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactDescriptionOrComment']}
              label={
                <FormattedMessage
                  id="pages.contact.contactDescriptionOrComment"
                  defaultMessage="Contact Description Or Comment"
                />
              }
            />
          </Card>
          <ContactSelectForm
            label={
              <FormattedMessage
                id="pages.contact.referenceToContact"
                defaultMessage="Reference To Contact"
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
              <FormattedMessage id="pages.contact.dataEntryBy" defaultMessage="Data Entry By" />
            }
          >
            <Form.Item
              label={<FormattedMessage id="pages.contact.timeStamp" defaultMessage="Time Stamp" />}
              name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            >
              <Input disabled={true} style={{ color: '#000' }} />
            </Form.Item>
            <br />
            <SourceSelectForm
              label={
                <FormattedMessage
                  id="pages.contact.referenceToDataSetFormat"
                  defaultMessage="Reference To Data Set Format"
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
                defaultMessage="Publication And Ownership"
              />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.contact.dataSetVersion"
                  defaultMessage="Data Set Version"
                />
              }
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:dataSetVersion',
              ]}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="validator.dataSetVersion.empty"
                      defaultMessage="Please input the Data Set Version!"
                    />
                  ),
                },
                {
                  pattern: /^\d{2}\.\d{2}\.\d{3}$/,
                  message: (
                    <FormattedMessage
                      id="validator.dataSetVersion.pattern"
                      defaultMessage="Version format must be XX.XX.XXX, where X is a digit!"
                    />
                  ),
                },
              ]}
            >
              <Input />
            </Form.Item>
            <ContactSelectForm
              label={
                <FormattedMessage
                  id="pages.contact.referenceToPrecedingDataSetVersion"
                  defaultMessage="Reference To Preceding Data Set Version"
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
                  defaultMessage="Permanent Data Set URI"
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
        {tabContent[activeTabKey]}
      </Card>
      <Form.Item name="id" hidden>
        <Input />
      </Form.Item>
    </>
  );
};
