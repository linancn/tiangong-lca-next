import { getLang, getLangText } from '@/services/general/util';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Divider, Row, Statistic, StatisticProps, theme } from 'antd';
import Meta from 'antd/es/card/Meta';
import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { useIntl } from 'umi';

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
    title: [
      {
        '@xml:lang': 'zh',
        '#text': '欢迎使用天工数据库',
      },
      {
        '@xml:lang': 'en',
        '#text': 'Welcome to use TianGong Database',
      },
    ],
    meta1: {
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '开放 & 免费',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Open & Free',
        },
      ],
      description: [
        {
          '@xml:lang': 'zh',
          '#text': (
            <>天工数据库对所有人免费开放，促进 LCA 数据的公开、公平、共享，助力全球可持续发展。</>
          ),
        },
        {
          '@xml:lang': 'en',
          '#text': (
            <>
              Our database is openly accessible and free for all, promoting the democratization of
              sustainability data to foster global collaboration and innovation.
            </>
          ),
        },
      ],
    },
    meta2: {
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '可追溯 & 可信赖',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Traceable & Crediable',
        },
      ],
      description: [
        {
          '@xml:lang': 'zh',
          '#text': (
            <>
              天工数据库基于透明和可靠的价值观构建，确保每一条数据来源清晰且经过仔细验证，基于可信的数据支撑准确的评估。
            </>
          ),
        },
        {
          '@xml:lang': 'en',
          '#text': (
            <>
              Built on a foundation of transparency and reliability, our database ensures every
              piece of data is meticulously verified and clearly sourced, offering trusted
              information for accurate assessments.
            </>
          ),
        },
      ],
    },
    meta3: {
      title: [
        {
          '@xml:lang': 'zh',
          '#text': '持续更新 & 扩展',
        },
        {
          '@xml:lang': 'en',
          '#text': 'Updating & Expanding',
        },
      ],
      description: [
        {
          '@xml:lang': 'zh',
          '#text': (
            <>天工数据库持续动态更新，在扩展行业、部门和产品覆盖的同时，持续进行修正和更新。</>
          ),
        },
        {
          '@xml:lang': 'en',
          '#text': (
            <>
              Our database continuously grows, adding new data and broadening its coverage. While
              prioritizing expansion, we remain vigilant in ensuring accuracy, making careful
              updates and corrections as needed.
            </>
          ),
        },
      ],
    },
    data1: {
      value: 4000,
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
      value: 50,
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
      value: 200,
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
      value: 150,
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
    return (<svg
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
    </svg>)
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
  }

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
  }

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
          {getLangText(info.title, lang)}
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
                title={getLangText(info.meta1.title, lang)}
                description={getLangText(info.meta1.description, lang)}
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
                title={getLangText(info.meta2.title, lang)}
                description={getLangText(info.meta2.description, lang)}
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
                title={getLangText(info.meta3.title, lang)}
                description={getLangText(info.meta3.description, lang)}
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
      </div>
    </PageContainer>
  );
};

export default Welcome;
