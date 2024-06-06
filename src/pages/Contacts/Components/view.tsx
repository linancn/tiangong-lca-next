import { getContactView } from '@/services/contacts/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
};
const ContactView: FC<Props> = ({ id }) => {
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();

  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );

    getContactView(id).then(async (result: any) => {
      setViewDescriptions(
        <>
          <Descriptions column={1}>
            <p>Name</p>
            {result.data.name.map((name: any, index: number) => (
              <Descriptions.Item key={index} label={name['@xml:lang']}>
                {name['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
            <p>Short Name</p>
            {result.data.shortName.map((shortName: any, index: number) => (
              <Descriptions.Item key={index} label={shortName['@xml:lang']}>
                {shortName['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
            <p>Classification</p>
            <Descriptions.Item key={0} label="Level 1">
              {result.data.classification['@level_0'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 2">
              {result.data.classification['@level_1'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 3">
              {result.data.classification['@level_2'] ?? '-'}
            </Descriptions.Item>
            <p></p>
            <Descriptions.Item key={0} label="ID">
              {result.data.id ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Email">
              {result.data.email ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="version">
              {result.data.version ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Created At">
              {result.data.createdAt ?? '-'}
            </Descriptions.Item>
          </Descriptions>
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
        // footer={
        //   <Space size={'middle'} className={styles.footer_right}>
        //     {footerButtons}
        //   </Space>
        // }
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
