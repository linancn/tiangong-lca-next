import { getLang, getLangText } from '@/services/general/util';
import styles from '@/style/custom.less';
import {
  ApartmentOutlined,
  BranchesOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  InteractionOutlined,
  NodeIndexOutlined,
  PaperClipOutlined,
  ProductOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  StatisticProps,
  Steps,
  Typography,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

import { getSignedStorageFileUrl, getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import { PageContainer } from '@ant-design/pro-components';
import CountUp from 'react-countup';
import { FormattedMessage, history, useIntl, useLocation } from 'umi';

const CARBON_FOOTPRINT_VIEW = 'carbon-footprint';
const CARBON_FOOTPRINT_GUIDE_VIDEO_URI =
  '../sys-files/video/platform_usage_process_first_matched.mp4';

type WelcomeView = 'overview' | 'carbonFootprintGuide';
type GuideVideoStatus = 'idle' | 'loading' | 'ready' | 'error';
type SchemaItemKey =
  'model' | 'process' | 'flow' | 'flowProperty' | 'unitGroup' | 'source' | 'contact';

type GuideStepKey =
  | 'openHome'
  | 'createProcess'
  | 'fillBasics'
  | 'enterInputsOutputs'
  | 'selectOrAddFlows'
  | 'validateAndSubmit';
type GuidePreparationKey =
  'collectRawData' | 'mapUnitProcesses' | 'checkFlowsAndUnits' | 'submitForReview';

const CARBON_FOOTPRINT_GUIDE_I18N_PREFIX = 'pages.welcome.carbonFootprintGuide';

const guideTeachingStepKeys: GuideStepKey[] = [
  'openHome',
  'createProcess',
  'fillBasics',
  'enterInputsOutputs',
  'selectOrAddFlows',
  'validateAndSubmit',
];
const guidePreparationItemKeys: GuidePreparationKey[] = [
  'collectRawData',
  'mapUnitProcesses',
  'checkFlowsAndUnits',
  'submitForReview',
];
const guideSchemaItemKeys: SchemaItemKey[] = [
  'model',
  'process',
  'flow',
  'flowProperty',
  'unitGroup',
  'source',
  'contact',
];

const schemaIconMap: Record<SchemaItemKey, React.ReactNode> = {
  model: <ExperimentOutlined />,
  process: <BranchesOutlined />,
  flow: <NodeIndexOutlined />,
  flowProperty: <FileSearchOutlined />,
  unitGroup: <ApartmentOutlined />,
  source: <PaperClipOutlined />,
  contact: <TeamOutlined />,
};

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const { Meta } = Card;
  const location = useLocation();

  const { formatMessage, locale } = useIntl();
  const lang = getLang(locale) as 'en' | 'zh';
  const primaryColor = `var(--ant-color-primary, ${token.colorPrimary})`;
  const activeViewFromLocation: WelcomeView = useMemo(() => {
    const searchParams = new URLSearchParams(location.search ?? '');
    return searchParams.get('view') === CARBON_FOOTPRINT_VIEW ? 'carbonFootprintGuide' : 'overview';
  }, [location.search]);
  const [carbonFootprintGuideVideoUrl, setCarbonFootprintGuideVideoUrl] = useState('');
  const [carbonFootprintGuideVideoStatus, setCarbonFootprintGuideVideoStatus] =
    useState<GuideVideoStatus>('idle');
  const [carbonFootprintGuideVideoReloadKey, setCarbonFootprintGuideVideoReloadKey] = useState(0);

  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  const [teams, setTeams] = React.useState<any>(null);
  const [teamsCount, setTeamsCount] = React.useState<number>(0);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [modalWidth, setModalWidth] = useState(720);
  const [isTidasModalOpen, setIsTidasModalOpen] = useState(false);
  const [activeWelcomeView, setActiveWelcomeView] = useState<WelcomeView>(activeViewFromLocation);

  useEffect(() => {
    setActiveWelcomeView(activeViewFromLocation);
  }, [activeViewFromLocation]);

  useEffect(() => {
    if (activeWelcomeView !== 'carbonFootprintGuide') {
      setCarbonFootprintGuideVideoUrl('');
      setCarbonFootprintGuideVideoStatus('idle');
      return undefined;
    }

    let isMounted = true;
    setCarbonFootprintGuideVideoUrl('');
    setCarbonFootprintGuideVideoStatus('loading');
    getSignedStorageFileUrl(CARBON_FOOTPRINT_GUIDE_VIDEO_URI)
      .then((url) => {
        if (isMounted) {
          setCarbonFootprintGuideVideoUrl(url);
          setCarbonFootprintGuideVideoStatus(url ? 'ready' : 'error');
        }
      })
      .catch(() => {
        if (isMounted) {
          setCarbonFootprintGuideVideoUrl('');
          setCarbonFootprintGuideVideoStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeWelcomeView, carbonFootprintGuideVideoReloadKey]);

  const handleReloadCarbonFootprintGuideVideo = React.useCallback(() => {
    setCarbonFootprintGuideVideoReloadKey((key) => key + 1);
  }, []);

  const handleCarbonFootprintGuideVideoError = React.useCallback(() => {
    setCarbonFootprintGuideVideoUrl('');
    setCarbonFootprintGuideVideoStatus('error');
  }, []);

  const handleOpenDataModal = React.useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      event?.preventDefault();
      setIsDataModalOpen(true);
    },
    [setIsDataModalOpen],
  );

  const handleOpenCarbonFootprintGuide = React.useCallback(() => {
    setIsDataModalOpen(false);
    setIsTidasModalOpen(false);
    setActiveWelcomeView('carbonFootprintGuide');
    history.push(`/welcome?view=${CARBON_FOOTPRINT_VIEW}`);
  }, []);

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
            try {
              const thumbResult = await getThumbFileUrls([{ '@uri': `${team.json.lightLogo}` }]);
              if (thumbResult[0]?.status === 'done') {
                processTeams[index].json.previewLightUrl = thumbResult[0].thumbUrl;
              }
            } catch (error) {
              processTeams[index].json.previewLightUrl = undefined;
            }
          }
          if (team.json?.darkLogo) {
            try {
              const thumbResult = await getThumbFileUrls([{ '@uri': `${team.json.darkLogo}` }]);
              if (thumbResult[0]?.status === 'done') {
                processTeams[index].json.previewDarkUrl = thumbResult[0].thumbUrl;
              }
            } catch (error) {
              processTeams[index].json.previewDarkUrl = undefined;
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

  const getTeamCount = async () => {
    const res = await getTeams();
    setTeamsCount(res?.data?.length ?? 0);
  };

  useEffect(() => {
    if (activeWelcomeView !== 'overview') {
      return;
    }
    if (isDataModalOpen) {
      loadTeams();
    } else {
      getTeamCount();
    }
  }, [activeWelcomeView, isDataModalOpen, loadTeams]);

  useEffect(() => {
    if (!isDataModalOpen && !isTidasModalOpen) {
      return;
    }
    const resize = () => {
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
      value: 16694,
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
      value: 834,
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
      value: 5619,
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
      value: 311,
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
      value: 12,
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
  const guideMessage = React.useCallback(
    (id: string) => formatMessage({ id: `${CARBON_FOOTPRINT_GUIDE_I18N_PREFIX}.${id}` }),
    [formatMessage],
  );
  const currentGuideContent = {
    entryLabel: guideMessage('entryLabel'),
    title: guideMessage('title'),
    intro: guideMessage('intro'),
    videoTitle: guideMessage('videoTitle'),
    videoFallback: guideMessage('videoFallback'),
    videoLoading: guideMessage('videoLoading'),
    videoLoadErrorTitle: guideMessage('videoLoadErrorTitle'),
    videoLoadErrorDescription: guideMessage('videoLoadErrorDescription'),
    videoReload: guideMessage('videoReload'),
    workflowTitle: guideMessage('workflowTitle'),
    schemaTitle: guideMessage('schemaTitle'),
    actions: {
      browsePublicData: guideMessage('actions.browsePublicData'),
      enterMyData: guideMessage('actions.enterMyData'),
    },
    teachingSteps: guideTeachingStepKeys.map((key) => ({
      key,
      title: guideMessage(`teachingSteps.${key}.title`),
      description: guideMessage(`teachingSteps.${key}.description`),
    })),
    preparationItems: guidePreparationItemKeys.map((key) => ({
      key,
      title: guideMessage(`preparationItems.${key}.title`),
      description: guideMessage(`preparationItems.${key}.description`),
    })),
    schemaItems: guideSchemaItemKeys.map((key) => ({
      key,
      title: guideMessage(`schemaItems.${key}.title`),
      description: guideMessage(`schemaItems.${key}.description`),
    })),
  };

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
      value: teamsCount,
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
  const guidePanelStyle = useMemo<React.CSSProperties>(
    () => ({
      height: '100%',
      padding: 12,
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: WELCOME_RADIUS,
      background: token.colorFillQuaternary ?? token.colorFillTertiary,
    }),
    [token.colorBorderSecondary, token.colorFillQuaternary, token.colorFillTertiary],
  );
  const guideAvatarStyle = useMemo<React.CSSProperties>(
    () => ({
      flex: '0 0 auto',
      color: primaryColor,
      background: token.colorPrimaryBg ?? token.colorFillTertiary,
    }),
    [primaryColor, token.colorFillTertiary, token.colorPrimaryBg],
  );
  const guideVideoStyle = useMemo<React.CSSProperties>(
    () => ({
      width: '100%',
      aspectRatio: '16 / 9',
      background: token.colorFillQuaternary ?? token.colorFillTertiary,
      borderRadius: WELCOME_RADIUS,
    }),
    [token.colorFillQuaternary, token.colorFillTertiary],
  );
  const guideVideoFallbackStyle = useMemo<React.CSSProperties>(
    () => ({
      ...guideVideoStyle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      boxSizing: 'border-box',
      color: token.colorTextSecondary,
      textAlign: 'center',
    }),
    [guideVideoStyle, token.colorTextSecondary],
  );

  const renderCarbonFootprintGuide = () => (
    <>
      <Row gutter={[16, 16]} align='stretch'>
        <Col xs={24} xl={13} style={{ display: 'flex' }}>
          <Card
            title={currentGuideContent.title}
            className={styles.welcome_card}
            style={{ ...cardBorderRadiusStyle, width: '100%', height: '100%' }}
          >
            <Space
              direction='vertical'
              size={20}
              style={{
                width: '100%',
              }}
            >
              <Typography.Paragraph style={{ margin: 0, fontSize: 16, lineHeight: 1.9 }}>
                {currentGuideContent.intro}
              </Typography.Paragraph>
              <Row gutter={[12, 12]}>
                {currentGuideContent.preparationItems.map((item) => (
                  <Col xs={24} md={12} key={item.key}>
                    <div style={guidePanelStyle}>
                      <Space direction='vertical' size={8}>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Typography.Paragraph
                          type='secondary'
                          style={{ margin: 0, color: token.colorTextSecondary }}
                        >
                          {item.description}
                        </Typography.Paragraph>
                      </Space>
                    </div>
                  </Col>
                ))}
              </Row>
              <Space wrap>
                <Button icon={<FolderOpenOutlined />} onClick={() => history.push('/tgdata/flows')}>
                  {currentGuideContent.actions.browsePublicData}
                </Button>
                <Button
                  type='primary'
                  icon={<UserOutlined />}
                  onClick={() => history.push('/mydata/processes')}
                >
                  {currentGuideContent.actions.enterMyData}
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={11} style={{ display: 'flex' }}>
          <Card
            title={currentGuideContent.videoTitle}
            className={styles.welcome_card}
            style={{ ...cardBorderRadiusStyle, width: '100%', height: '100%' }}
          >
            <Space direction='vertical' size={20} style={{ width: '100%' }}>
              {carbonFootprintGuideVideoStatus === 'error' ? (
                <div role='alert' style={guideVideoFallbackStyle}>
                  <Space direction='vertical' size={10} align='center'>
                    <Typography.Text strong>
                      {currentGuideContent.videoLoadErrorTitle}
                    </Typography.Text>
                    <Typography.Text type='secondary'>
                      {currentGuideContent.videoLoadErrorDescription}
                    </Typography.Text>
                    <Button
                      aria-label={currentGuideContent.videoReload}
                      icon={<ReloadOutlined />}
                      onClick={handleReloadCarbonFootprintGuideVideo}
                    >
                      {currentGuideContent.videoReload}
                    </Button>
                  </Space>
                </div>
              ) : carbonFootprintGuideVideoStatus === 'ready' && carbonFootprintGuideVideoUrl ? (
                <video
                  key={carbonFootprintGuideVideoUrl}
                  controls
                  preload='metadata'
                  style={guideVideoStyle}
                  onError={handleCarbonFootprintGuideVideoError}
                >
                  <source
                    src={carbonFootprintGuideVideoUrl}
                    type='video/mp4'
                    onError={handleCarbonFootprintGuideVideoError}
                  />
                  {currentGuideContent.videoFallback}
                </video>
              ) : (
                <div style={guideVideoFallbackStyle}>
                  <Space direction='vertical' size={10} align='center'>
                    <Spin />
                    <Typography.Text type='secondary'>
                      {currentGuideContent.videoLoading}
                    </Typography.Text>
                  </Space>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title={currentGuideContent.workflowTitle}
        className={styles.welcome_card}
        style={cardBorderRadiusStyle}
      >
        <Steps
          current={-1}
          items={currentGuideContent.teachingSteps.map((item) => ({
            title: item.title,
            description: item.description,
          }))}
        />
      </Card>

      <Card
        title={currentGuideContent.schemaTitle}
        className={styles.welcome_card}
        style={cardBorderRadiusStyle}
      >
        <Row gutter={[12, 12]}>
          {currentGuideContent.schemaItems.map((item) => (
            <Col xs={24} sm={12} xl={8} key={item.key}>
              <div style={guidePanelStyle}>
                <Space align='start' size='middle'>
                  <Avatar icon={schemaIconMap[item.key]} style={guideAvatarStyle} />
                  <Space direction='vertical' size={4}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Text type='secondary'>{item.description}</Typography.Text>
                  </Space>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </>
  );

  const renderOverview = () => (
    <>
      <Row gutter={[16, 16]} wrap>
        {metrics.map((metric) => (
          <Col key={metric.key} flex='1 0 200px' style={{ display: 'flex' }}>
            <Card
              className={`${styles.welcome_card} ${styles.welcome_metrics_card}`}
              styles={{
                body: { padding: 20, height: '100%', display: 'flex', flexDirection: 'column' },
              }}
              style={{ ...cardBorderRadiusStyle, width: '100%' }}
            >
              <div className={styles.welcome_metric_content}>
                <div className={styles.welcome_metric_header}>
                  <span className={styles.welcome_metric_icon} style={{ color: primaryColor }}>
                    {metric.icon}
                  </span>
                  {metric.key === 'data5' ? (
                    <Typography.Link
                      strong
                      href='#'
                      onClick={handleOpenDataModal}
                      style={{
                        color: primaryColor,
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
                        color: primaryColor,
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
        styles={{ body: { padding: 24 } }}
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
            <Button onClick={handleOpenCarbonFootprintGuide}>
              {currentGuideContent.entryLabel}
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]} align='stretch'>
        {currentContent.sections.map((section) => (
          <Col xs={24} md={12} key={section.key}>
            <Card
              className={`${styles.welcome_card} ${styles.welcome_section_card}`}
              styles={{ body: { padding: 24 } }}
              style={cardBorderRadiusStyle}
            >
              <Space direction='vertical' size={12}>
                <div className={styles.welcome_section_header}>
                  <span className={styles.welcome_section_icon} style={{ color: primaryColor }}>
                    {sectionIconMap[section.key]}
                  </span>
                  <Typography.Text
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: '20px',
                      fontSize: '1rem',
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
    </>
  );

  return (
    <PageContainer title={false} className={styles.welcome_page}>
      <Space direction='vertical' size={24} className={styles.welcome_content}>
        {activeWelcomeView === 'carbonFootprintGuide'
          ? renderCarbonFootprintGuide()
          : renderOverview()}
      </Space>
      <Modal
        open={isDataModalOpen}
        onCancel={() => setIsDataModalOpen(false)}
        footer={null}
        width={modalWidth}
        destroyOnHidden
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
                }
                return (
                  <Col xs={24} sm={12} lg={8} key={team.id ?? index}>
                    <Card
                      hoverable
                      className={`${styles.welcome_card} ${styles.welcome_team_card}`}
                      styles={{ body: { padding: 16 } }}
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
                        history.push(`/tgdata/models?tid=${team.id}`);
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
        destroyOnHidden
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
