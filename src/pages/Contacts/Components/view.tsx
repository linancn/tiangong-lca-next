import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { getContactDetail } from '@/services/contacts/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactDelete from './delete';
import ContactEdit from './edit';

type Props = {
  id: string;
  dataSource: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactView: FC<Props> = ({ id, dataSource, buttonType, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getContactDetail(id).then(async (result: any) => {
      setInitData(result.data.json?.contactDataSet);
      if (dataSource === 'my') {
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
        title={
          <FormattedMessage id="pages.contact.drawer.title.view" defaultMessage="View Contact" />
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
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
              {initData.contactInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Name
          </Divider>
          <LangTextItemDescription
            data={initData.contactInformation?.dataSetInformation?.['common:name']}
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Short Name
          </Divider>
          <LangTextItemDescription
            data={initData.contactInformation?.dataSetInformation?.['common:shortName']}
          />
          <Divider orientationMargin="0" orientation="left" plain>
            Classification
          </Divider>
          <LevelTextItemDescription
            data={
              initData.contactInformation?.dataSetInformation?.classificationInformation?.[
                'common:classification'
              ]?.['common:class']
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Email" labelStyle={{ width: '100px' }}>
              {initData.contactInformation?.dataSetInformation?.email ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="version" labelStyle={{ width: '100px' }}>
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactView;
