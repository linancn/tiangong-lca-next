import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';
import schema from '@/pages/Contacts/contacts_schema.json';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Space, theme } from 'antd';
import { FC, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onTabChange: (key: string) => void;
  formType?: string;
};

export const ContactForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onTabChange,
  formType,
}) => {
  const { token } = theme.useToken();
  const [showShortNameError, setShowShortNameError] = useState(false);
  const [showNameError, setShowNameError] = useState(false);

  const tabList = [
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
  const tabContent: { [key: string]: JSX.Element } = {
    contactInformation: (
      <>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Card
            size='small'
            title={
              <RequiredMark
                showError={showShortNameError}
                label={
                  <FormattedMessage
                    id='pages.contact.shortName'
                    defaultMessage='Short name for contact'
                  />
                }
              />
            }
          >
            <LangTextItemForm
              formRef={formRef}
              setRuleErrorState={setShowShortNameError}
              name={['contactInformation', 'dataSetInformation', 'common:shortName']}
              label={
                <FormattedMessage
                  id='pages.contact.shortName'
                  defaultMessage='Short name for contact'
                />
              }
              rules={getRules(
                schema['contactDataSet']['contactInformation']['dataSetInformation'][
                  'common:shortName'
                ]['rules'] ?? [],
              )}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <RequiredMark
                showError={showNameError}
                label={
                  <FormattedMessage id='pages.contact.name' defaultMessage='Name of contact' />
                }
              />
            }
          >
            <LangTextItemForm
              formRef={formRef}
              setRuleErrorState={setShowNameError}
              name={['contactInformation', 'dataSetInformation', 'common:name']}
              label={<FormattedMessage id='pages.contact.name' defaultMessage='Name of contact' />}
              rules={getRules(
                schema['contactDataSet']['contactInformation']['dataSetInformation']['common:name'][
                  'rules'
                ] ?? [],
              )}
            />
          </Card>
          <br />
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
            rules={getRules(
              schema['contactDataSet']['contactInformation']['dataSetInformation'][
                'classificationInformation'
              ]['common:classification']['rules'] ?? [],
            )}
          />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.contact.contactAddress'
                defaultMessage='Contact address'
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactAddress']}
              label={
                <FormattedMessage
                  id='pages.contact.contactAddress'
                  defaultMessage='Contact address'
                />
              }
              rules={getRules(
                schema['contactDataSet']['contactInformation']['dataSetInformation'][
                  'contactAddress'
                ]['rules'] ?? [],
              )}
            />
          </Card>
          <br />
          <Form.Item
            label={<FormattedMessage id='pages.contact.telephone' defaultMessage='Telephone' />}
            name={['contactInformation', 'dataSetInformation', 'telephone']}
            rules={getRules(
              schema['contactDataSet']['contactInformation']['dataSetInformation']['telephone'][
                'rules'
              ] ?? [],
            )}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id='pages.contact.telefax' defaultMessage='Telefax' />}
            name={['contactInformation', 'dataSetInformation', 'telefax']}
            rules={getRules(
              schema['contactDataSet']['contactInformation']['dataSetInformation']['telefax'][
                'rules'
              ] ?? [],
            )}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />}
            name={['contactInformation', 'dataSetInformation', 'email']}
            rules={getRules(
              schema['contactDataSet']['contactInformation']['dataSetInformation']['email'][
                'rules'
              ] ?? [],
            )}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id='pages.contact.WWWAddress' defaultMessage='WWW-Address' />}
            name={['contactInformation', 'dataSetInformation', 'WWWAddress']}
            rules={getRules(
              schema['contactDataSet']['contactInformation']['dataSetInformation']['WWWAddress'][
                'rules'
              ] ?? [],
            )}
          >
            <Input />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.contact.centralContactPoint'
                defaultMessage='Central contact point'
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'centralContactPoint']}
              label={
                <FormattedMessage
                  id='pages.contact.centralContactPoint'
                  defaultMessage='Central contact point'
                />
              }
              rules={getRules(
                schema['contactDataSet']['contactInformation']['dataSetInformation'][
                  'centralContactPoint'
                ]['rules'] ?? [],
              )}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.contact.contactDescriptionOrComment'
                defaultMessage='Contact description or comment'
              />
            }
          >
            <LangTextItemForm
              name={['contactInformation', 'dataSetInformation', 'contactDescriptionOrComment']}
              label={
                <FormattedMessage
                  id='pages.contact.contactDescriptionOrComment'
                  defaultMessage='Contact description or comment'
                />
              }
              rules={getRules(
                schema['contactDataSet']['contactInformation']['dataSetInformation'][
                  'contactDescriptionOrComment'
                ]['rules'] ?? [],
              )}
            />
          </Card>
          <br />
          <ContactSelectForm
            label={
              <FormattedMessage
                id='pages.contact.referenceToContact'
                defaultMessage='Belongs to:'
              />
            }
            name={['contactInformation', 'dataSetInformation', 'referenceToContact']}
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
          <br />
          <SourceSelectForm
            label={
              <FormattedMessage
                id='pages.contact.referenceToLogo'
                defaultMessage='Logo of organisation or source'
              />
            }
            name={['contactInformation', 'dataSetInformation', 'referenceToLogo']}
            lang={lang}
            formRef={formRef}
            onData={onData}
          />
        </Space>
      </>
    ),
    administrativeInformation: (
      <>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Card
            size='small'
            title={
              <FormattedMessage id='pages.contact.dataEntryBy' defaultMessage='Data entry by' />
            }
          >
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.contact.timeStamp'
                  defaultMessage='Time stamp (last saved)'
                />
              }
              rules={getRules(
                schema['contactDataSet']['administrativeInformation']['dataEntryBy'][
                  'common:timeStamp'
                ]['rules'] ?? [],
              )}
              name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            >
              <Input disabled={true} style={{ color: token.colorTextDescription }} />
            </Form.Item>
            <SourceSelectForm
              defaultSourceName={formType === 'create' ? 'ILCD format' : undefined}
              label={
                <FormattedMessage
                  id='pages.contact.referenceToDataSetFormat'
                  defaultMessage='Data set format(s)'
                />
              }
              rules={getRules(
                schema['contactDataSet']['administrativeInformation']['dataEntryBy'][
                  'common:referenceToDataSetFormat'
                ]['rules'] ?? [],
              )}
              name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
              lang={lang}
              formRef={formRef}
              onData={onData}
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
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.contact.dataSetVersion'
                  defaultMessage='Data set version'
                />
              }
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:dataSetVersion',
              ]}
              rules={getRules(
                schema['contactDataSet']['administrativeInformation']['publicationAndOwnership'][
                  'common:dataSetVersion'
                ]['rules'] ?? [],
              )}
            >
              <Input />
            </Form.Item>
            <ContactSelectForm
              label={
                <FormattedMessage
                  id='pages.contact.referenceToOwnershipOfDataSet'
                  defaultMessage='Owner of data set'
                />
              }
              rules={getRules(
                schema['contactDataSet']['administrativeInformation']['publicationAndOwnership'][
                  'common:referenceToOwnershipOfDataSet'
                ]['rules'] ?? [],
              )}
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToOwnershipOfDataSet',
              ]}
              lang={lang}
              formRef={formRef}
              onData={onData}
            />
            <br />
            {/* <ContactSelectForm
              label={
                <FormattedMessage
                  id='pages.contact.referenceToPrecedingDataSetVersion'
                  defaultMessage='Preceding data set version'
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
            <br /> */}
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.contact.permanentDataSetURI'
                  defaultMessage='Permanent data set URI'
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
