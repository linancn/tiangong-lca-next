import ContactSelectDrawer from '@/pages/Contacts/Components/select/drawer';
import { getContactDetail } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import { getLang, getLangText, jsonToList } from '@/services/general/util';
import { addReviewMemberApi } from '@/services/roles/api';
import { getUserInfoByEmail, updateUserContact } from '@/services/users/api';
import { SearchOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  FormInstance,
  Input,
  message,
  Modal,
  Spin,
} from 'antd';
import { useEffect, useRef, useState } from 'react';

interface AddMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface UserInfo {
  id: string;
  raw_user_meta_data: {
    sub: string;
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    display_name?: string;
  };
}

interface ContactInfo {
  '@refObjectId': string;
  '@type': string;
  '@uri': string;
  '@version': string;
  'common:shortDescription': Array<{
    '#text': string;
    '@xml:lang': string;
  }>;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onCancel, onSuccess }) => {
  const formRef = useRef<FormInstance>(null);
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const intl = useIntl();
  const lang = getLang(intl.locale);

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
      setUserInfo(null);
      setContactInfo(null);
    }
  }, [open]);

  const handleQuery = async () => {
    try {
      const email = formRef?.current?.getFieldValue('email');
      if (!email) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.members.email.required',
            defaultMessage: 'Please enter an email address',
          }),
        );
        return;
      }

      setQueryLoading(true);
      const result = await getUserInfoByEmail(email);

      if (result.success) {
        setUserInfo(result.user);
        setContactInfo(result.contact);
        message.success(
          intl.formatMessage({
            id: 'pages.review.members.querySuccess',
            defaultMessage: 'Query successful',
          }),
        );
      } else {
        setUserInfo(null);
        setContactInfo(null);
        message.error(
          intl.formatMessage({
            id: 'pages.review.members.userNotFound',
            defaultMessage: 'User not found',
          }),
        );
      }
    } catch (error) {
      console.error(error);
      message.error(
        intl.formatMessage({
          id: 'pages.review.members.queryError',
          defaultMessage: 'Query failed',
        }),
      );
    } finally {
      setQueryLoading(false);
    }
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      const result = await addReviewMemberApi(userInfo?.id ?? '');
      if (result?.error && result.error.code === '23505') {
        message.error(
          intl.formatMessage({
            id: 'pages.review.members.addError.duplicate',
            defaultMessage: 'User already exists',
          }),
        );
        setLoading(false);
        return;
      }
      const associatedContactResult = await updateUserContact(userInfo?.id ?? '', contactInfo);

      if (!result?.success || associatedContactResult.error) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.members.addError',
            defaultMessage: 'Failed to add member!',
          }),
        );
      } else {
        message.success(
          intl.formatMessage({
            id: 'pages.review.members.addSuccess',
            defaultMessage: 'Member added successfully!',
          }),
        );
        formRef?.current?.resetFields();
        setUserInfo(null);
        setContactInfo(null);
        onSuccess();
        onCancel();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handletContactData = (rowId: string, rowVersion: string) => {
    setContactLoading(true);
    getContactDetail(rowId, rowVersion).then(async (result: any) => {
      const selectedData = genContactFromData(result.data?.json?.contactDataSet ?? {});

      const contactInfo = {
        '@refObjectId': rowId,
        '@type': 'contact data set',
        '@uri': `../contacts/${rowId}.xml`,
        '@version': result.data?.version,
        'common:shortDescription':
          jsonToList(selectedData?.contactInformation?.dataSetInformation?.['common:shortName']) ??
          [],
      };
      setContactInfo(contactInfo);
      setContactLoading(false);
    });
  };

  return (
    <Modal
      title={<FormattedMessage id='pages.review.members.add' defaultMessage='Add Member' />}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okButtonProps={{ disabled: !userInfo || !contactInfo }}
      width={600}
    >
      <Form ref={formRef} layout='vertical'>
        <Form.Item
          name='email'
          label={<FormattedMessage id='pages.review.members.email' defaultMessage='Email' />}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.review.members.email.required'
                  defaultMessage='Please enter an email address!'
                />
              ),
            },
            {
              type: 'email',
              message: (
                <FormattedMessage
                  id='pages.review.members.email.invalid'
                  defaultMessage='Please enter a valid email address!'
                />
              ),
            },
          ]}
        >
          <Input
            placeholder={intl.formatMessage({
              id: 'pages.review.members.email.placeholder',
              defaultMessage: 'Please enter email and click query',
            })}
            suffix={
              <Button
                type='text'
                icon={<SearchOutlined />}
                loading={queryLoading}
                onClick={handleQuery}
                style={{ border: 'none', padding: '4px 8px' }}
              />
            }
          />
        </Form.Item>
      </Form>

      {userInfo && (
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.review.members.userInfo'
              defaultMessage='User Information'
            />
          }
          style={{ marginTop: 16 }}
        >
          <Descriptions column={1} size='small'>
            <Descriptions.Item
              label={<FormattedMessage id='pages.review.members.userId' defaultMessage='User ID' />}
            >
              {userInfo.id}
            </Descriptions.Item>
            <Descriptions.Item
              label={<FormattedMessage id='pages.review.members.email' defaultMessage='Email' />}
            >
              {userInfo.raw_user_meta_data.email}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <FormattedMessage
                  id='pages.review.members.displayName'
                  defaultMessage='Display Name'
                />
              }
            >
              {userInfo.raw_user_meta_data.display_name || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {contactInfo && (
        <Card
          size='small'
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormattedMessage
                id='pages.review.members.contactInfo'
                defaultMessage='Contact Information'
              />
              <ContactSelectDrawer buttonType='icon' lang={lang} onData={handletContactData} />
            </div>
          }
          style={{ marginTop: 16 }}
        >
          <Spin spinning={contactLoading}>
            <Descriptions column={1} size='small'>
              <Descriptions.Item
                label={
                  <FormattedMessage
                    id='pages.review.members.contactId'
                    defaultMessage='Contact ID'
                  />
                }
              >
                {contactInfo['@refObjectId']}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <FormattedMessage
                    id='pages.review.members.contactVersion'
                    defaultMessage='Contact Version'
                  />
                }
              >
                {contactInfo['@version']}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <FormattedMessage
                    id='pages.review.members.contactName'
                    defaultMessage='Contact Name'
                  />
                }
              >
                {getLangText(contactInfo['common:shortDescription'], lang)}
              </Descriptions.Item>
            </Descriptions>
          </Spin>
        </Card>
      )}

      {userInfo && !contactInfo && (
        <Card
          size='small'
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormattedMessage
                id='pages.review.members.contactInfo'
                defaultMessage='Contact Information'
              />
              <ContactSelectDrawer buttonType='icon' lang={lang} onData={handletContactData} />
            </div>
          }
          style={{ marginTop: 16 }}
        >
          <Empty
            description={
              <FormattedMessage
                id='pages.review.members.noContact'
                defaultMessage='No contact information'
              />
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      {userInfo && !contactInfo && (
        <div style={{ marginTop: 8, textAlign: 'center', color: '#999', fontSize: '12px' }}>
          <FormattedMessage
            id='pages.review.members.saveDisabled'
            defaultMessage='Both user information and contact information are required to save'
          />
        </div>
      )}
    </Modal>
  );
};

export default AddMemberModal;
