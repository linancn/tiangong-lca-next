import { getTeamMessageApi } from '@/services/teams/api';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Image, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

const LogoBaseUrl = 'https://qgzvkongdjqiiamzbbts.supabase.co/storage/v1/object/public/sys-files/';

type Props = {
  id: string;
  buttonType: string;
};

const TeamView: FC<Props> = ({ id, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});

  const teamContent: React.ReactNode = (
    <>
      <Card size="small" title={<FormattedMessage id="pages.team.info.title" defaultMessage="Team Name" />}>
        <Descriptions bordered size={'small'} column={1}>
          {initData?.json?.title?.map((item: { '#text': string; '@xml:lang': string }, index: number) => (
            <Descriptions.Item
              key={index}
              label={item['@xml:lang'] === 'zh' ? '简体中文' : 'English'}
              labelStyle={{ width: '120px' }}
            >
              {item['#text'] || '-'}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
      <br />
      <Card size="small" title={<FormattedMessage id="pages.team.info.description" defaultMessage="Team Description" />}>
        <Descriptions bordered size={'small'} column={1}>
          {initData?.json?.description?.map((item: { '#text': string; '@xml:lang': string }, index: number) => (
            <Descriptions.Item
              key={index}
              label={item['@xml:lang'] === 'zh' ? '简体中文' : 'English'}
              labelStyle={{ width: '120px' }}
            >
              {item['#text'] || '-'}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
      <br />
      <Card size="small" title={<FormattedMessage id="pages.team.info.public" defaultMessage="Public Display" />}>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item  label={<FormattedMessage id="pages.team.info.public" defaultMessage="Public Display" />} labelStyle={{ width: '120px' }}>
            {initData?.rank === -1 ? <FormattedMessage id="component.allTeams.drawer.public" defaultMessage="Public Display" /> : <FormattedMessage id="component.allTeams.drawer.public" defaultMessage="Not Public Display" />}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <br />
      <Card size="small" title={<FormattedMessage id="component.allTeams.logo.title" defaultMessage="Team Logo" />}>
        <Space direction="vertical" size="middle">
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              label={<FormattedMessage id="pages.team.info.lightLogo" defaultMessage="Light Logo" />}
              labelStyle={{ width: '120px' }}
            >
              {initData?.json?.lightLogo ? (
                <Image
                  width={100}
                  src={LogoBaseUrl + initData?.json?.lightLogo}
                  alt="Light Logo"
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              label={<FormattedMessage id="pages.team.info.darkLogo" defaultMessage="Dark Logo" />}
              labelStyle={{ width: '120px' }}
            >
              {initData?.json?.darkLogo ? (
                <Image
                  width={100}
                  src={LogoBaseUrl + initData?.json?.darkLogo}
                  alt="Dark Logo"
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
    </>
  );

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getTeamMessageApi(id).then(async (result: any) => {
      if (result.data && result.data.length > 0) {
        setInitData(result.data[0]);
      }
      setSpinning(false);
    });
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="component.allTeams.table.view" defaultMessage="View" />}>
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="component.allTeams.table.view" defaultMessage="View" />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id="component.allTeams.drawer.title.view" defaultMessage="View Team" />
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>
          {teamContent}
        </Spin>
      </Drawer>
    </>
  );
};

export default TeamView;
