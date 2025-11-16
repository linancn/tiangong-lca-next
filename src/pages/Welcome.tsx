import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import {
  ApartmentOutlined,
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
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  StatisticProps,
  Typography,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import { PageContainer } from '@ant-design/pro-components';
import CountUp from 'react-countup';
import { FormattedMessage, useIntl } from 'umi';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const { Meta } = Card;

  const { locale } = useIntl();
  const lang = getLang(locale) as 'en' | 'zh';

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  const [teams, setTeams] = React.useState<any>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [modalWidth, setModalWidth] = useState(720);
  const [isTidasModalOpen, setIsTidasModalOpen] = useState(false);

  const handleOpenDataModal = React.useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      event?.preventDefault();
      setIsDataModalOpen(true);
    },
    [setIsDataModalOpen],
  );

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
    if (isDataModalOpen) {
      loadTeams();
    }
  }, [isDataModalOpen, loadTeams]);

  useEffect(() => {
    if (!isDataModalOpen && !isTidasModalOpen) {
      return;
    }
    const resize = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const maxWidth = 1024;
      const horizontalGap = 48;
      const preferredWidth = Math.min(Math.max(window.innerWidth - horizontalGap, 0), maxWidth);
      const fallbackWidth = Math.min(window.innerWidth, maxWidth);
      setModalWidth(preferredWidth > 0 ? preferredWidth : fallbackWidth);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [isDataModalOpen, isTidasModalOpen]);

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
          '#text': 'Unit Processes & Inventories',
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
    | 'architectureExtensibility'
    | 'modelingTraceability';

  const sectionIconMap: Record<SectionKey, React.ReactNode> = {
    internationalMethodology: <GlobalOutlined />,
    ecosystemInteroperability: <InteractionOutlined />,
    architectureExtensibility: <DeploymentUnitOutlined />,
    modelingTraceability: <ApartmentOutlined />,
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
        {
          heading: '可溯建模',
          key: 'modelingTraceability',
          description:
            '平台面向复杂生产系统提供可溯建模能力，实现过程与模型的双向关联，覆盖多产品、多去向及回流场景，使产品建模路径与分配逻辑清晰可见，一次建模即可生成各产品及副产品结果。',
        },
      ],
    },
    en: {
      intro:
        'TianGong LCA Data Platform is an open platform for lifecycle assessment and product carbon management. Based on the TianGong LCA Data System (TIDAS), it is founded on three key principles: standardization, interoperability, and extensibility. Our mission is to achieve four core objectives in carbon data management: regulatory compliance, global interoperability, verifiable results, and robust data security.',
      sections: [
        {
          heading: 'Standards & Compliance',
          key: 'internationalMethodology',
          description:
            'The platform integrates internationally recognized LCA methodologies, including ISO, ILCD, GHG Protocol, and national standards. Its calculation processes and data structures strictly adhere to these guidelines to ensure the transparency, comparability, and reproducibility of all analysis results.',
        },
        {
          heading: 'Openness & Interoperability',
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
        {
          heading: 'Modeling & Traceability',
          key: 'modelingTraceability',
          description:
            'Traceable modeling for complex production systems links process datasets and model datasets bidirectionally, covering multi-product, multi-destination, and recycle scenarios so product pathways and allocation logic remain transparent. Model the plant once and output impacts for every product and by-product straight away.',
        },
      ],
    },
  };

  const currentContent = tidasContent[lang] ?? tidasContent.en;

  const metrics = [
    {
      key: 'data1',
      icon: <ShareAltOutlined />,
      title: getLangText(info.data1.title, lang),
      value: info.data1.value,
    },
    {
      key: 'data2',
      icon: <BuildOutlined />,
      title: getLangText(info.data2.title, lang),
      value: info.data2.value,
    },
    {
      key: 'data3',
      icon: <ProductOutlined />,
      title: getLangText(info.data3.title, lang),
      value: info.data3.value,
    },
    {
      key: 'data4',
      icon: <UserOutlined />,
      title: getLangText(info.data4.title, lang),
      value: info.data4.value,
    },
    {
      key: 'data5',
      icon: <TeamOutlined />,
      title: getLangText(info.data5.title, lang),
      value: info.data5.value,
    },
  ];
  const modalSubtitle =
    lang === 'zh'
      ? '由全球合作伙伴共建的行业数据网络'
      : 'A global network of lifecycle data partners.';

  const tidasTitle = lang === 'zh' ? 'TIDAS 数据体系架构' : 'TIDAS Architecture';
  const tidasDescription =
    lang === 'zh'
      ? '以模块化数据包、API 与工具链构建的开放生态，支持跨平台协同与可验证的数据交换。'
      : 'An open ecosystem of modular data packs, APIs, and toolkits enabling collaborative, verifiable exchanges.';
  const tidasDocUrl =
    lang === 'zh'
      ? 'https://tidas.tiangong.earth/docs/intro'
      : 'https://tidas.tiangong.earth/en/docs/intro';
  const tidasReadMoreLabel = lang === 'zh' ? '了解更多' : 'Learn more';
  const tidasImageSrc =
    lang === 'zh'
      ? isDarkMode
        ? '/images/tidas/TIDAS-zh-CN-dark.svg'
        : '/images/tidas/TIDAS-zh-CN.svg'
      : isDarkMode
        ? '/images/tidas/TIDAS-en-dark.svg'
        : '/images/tidas/TIDAS-en.svg';
  const tidasImageAlt = currentContent.intro;

  const WELCOME_RADIUS = 8;

  const cardBorderRadiusStyle = useMemo(() => ({ borderRadius: WELCOME_RADIUS }), []);

  const modalStyles = useMemo(() => ({ content: { borderRadius: WELCOME_RADIUS } }), []);

  return (
    <PageContainer title={false} className={styles.welcome_page}>
      <Space direction='vertical' size={24} className={styles.welcome_content}>
        <Row gutter={[16, 16]} wrap>
          {metrics.map((metric) => (
            <Col key={metric.key} flex='1 0 200px' style={{ display: 'flex' }}>
              <Card
                className={`${styles.welcome_card} ${styles.welcome_metrics_card}`}
                bodyStyle={{ padding: 20 }}
                style={{ ...cardBorderRadiusStyle, width: '100%' }}
              >
                <div className={styles.welcome_metric_content}>
                  <div className={styles.welcome_metric_header}>
                    <span
                      className={styles.welcome_metric_icon}
                      style={{ color: token.colorPrimary }}
                    >
                      {metric.icon}
                    </span>
                    {metric.key === 'data5' ? (
                      <Typography.Link
                        strong
                        href='#'
                        onClick={handleOpenDataModal}
                        style={{
                          color: token.colorPrimary,
                          fontFamily: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        {metric.title}
                      </Typography.Link>
                    ) : (
                      <Typography.Text
                        strong
                        style={{
                          color: token.colorPrimary,
                          fontFamily: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        {metric.title}
                      </Typography.Text>
                    )}
                  </div>
                  <Statistic
                    value={metric.value}
                    formatter={formatter}
                    valueStyle={{
                      fontSize: '1.25rem',
                      color: token.colorText,
                      lineHeight: 1.1,
                      fontFamily: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
                    }}
                    style={{ width: '100%', textAlign: 'center' }}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          className={styles.welcome_card}
          bodyStyle={{ padding: 24 }}
          style={cardBorderRadiusStyle}
        >
          <Space direction='vertical' size={16} style={{ width: '100%' }}>
            <Typography.Paragraph
              style={{
                margin: 0,
                color: token.colorText,
                fontSize: '1rem',
                lineHeight: 1.7,
              }}
            >
              {currentContent.intro}
            </Typography.Paragraph>
            <Space size={12} wrap>
              <Button type='primary' onClick={() => setIsTidasModalOpen(true)}>
                {lang === 'zh' ? 'TIDAS 数据体系架构' : 'TIDAS Architecture'}
              </Button>
              <Button onClick={handleOpenDataModal}>
                {lang === 'zh' ? '天工数据生态' : 'TianGong Data Ecosystem'}
              </Button>
            </Space>
          </Space>
        </Card>

        <Row gutter={[16, 16]} align='stretch'>
          {currentContent.sections.map((section) => (
            <Col xs={24} md={12} key={section.key}>
              <Card
                className={`${styles.welcome_card} ${styles.welcome_section_card}`}
                bodyStyle={{ padding: 24 }}
                style={cardBorderRadiusStyle}
              >
                <Space direction='vertical' size={12}>
                  <div className={styles.welcome_section_header}>
                    <span
                      className={styles.welcome_section_icon}
                      style={{ color: token.colorPrimary }}
                    >
                      {sectionIconMap[section.key]}
                    </span>
                    <Typography.Text
                      strong
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        lineHeight: '20px',
                        margin: 0,
                      }}
                    >
                      {section.heading}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
                    {section.description}
                  </Typography.Paragraph>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
      <Modal
        open={isDataModalOpen}
        onCancel={() => setIsDataModalOpen(false)}
        footer={null}
        width={modalWidth}
        destroyOnClose
        styles={modalStyles}
        title={<FormattedMessage id='pages.dataEcosystem' defaultMessage='Data Ecosystem' />}
      >
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          <Typography.Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
            {modalSubtitle}
          </Typography.Paragraph>
          {isTeamsLoading ? (
            <Row justify='center' style={{ minHeight: 180 }}>
              <Spin />
            </Row>
          ) : (
            <Row gutter={[16, 16]}>
              {teams?.map((team: any, index: number) => {
                let logoUrl = '';
                if (team.json?.previewLightUrl) {
                  logoUrl = isDarkMode ? team.json?.previewDarkUrl : team.json?.previewLightUrl;
                } else {
                  logoUrl = isDarkMode
                    ? `/images/dataLogo/${team.json?.darkLogo}`
                    : `/images/dataLogo/${team.json?.lightLogo}`;
                }
                return (
                  <Col xs={24} sm={12} lg={8} key={team.id ?? index}>
                    <Card
                      hoverable
                      className={`${styles.welcome_card} ${styles.welcome_team_card}`}
                      bodyStyle={{ padding: 16 }}
                      style={cardBorderRadiusStyle}
                      cover={
                        <div className={styles.team_logo_container}>
                          {logoUrl && (
                            <img
                              src={logoUrl}
                              className={styles.team_logo}
                              alt={getLangText(team.json?.title, lang)}
                            />
                          )}
                        </div>
                      }
                      onClick={() => {
                        window.location.href = `/tgdata/models?tid=${team.id}`;
                      }}
                    >
                      <Meta
                        title={
                          <Typography.Text strong>
                            {getLangText(team.json?.title, lang)}
                          </Typography.Text>
                        }
                        description={
                          <Typography.Paragraph
                            style={{ margin: '8px 0 0', color: token.colorTextSecondary }}
                          >
                            {getLangText(team.json?.description, lang)}
                          </Typography.Paragraph>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Space>
      </Modal>
      <Modal
        open={isTidasModalOpen}
        onCancel={() => setIsTidasModalOpen(false)}
        footer={null}
        width={modalWidth}
        destroyOnClose
        styles={modalStyles}
        title={tidasTitle}
      >
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          <Typography.Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
            {tidasDescription}{' '}
            <Typography.Link
              href={tidasDocUrl}
              target='_blank'
              rel='noopener noreferrer'
              style={{ fontWeight: 500 }}
            >
              {tidasReadMoreLabel}
            </Typography.Link>
          </Typography.Paragraph>
          {isTidasModalOpen && (
            <img src={tidasImageSrc} alt={tidasImageAlt} style={{ width: '100%' }} />
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default Welcome;
