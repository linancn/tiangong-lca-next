import { getContactDetail } from '@/services/contacts/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactDelete from './delete';
import ContactEdit from './edit';

type Props = {
  id: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactView: FC<Props> = ({ id, actionRef }) => {
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

    getContactDetail(id).then(async (result: any) => {
      setViewDescriptions(
        <>
          <p>
            <br /> Name
          </p>
          <Descriptions bordered size={'small'} column={1}>
            {result.data['common:name'].map((name: any, index: number) => (
              <Descriptions.Item key={index} label={name['@xml:lang']}>
                {name['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
          </Descriptions>
          <p>
            <br /> Short Name
          </p>
          <Descriptions bordered size={'small'} column={1}>
            {result.data['common:shortName'].map((shortName: any, index: number) => (
              <Descriptions.Item key={index} label={shortName['@xml:lang']}>
                {shortName['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
          </Descriptions>
          <p>
            <br />
            Classification
          </p>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Level 1">
              {result.data['common:class']['@level_0'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 2">
              {result.data['common:class']['@level_1'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 3">
              {result.data['common:class']['@level_2'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <p>
            <br />
          </p>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="ID">
              {result.data.id ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Email">
              {result.data.email ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="version">
              {result.data['common:dataSetVersion'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Created At">
              {result.data.createdAt ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </>,
      );
      setFooterButtons(
        <>
          <ContactDelete
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
          />
        </>,
      );
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

export default ContactView;
