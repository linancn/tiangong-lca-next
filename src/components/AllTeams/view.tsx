import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeamMessageApi } from '@/services/teams/api';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Image, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
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
      <Card
        size='small'
        title={<FormattedMessage id='pages.team.info.title' defaultMessage='Team Name' />}
      >
        <Descriptions bordered size={'small'} column={1}>
          {initData?.json?.title?.map(
            (item: { '#text': string; '@xml:lang': string }, index: number) => (
              <Descriptions.Item
                key={index}
                label={item['@xml:lang'] === 'zh' ? '简体中文' : 'English'}
                labelStyle={{ width: '120px' }}
              >
                {item['#text'] || '-'}
              </Descriptions.Item>
            ),
          )}
        </Descriptions>
      </Card>
      <br />
      <Card
        size='small'
        title={
          <FormattedMessage id='pages.team.info.description' defaultMessage='Team Description' />
        }
      >
        <Descriptions bordered size={'small'} column={1}>
          {initData?.json?.description?.map(
            (item: { '#text': string; '@xml:lang': string }, index: number) => (
              <Descriptions.Item
                key={index}
                label={item['@xml:lang'] === 'zh' ? '简体中文' : 'English'}
                labelStyle={{ width: '120px' }}
              >
                {item['#text'] || '-'}
              </Descriptions.Item>
            ),
          )}
        </Descriptions>
      </Card>
      <br />
      <Card
        size='small'
        title={<FormattedMessage id='pages.team.info.public' defaultMessage='Public Display' />}
      >
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            label={<FormattedMessage id='pages.team.info.public' defaultMessage='Public Display' />}
            labelStyle={{ width: '120px' }}
          >
            {initData?.rank === -1 ? (
              <FormattedMessage
                id='component.allTeams.drawer.public'
                defaultMessage='Public Display'
              />
            ) : initData?.rank === 0 ? (
              <FormattedMessage
                id='component.allTeams.drawer.public'
                defaultMessage='Not Public Display'
              />
            ) : (
              '-'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <br />
      <Card
        size='small'
        title={<FormattedMessage id='component.allTeams.logo.title' defaultMessage='Team Logo' />}
      >
        <Space direction='vertical' size='middle'>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              label={
                <FormattedMessage id='pages.team.info.lightLogo' defaultMessage='Light Logo' />
              }
              labelStyle={{ width: '120px' }}
            >
              {initData?.json?.lightLogoPreviewUrl ? (
                <Image width={100} src={initData?.json?.lightLogoPreviewUrl} alt='Light Logo' />
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              label={<FormattedMessage id='pages.team.info.darkLogo' defaultMessage='Dark Logo' />}
              labelStyle={{ width: '120px' }}
            >
              {initData?.json?.darkLogoPreviewUrl ? (
                <Image
                  style={
                    initData?.json?.darkLogoPreviewUrl
                      ? { background: '#141414', display: 'inline-block', borderRadius: '8px' }
                      : {}
                  }
                  width={100}
                  src={initData?.json?.darkLogoPreviewUrl}
                  alt='Dark Logo'
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
    getTeamMessageApi(id)
      .then(async (result: any) => {
        if (result.data && result.data.length > 0) {
          const { lightLogo, darkLogo } = result.data[0]?.json;
          Promise.all([
            getThumbFileUrls([{ '@uri': `${lightLogo}` }]).then((res) => {
              if (res[0]?.status === 'done') {
                result.data[0].json.lightLogoPreviewUrl = res[0]?.thumbUrl;
              }
            }),
            getThumbFileUrls([{ '@uri': `${darkLogo}` }]).then((res) => {
              if (res[0]?.status === 'done') {
                result.data[0].json.darkLogoPreviewUrl = res[0]?.thumbUrl;
              }
            }),
          ])
            .then(() => {
              setInitData(result.data[0]);
            })
            .finally(() => {
              setSpinning(false);
            });
        }
      })
      .finally(() => {
        setSpinning(false);
      });
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id='component.allTeams.table.view' defaultMessage='View' />}
        >
          <Button shape='circle' icon={<ProfileOutlined />} size='small' onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='component.allTeams.table.view' defaultMessage='View' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='component.allTeams.drawer.title.view' defaultMessage='View Team' />
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>{teamContent}</Spin>
      </Drawer>
    </>
  );
};

export default TeamView;
