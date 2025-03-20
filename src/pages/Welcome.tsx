import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import { Card, Col, Divider, Row, Statistic, StatisticProps, theme } from 'antd';
import React, { useEffect, useState } from 'react';

import { getTeams } from '@/services/teams/api';
import { PageContainer } from '@ant-design/pro-components';
import Meta from 'antd/es/card/Meta';
import CountUp from 'react-countup';
import { FormattedMessage, useIntl } from 'umi';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const LogoBaseUrl =
    'https://qgzvkongdjqiiamzbbts.supabase.co/storage/v1/object/public/sys-files/';

  const { locale } = useIntl();
  const lang = getLang(locale);

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const [color3, setColor3] = useState(token.colorPrimary);

  const [teams, setTeams] = React.useState<any>(null);

  useEffect(() => {
    if (teams) {
      return;
    }
    getTeams().then((res) => {
      console.log(res);
      setTeams(res.data);
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      setColor3('#9e3ffd');
    } else {
      setColor3(token.colorPrimary);
    }
  }, [isDarkMode]);

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
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={
                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: color3 }}>
                  {getLangText(info.data1.title, lang)}
                </span>
              }
              value={info.data1.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: color3 }}>
                  {getLangText(info.data2.title, lang)}
                </span>
              }
              value={info.data2.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: color3 }}>
                  {getLangText(info.data3.title, lang)}
                </span>
              }
              value={info.data3.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: color3 }}>
                  {getLangText(info.data4.title, lang)}
                </span>
              }
              value={info.data4.value}
              formatter={formatter}
            />
          </Col>
        </Row>
        <br />
        <Divider
          orientation='left'
          orientationMargin='0'
          style={{ fontSize: '1.2em', fontWeight: 'bold', color: token.colorText }}
        >
          <FormattedMessage id='pages.dataEcosystem' defaultMessage='Data Ecosystem' />
        </Divider>
        <Row gutter={16}>
          {teams?.map((team: any, index: React.Key | null | undefined) => {
            const logo = isDarkMode ? team.json?.darkLogo : team.json?.lightLogo;
            const logoUrl = logo.startsWith('logo/')
              ? LogoBaseUrl + logo
              : `/images/dataLogo/${logo}`;
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
                      <img src={logoUrl} className={styles.team_logo} />
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
      </div>
    </PageContainer>
  );
};

export default Welcome;
