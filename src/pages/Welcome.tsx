import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import {
  BuildOutlined,
  ProductOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Col, Modal, Row, Spin, Statistic, StatisticProps, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';

import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import { PageContainer } from '@ant-design/pro-components';
import Meta from 'antd/es/card/Meta';
import CountUp from 'react-countup';
import { FormattedMessage, useIntl } from 'umi';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  const { locale } = useIntl();
  const lang = getLang(locale);

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const [color3, setColor3] = useState(token.colorPrimary);

  const [teams, setTeams] = React.useState<any>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [modalWidth, setModalWidth] = useState(720);

  const loadTeams = React.useCallback(async () => {
    if (teams || isTeamsLoading) {
      return;
    }
    setIsTeamsLoading(true);
    try {
      const res = await getTeams();
      if (res?.data && res.data.length > 0) {
        const processTeams = [...res.data];
        const promises = processTeams.map(async (team, index) => {
          if (team.json?.lightLogo) {
            const thumbResult = await getThumbFileUrls([{ '@uri': `${team.json.lightLogo}` }]);
            if (thumbResult[0]?.status === 'done') {
              processTeams[index].json.previewLightUrl = thumbResult[0].thumbUrl;
            }
          }
          if (team.json?.darkLogo) {
            const thumbResult = await getThumbFileUrls([{ '@uri': `${team.json.darkLogo}` }]);
            if (thumbResult[0]?.status === 'done') {
              processTeams[index].json.previewDarkUrl = thumbResult[0].thumbUrl;
            }
          }
          return team;
        });

        await Promise.all(promises);
        setTeams(processTeams);
      } else {
        setTeams(res?.data);
      }
    } finally {
      setIsTeamsLoading(false);
    }
  }, [isTeamsLoading, teams]);

  useEffect(() => {
    if (isDarkMode) {
      setColor3('#9e3ffd');
    } else {
      setColor3(token.colorPrimary);
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (isDataModalOpen) {
      loadTeams();
    }
  }, [isDataModalOpen, loadTeams]);

  useEffect(() => {
    if (!isDataModalOpen) {
      return;
    }
    const resize = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const maxWidth = 1600;
      const horizontalGap = 48;
      const availableWidth = Math.min(window.innerWidth, maxWidth);
      const preferredWidth = Math.min(Math.max(window.innerWidth - horizontalGap, 0), maxWidth);
      setModalWidth(preferredWidth > 0 ? preferredWidth : availableWidth);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [isDataModalOpen]);

  const info = {
    data1: {
      value: 12320,
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '单元过程 & 清单',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Unit Processs & Inventories',
        },
      ],
    },
    data2: {
      value: 78,
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '行业 / 部门',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Domains / Sectors',
        },
      ],
    },
    data3: {
      value: 2670,
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '产品',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Products',
        },
      ],
    },
    data4: {
      value: 170,
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '全球贡献者',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Global Contributors',
        },
      ],
    },
    data5: {
      value: 9,
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '数据团队',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Data Teams',
        },
      ],
    },
  };

  const formatter: StatisticProps['formatter'] = (value) => (
    <CountUp end={value as number} separator=',' />
  );

  return (
    <PageContainer title={false}>
      <div
        style={{
          backgroundPosition: '100% -30%',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '274px auto',
        }}
      >
        <Row gutter={16}>
          <Col span={8}></Col>
        </Row>
        <Row gutter={16} wrap={false}>
          <Col flex='1 0 20%'>
            <Statistic
              title={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    color: color3,
                  }}
                >
                  <ShareAltOutlined style={{ marginRight: '0.4em' }} />
                  {getLangText(info.data1.title, lang)}
                </span>
              }
              value={info.data1.value}
              formatter={formatter}
            />
          </Col>
          <Col flex='1 0 20%'>
            <Statistic
              title={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    color: color3,
                  }}
                >
                  <BuildOutlined style={{ marginRight: '0.4em' }} />
                  {getLangText(info.data2.title, lang)}
                </span>
              }
              value={info.data2.value}
              formatter={formatter}
            />
          </Col>
          <Col flex='1 0 20%'>
            <Statistic
              title={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    color: color3,
                  }}
                >
                  <ProductOutlined style={{ marginRight: '0.4em' }} />
                  {getLangText(info.data3.title, lang)}
                </span>
              }
              value={info.data3.value}
              formatter={formatter}
            />
          </Col>
          <Col flex='1 0 20%'>
            <Statistic
              title={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    color: color3,
                  }}
                >
                  <UserOutlined style={{ marginRight: '0.4em' }} />
                  {getLangText(info.data4.title, lang)}
                </span>
              }
              value={info.data4.value}
              formatter={formatter}
            />
          </Col>
          <Col flex='1 0 20%'>
            <Typography.Link
              onClick={(event: React.MouseEvent<HTMLElement>) => {
                event.preventDefault();
                setIsDataModalOpen(true);
              }}
              style={{ display: 'block' }}
            >
              <Statistic
                title={
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      color: color3,
                    }}
                  >
                    <TeamOutlined style={{ marginRight: '0.4em' }} />
                    {getLangText(info.data5.title, lang)}
                  </span>
                }
                value={info.data5.value}
                formatter={formatter}
              />
            </Typography.Link>
          </Col>
        </Row>
      </div>
      <Modal
        open={isDataModalOpen}
        onCancel={() => setIsDataModalOpen(false)}
        footer={null}
        width={modalWidth}
        title={<FormattedMessage id='pages.dataEcosystem' defaultMessage='Data Ecosystem' />}
      >
        {isTeamsLoading ? (
          <Row justify='center'>
            <Spin />
          </Row>
        ) : (
          <Row gutter={16}>
            {teams?.map((team: any, index: React.Key | null | undefined) => {
              let logoUrl = '';
              if (team.json?.previewLightUrl) {
                logoUrl = isDarkMode ? team.json?.previewDarkUrl : team.json?.previewLightUrl;
              } else {
                logoUrl = isDarkMode
                  ? `/images/dataLogo/${team.json?.darkLogo}`
                  : `/images/dataLogo/${team.json?.lightLogo}`;
              }
              return (
                <Col span={8} key={index}>
                  <Card
                    hoverable
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      paddingTop: '24px',
                    }}
                    cover={
                      <div className={styles.team_logo_container}>
                        {logoUrl && <img src={logoUrl} className={styles.team_logo} />}
                      </div>
                    }
                    onClick={() => {
                      window.location.href = `/tgdata/models?tid=${team.id}`;
                    }}
                  >
                    <Meta
                      title={getLangText(team.json?.title, lang)}
                      description={getLangText(team.json?.description, lang)}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Modal>
    </PageContainer>
  );
};

export default Welcome;
