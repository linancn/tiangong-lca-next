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

import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import { PageContainer } from '@ant-design/pro-components';
import CountUp from 'react-countup';
import { FormattedMessage, history, useIntl, useLocation } from 'umi';

const CARBON_FOOTPRINT_VIEW = 'carbon-footprint';

type WelcomeView = 'overview' | 'carbonFootprintGuide';
type SchemaItemKey =
  | 'model'
  | 'process'
  | 'flow'
  | 'flowProperty'
  | 'unitGroup'
  | 'source'
  | 'contact';

const carbonFootprintGuideContent: Record<
  'en' | 'zh',
  {
    entryLabel: string;
    title: string;
    intro: string;
    videoTitle: string;
    videoFallback: string;
    workflowTitle: string;
    schemaTitle: string;
    actions: {
      browsePublicData: string;
      enterMyData: string;
    };
    teachingSteps: Array<{ title: string; description: string }>;
    preparationItems: Array<{ title: string; description: string }>;
    schemaItems: Array<{ key: SchemaItemKey; title: string; description: string }>;
  }
> = {
  zh: {
    entryLabel: '数据研制指南',
    title: '天工生命周期数据库',
    intro:
      '面向产品碳足迹数据报送、背景数据管理和生命周期建模。数据填报从过程开始，先记录过程边界、输入输出、数量单位和来源，再按需要选择已有流或新增产品流，最后完成验证、审核和模型串接。',
    videoTitle: '操作演示视频',
    videoFallback: '当前浏览器不支持视频播放。',
    workflowTitle: '过程数据研制流程',
    schemaTitle: '数据对象',
    actions: {
      browsePublicData: '浏览开放数据',
      enterMyData: '进入我的数据',
    },
    teachingSteps: [
      { title: '登录首页', description: '查看新手入口、教学视频和数据对象说明。' },
      { title: '新建过程', description: '从我的数据进入过程，先录入单元过程基本信息。' },
      { title: '填写基础信息', description: '补充过程名称、边界、年份、地区、来源和产品系统。' },
      { title: '录入输入/输出', description: '记录物料、能源、排放和产品流的方向、数量和单位。' },
      { title: '选择或新增流', description: '平台已有流直接选择；缺少的产品流再新建并关联。' },
      { title: '验证与提交', description: '检查必填项、单位和逻辑关系，通过后提交审核。' },
    ],
    preparationItems: [
      {
        title: '收集原始数据',
        description: '明确产品、功能单位、时间范围、地理范围和工艺边界。',
      },
      {
        title: '梳理单元过程',
        description: '把制造、运输、能源使用、废弃物处理等环节拆成可录入的单元过程。',
      },
      {
        title: '核对流与单位',
        description: '先匹配已有流；确实缺少的产品流再新增，并统一数量单位。',
      },
      {
        title: '提交验证审核',
        description: '完成过程必填项、输入输出和来源说明后，再进入验证与审核。',
      },
    ],
    schemaItems: [
      {
        key: 'model',
        title: '模型',
        description: '描述产品系统的完整或部分生命周期，由多个相互连接的过程组成。',
      },
      {
        key: 'process',
        title: '过程',
        description: '记录单个生产或处理过程的输入输出流、时间、地理和技术代表性。',
      },
      {
        key: 'flow',
        title: '流',
        description: '定义生命周期评估中的物质、能量或废弃物，是过程和模型的连接基础。',
      },
      {
        key: 'flowProperty',
        title: '流属性',
        description: '定义流的计量方式，例如质量、能量、体积、经济价值等。',
      },
      {
        key: 'unitGroup',
        title: '单位组',
        description: '定义相关计量单位及其换算关系，支撑跨数据集的单位转换。',
      },
      {
        key: 'source',
        title: '来源',
        description: '记录文献、数据库、合规系统等引用信息，支撑透明性和可追溯性。',
      },
      {
        key: 'contact',
        title: '联系人',
        description: '记录与数据集相关的个人、工作组、组织或数据库网络联系信息。',
      },
    ],
  },
  en: {
    entryLabel: 'Data Development Guide',
    title: 'TianGong Life Cycle Database',
    intro:
      'Built for product carbon footprint reporting, background data management, and lifecycle modeling. Data entry starts with processes: record boundaries, inputs and outputs, quantities, units, and sources; choose existing flows or add product flows as needed; then complete validation, review, and model linking.',
    videoTitle: 'Operation Demo Video',
    videoFallback: 'Your browser does not support video playback.',
    workflowTitle: 'Process Data Development Workflow',
    schemaTitle: 'Data Objects',
    actions: {
      browsePublicData: 'Browse Open Data',
      enterMyData: 'My Data',
    },
    teachingSteps: [
      {
        title: 'Open Home',
        description: 'Review starter entry points, tutorial videos, and data objects.',
      },
      {
        title: 'Create Process',
        description: 'Enter My Data and start with basic unit process information.',
      },
      {
        title: 'Fill Basics',
        description: 'Add name, boundary, year, region, source, and product system.',
      },
      {
        title: 'Enter Inputs/Outputs',
        description:
          'Record materials, energy, emissions, and product flows with direction, quantity, and unit.',
      },
      {
        title: 'Select Or Add Flows',
        description:
          'Select existing platform flows first; add missing product flows only when needed.',
      },
      {
        title: 'Validate And Submit',
        description: 'Check required fields, units, and logic before submitting for review.',
      },
    ],
    preparationItems: [
      {
        title: 'Collect Raw Data',
        description:
          'Clarify product, functional unit, time span, geography, and process boundary.',
      },
      {
        title: 'Map Unit Processes',
        description:
          'Break manufacturing, transport, energy use, and waste treatment into enterable unit processes.',
      },
      {
        title: 'Check Flows And Units',
        description:
          'Match existing flows first; add missing product flows only when needed and keep units consistent.',
      },
      {
        title: 'Submit For Review',
        description:
          'Complete required process fields, inputs and outputs, and sources before validation and review.',
      },
    ],
    schemaItems: [
      {
        key: 'model',
        title: 'Model',
        description:
          'Describes a full or partial product system lifecycle made of connected processes.',
      },
      {
        key: 'process',
        title: 'Process',
        description:
          'Records inputs, outputs, time, geography, and technical representativeness for one production or treatment process.',
      },
      {
        key: 'flow',
        title: 'Flow',
        description:
          'Defines material, energy, or waste exchanged in lifecycle assessment, connecting processes and models.',
      },
      {
        key: 'flowProperty',
        title: 'Flow Property',
        description:
          'Defines how a flow is measured, such as mass, energy, volume, or economic value.',
      },
      {
        key: 'unitGroup',
        title: 'Unit Group',
        description:
          'Defines related measurement units and conversions for consistent cross-dataset unit handling.',
      },
      {
        key: 'source',
        title: 'Source',
        description:
          'Records literature, database, compliance, or other references for transparency and traceability.',
      },
      {
        key: 'contact',
        title: 'Contact',
        description:
          'Records people, working groups, organizations, or database networks related to datasets.',
      },
    ],
  },
};

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

  const { locale } = useIntl();
  const lang = getLang(locale) as 'en' | 'zh';
  const primaryColor = `var(--ant-color-primary, ${token.colorPrimary})`;
  const activeViewFromLocation: WelcomeView = useMemo(() => {
    const searchParams = new URLSearchParams(location.search ?? '');
    return searchParams.get('view') === CARBON_FOOTPRINT_VIEW ? 'carbonFootprintGuide' : 'overview';
  }, [location.search]);

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
  const currentGuideContent = carbonFootprintGuideContent[lang] ?? carbonFootprintGuideContent.en;

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
                  <Col xs={24} md={12} key={item.title}>
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
              <video controls preload='metadata' style={guideVideoStyle}>
                <source
                  src='/tutorials/platform_usage_process_first_matched.mp4?v=fast130precise'
                  type='video/mp4'
                />
                {currentGuideContent.videoFallback}
              </video>
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
