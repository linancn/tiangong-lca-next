import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import { Card, Col, Divider, Row, Statistic, StatisticProps, theme } from 'antd';
import React, { useEffect, useState } from 'react';

import { PageContainer } from '@ant-design/pro-components';
import Meta from 'antd/es/card/Meta';
import CountUp from 'react-countup';
import { FormattedMessage, useIntl } from 'umi';
import { Teams } from './TeamList/info';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  const { locale } = useIntl();
  const lang = getLang(locale);

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
  const [color1, setColor1] = useState('#16163F');
  const [color2, setColor2] = useState('#e7e7eb');
  const [color3, setColor3] = useState('#5C246A');

  useEffect(() => {
    if (isDarkMode) {
      setColor1('#e9e9c0');
      setColor2('#ddbbff');
      setColor3('#9e3ffd');
    } else {
      setColor1('#16163F');
      setColor2('#aba1ab');
      setColor3('#5C246A');
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
          '#text': 'unit processs & inventories',
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
          '#text': 'domains / sectors',
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
          '#text': 'products',
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
          '#text': 'contributors across the world',
        },
      ],
    },
  };

  const SVG1: React.FC = () => {
    return (
      <svg
        preserveAspectRatio="xMidYMid meet"
        data-bbox="26.5 23.75 147 152.5"
        viewBox="26.5 23.75 147 152.5"
        height="200"
        width="200"
        xmlns="http://www.w3.org/2000/svg"
        data-type="color"
        role="presentation"
        aria-hidden="true"
        aria-label=""
      >
        <defs>
          <style>
            {`
            #comp-kq5dfsen svg [data-color="1"] {fill: ${color1};}
            #comp-kq5dfsen svg [data-color="2"] {fill: ${color2};}
            #comp-kq5dfsen svg [data-color="3"] {fill: ${color3};}
          `}
          </style>
        </defs>
        <g>
          <path
            fill={color1}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M42 170.25a6 6 0 1 1-12 0 6 6 0 0 1 12 0z"
            data-color="1"
          ></path>
          <path
            fill={color2}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M173.5 103.75c0 31.48-25.52 57-57 57s-57-25.52-57-57 25.52-57 57-57 57 25.52 57 57z"
            data-color="2"
          ></path>
          <path
            fill={color3}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M116.5 68.75c0 24.853-20.147 45-45 45s-45-20.147-45-45 20.147-45 45-45 45 20.147 45 45z"
            data-color="3"
          ></path>
        </g>
      </svg>
    );
  };

  const SVG2: React.FC = () => {
    return (
      <svg
        preserveAspectRatio="xMidYMid meet"
        data-bbox="20 34.606 159.999 126.634"
        viewBox="20 34.606 159.999 126.634"
        height="200"
        width="200"
        xmlns="http://www.w3.org/2000/svg"
        data-type="color"
        role="presentation"
        aria-hidden="true"
        aria-label=""
      >
        <defs>
          <style>
            {`
          #comp-kq9ag33l svg [data-color="1"] {fill: ${color1};}
          #comp-kq9ag33l svg [data-color="2"] {fill: ${color2};}
          #comp-kq9ag33l svg [data-color="3"] {fill: ${color3};}
        `}
          </style>
        </defs>
        <g>
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M60.163 40.369a5.763 5.763 0 1 1-11.526 0 5.763 5.763 0 0 1 11.526 0z"
            fill={color1}
            data-color="1"
          ></path>
          <path
            d="M37.029 103.69l40.464 40.531a9.606 9.606 0 0 1 0 13.572l-.627.628a9.604 9.604 0 0 1-13.583.011l-.011-.011-40.465-40.531a9.606 9.606 0 0 1 0-13.572l.627-.628a9.604 9.604 0 0 1 13.583-.011c.005.003.008.007.012.011z"
            fill={color2}
            clipRule="evenodd"
            fillRule="evenodd"
            data-color="2"
          ></path>
          <path
            d="M62.556 144.076L162.971 43.492a9.604 9.604 0 0 1 13.583-.011l.011.011.627.628a9.606 9.606 0 0 1 0 13.572L76.777 158.276a9.604 9.604 0 0 1-13.583.011l-.011-.011-.627-.628a9.604 9.604 0 0 1 0-13.572z"
            fill={color3}
            clipRule="evenodd"
            fillRule="evenodd"
            data-color="3"
          ></path>
        </g>
      </svg>
    );
  };

  const SVG3: React.FC = () => {
    return (
      <svg
        preserveAspectRatio="xMidYMid meet"
        data-bbox="26.982 26 146.037 148"
        viewBox="26.982 26 146.037 148"
        height="200"
        width="200"
        xmlns="http://www.w3.org/2000/svg"
        data-type="color"
        role="presentation"
        aria-hidden="true"
        aria-label=""
      >
        <defs>
          <style>
            {`
          #comp-kq5dfsf71 svg [data-color="1"] {fill: ${color1};}
          #comp-kq5dfsf71 svg [data-color="2"] {fill: ${color2};}
          #comp-kq5dfsf71 svg [data-color="3"] {fill: ${color3};}
        `}
          </style>
        </defs>
        <g>
          <path
            fill={color1}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M173.019 168.11a5.89 5.89 0 1 1-11.78 0 5.89 5.89 0 0 1 11.78 0z"
            data-color="1"
          ></path>
          <path
            fill={color2}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M153.608 59.374v93.252H60.356V59.374h93.252z"
            data-color="2"
          ></path>
          <path
            fill={color3}
            clipRule="evenodd"
            fillRule="evenodd"
            d="M92.749 26v65.767H26.982V26h65.767z"
            data-color="3"
          ></path>
        </g>
      </svg>
    );
  };

  const formatter: StatisticProps['formatter'] = (value) => (
    <CountUp end={value as number} separator="," />
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
        <div
          style={{
            fontSize: '20px',
            color: token.colorTextHeading,
          }}
        >
          <FormattedMessage
            id="pages.welcome"
            defaultMessage="Welcome to TianGong LCA Data Platform"
          />
        </div>
        <p
          style={{
            fontSize: '14px',
            color: token.colorTextSecondary,
            lineHeight: '22px',
            marginTop: 16,
            marginBottom: 32,
            width: '65%',
          }}
        ></p>
        <Row gutter={16}>
          <Col span={8}>
            <Card
              hoverable
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                paddingTop: '24px',
              }}
              cover={<SVG1 />}
            >
              <Meta
                title={<FormattedMessage id="pages.card.title.1" />}
                description={<FormattedMessage id="pages.card.description.1" />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                paddingTop: '24px',
              }}
              cover={<SVG2 />}
            >
              <Meta
                title={<FormattedMessage id="pages.card.title.2" />}
                description={<FormattedMessage id="pages.card.description.2" />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                paddingTop: '24px',
              }}
              cover={<SVG3 />}
            >
              <Meta
                title={<FormattedMessage id="pages.card.title.3" />}
                description={<FormattedMessage id="pages.card.description.3" />}
              />
            </Card>
          </Col>
        </Row>
        <Divider />
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={getLangText(info.data1.title, lang)}
              value={info.data1.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={getLangText(info.data2.title, lang)}
              value={info.data2.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={getLangText(info.data3.title, lang)}
              value={info.data3.value}
              formatter={formatter}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={getLangText(info.data4.title, lang)}
              value={info.data4.value}
              formatter={formatter}
            />
          </Col>
        </Row>
        <br />
        <Divider orientation="left" orientationMargin="0">
          <FormattedMessage id="pages.dataEcosystem" defaultMessage="Data Ecosystem" />
        </Divider>
        <Row gutter={16}>
          {Teams.map((team, index) => {
            const logo = isDarkMode ? team.darkLogo : team.lightLogo;
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
                      <img src={`/images/dataLogo/${logo}`} className={styles.team_logo} />
                    </div>
                  }
                  onClick={() => {
                    window.location.href = `/tgdata/models?tid=${team.id}&tname=${getLangText(team.title, lang)}`;
                  }}
                >
                  <Meta
                    title={getLangText(team.title, lang)}
                    description={getLangText(team.description, lang)}
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
