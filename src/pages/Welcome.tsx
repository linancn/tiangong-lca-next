import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import {
  BuildOutlined,
  DeploymentUnitOutlined,
  GlobalOutlined,
  InteractionOutlined,
  ProductOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Card,
  Col,
  Divider,
  Image,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  StatisticProps,
  Typography,
  theme,
} from 'antd';
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
  const lang = getLang(locale) as 'en' | 'zh';

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

  type SectionKey =
    | 'internationalMethodology'
    | 'ecosystemInteroperability'
    | 'architectureExtensibility';

  const sectionIconMap: Record<SectionKey, React.ReactNode> = {
    internationalMethodology: <GlobalOutlined style={{ marginRight: '0.4em' }} />,
    ecosystemInteroperability: <InteractionOutlined style={{ marginRight: '0.4em' }} />,
    architectureExtensibility: <DeploymentUnitOutlined style={{ marginRight: '0.4em' }} />,
  };

  const tidasContent: Record<
    'en' | 'zh',
    {
      intro: string;
      sections: Array<{ key: SectionKey; heading: string; description: string }>;
    }
  > = {
    zh: {
      intro:
        '天工LCA数据平台，一个支持全流程生命周期分析与产品碳管理的开放平台。基于开源TIDAS核心构建，融合了标准化、互操作性与可扩展性三大特性，旨在实现碳数据管理的四个核心目标：合规透明、国际互通、结果可信、数据安全。',
      sections: [
        {
          heading: '严谨合规',
          key: 'internationalMethodology',
          description:
            '平台集成了国标(GB)、ISO、ILCD、GHGP等国内外公认的LCA方法论。其计算过程与数据结构严格遵循相应准则，以保障分析结果的透明性、可比性与可复现性。',
        },
        {
          heading: '开放互联',
          key: 'ecosystemInteroperability',
          description:
            '基于TIDAS统一数据格式，平台实现了与eILCD数据结构的原生兼容，数据可便捷地进行导入或导出，在支持eILCD数据结构的其他主流LCA工具上使用。',
        },
        {
          heading: '智能安全',
          key: 'architectureExtensibility',
          description:
            '平台内嵌AI算法以辅助数据的研制与验证。其模块化架构亦支持集成区块链、隐私计算等前沿技术，用以保障企业数据的完整性与保密性。',
        },
      ],
    },
    en: {
      intro:
        'The Tiangong LCA Data Platform is an open platform for lifecycle assessment and product carbon management. Based on the TianGong LCA Data System (TIDAS), it is founded on three key principles: standardization, interoperability, and extensibility. Our mission is to achieve four core objectives in carbon data management: regulatory compliance, global interoperability, verifiable results, and robust data security.',
      sections: [
        {
          heading: 'Standards & Compliance',
          key: 'internationalMethodology',
          description:
            'TThe platform integrates internationally recognized LCA methodologies, including ISO, ILCD, GHG Protocol, and national standards. Its calculation processes and data structures strictly adhere to these guidelines to ensure the transparency, comparability, and reproducibility of all analysis results.',
        },
        {
          heading: 'Open & Interoperability',
          key: 'ecosystemInteroperability',
          description:
            'Based on the unified TIDAS format, the platform offers native compatibility with the eILCD data structure. This allows for seamless data import and export, ensuring usability across other mainstream LCA tools that support the eILCD format.',
        },
        {
          heading: 'Intelligence & Security',
          key: 'architectureExtensibility',
          description:
            'The platform embeds AI algorithms to assist in data modeling and validation. Its modular architecture also supports the integration of cutting-edge technologies like blockchain and privacy-enhancing computation (PEC) to ensure the integrity and confidentiality of enterprise data.',
        },
      ],
    },
  };

  const currentContent = tidasContent[lang] ?? tidasContent.en;

  const tidasImageSrc =
    lang === 'zh'
      ? isDarkMode
        ? '/images/tidas/TIDAS-zh-CN-dark.svg'
        : '/images/tidas/TIDAS-zh-CN.svg'
      : isDarkMode
        ? '/images/tidas/TIDAS-en-dark.svg'
        : '/images/tidas/TIDAS-en.svg';

  const tidasImageAlt = currentContent.intro;

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
      <Divider />
      <Row gutter={[24, 24]} align='stretch'>
        <Col xs={24} lg={11}>
          <Space direction='vertical' size={24} style={{ width: '100%' }}>
            <Card
              className={styles.intro_card}
              variant='outlined'
              style={{
                background: token.colorBgElevated,
                borderRadius: 16,
                boxShadow: token.boxShadow,
              }}
              styles={{
                body: {
                  padding: '20px 24px',
                },
              }}
            >
              <Typography.Paragraph
                style={{
                  fontSize: '1.2em',
                  lineHeight: 1.7,
                  margin: 0,
                  color: token.colorText,
                }}
              >
                {currentContent.intro}
              </Typography.Paragraph>
            </Card>
            <Space direction='vertical' size={16} style={{ width: '100%' }}>
              {currentContent.sections.map((section) => (
                <Card
                  key={section.key}
                  variant='outlined'
                  style={{
                    background: token.colorFillSecondary,
                    borderRadius: 16,
                    boxShadow: 'none',
                  }}
                  styles={{
                    body: {
                      padding: '24px 28px',
                    },
                  }}
                >
                  <Typography.Text
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      color: color3,
                    }}
                  >
                    {sectionIconMap[section.key]}
                    {section.heading}
                  </Typography.Text>
                  <Typography.Paragraph
                    style={{
                      margin: '12px 0 0',
                      color: token.colorTextSecondary,
                    }}
                  >
                    {section.description}
                  </Typography.Paragraph>
                </Card>
              ))}
            </Space>
          </Space>
        </Col>
        <Col
          xs={0}
          lg={1}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}
        >
          <div
            style={{
              width: 1,
              backgroundColor: token.colorSplit,
              alignSelf: 'stretch',
            }}
          />
        </Col>
        <Col xs={24} lg={0}>
          <Divider />
        </Col>
        <Col
          xs={24}
          lg={11}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingInline: 24,
          }}
        >
          <Image
            src={tidasImageSrc}
            alt={tidasImageAlt}
            preview={false}
            style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
          />
        </Col>
      </Row>
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
