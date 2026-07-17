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
import React, { useEffect, useMemo, useRef, useState } from 'react';

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
  const lang = getLang(locale);
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
  const teamsLoadingRef = useRef(false);
  const [teamsCount, setTeamsCount] = React.useState<number>(0);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [teamsLoadError, setTeamsLoadError] = useState(false);
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
    if (teams || teamsLoadingRef.current) {
      return;
    }
    teamsLoadingRef.current = true;
    setIsTeamsLoading(true);
    setTeamsLoadError(false);
    try {
      const res = await getTeams();
      if (!res?.success) {
        throw new Error('teams unavailable');
      }
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
    } catch {
      setTeams(null);
      setTeamsLoadError(true);
    } finally {
      teamsLoadingRef.current = false;
      setIsTeamsLoading(false);
    }
  }, [teams]);

  const getTeamCount = async () => {
    try {
      const res = await getTeams();
      setTeamsCount(res?.data?.length ?? 0);
    } catch {
      setTeamsCount(0);
    }
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

  const overviewContent: {
    intro: string;
    sections: Array<{ key: SectionKey; heading: string; description: string }>;
  } = {
    intro: formatMessage({ id: 'pages.welcome.overview.intro' }),
    sections: [
      {
        key: 'internationalMethodology',
        heading: formatMessage({
          id: 'pages.welcome.overview.sections.internationalMethodology.title',
        }),
        description: formatMessage({
          id: 'pages.welcome.overview.sections.internationalMethodology.description',
        }),
      },
      {
        key: 'ecosystemInteroperability',
        heading: formatMessage({
          id: 'pages.welcome.overview.sections.ecosystemInteroperability.title',
        }),
        description: formatMessage({
          id: 'pages.welcome.overview.sections.ecosystemInteroperability.description',
        }),
      },
      {
        key: 'architectureExtensibility',
        heading: formatMessage({
          id: 'pages.welcome.overview.sections.architectureExtensibility.title',
        }),
        description: formatMessage({
          id: 'pages.welcome.overview.sections.architectureExtensibility.description',
        }),
      },
      {
        key: 'modelingTraceability',
        heading: formatMessage({
          id: 'pages.welcome.overview.sections.modelingTraceability.title',
        }),
        description: formatMessage({
          id: 'pages.welcome.overview.sections.modelingTraceability.description',
        }),
      },
    ],
  };
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
      title: formatMessage({ id: 'pages.welcome.overview.metrics.unitProcessesAndInventories' }),
      value: 16694,
    },
    {
      key: 'data2',
      icon: <BuildOutlined />,
      title: formatMessage({ id: 'pages.welcome.overview.metrics.domainsAndSectors' }),
      value: 834,
    },
    {
      key: 'data3',
      icon: <ProductOutlined />,
      title: formatMessage({ id: 'pages.welcome.overview.metrics.products' }),
      value: 5619,
    },
    {
      key: 'data4',
      icon: <UserOutlined />,
      title: formatMessage({ id: 'pages.welcome.overview.metrics.globalContributors' }),
      value: 311,
    },
    {
      key: 'data5',
      icon: <TeamOutlined />,
      title: formatMessage({ id: 'pages.welcome.overview.metrics.dataTeams' }),
      value: teamsCount,
    },
  ];
  const dataEcosystemLabel = formatMessage({
    id: 'pages.welcome.overview.actions.dataEcosystem',
  });
  const modalSubtitle = formatMessage({
    id: 'pages.welcome.overview.dataEcosystemSubtitle',
  });
  const tidasTitle = formatMessage({ id: 'pages.welcome.overview.tidas.title' });
  const tidasDescription = formatMessage({ id: 'pages.welcome.overview.tidas.description' });
  const tidasDocUrl = formatMessage({ id: 'pages.welcome.overview.tidas.docsUrl' });
  const tidasReadMoreLabel = formatMessage({ id: 'pages.welcome.overview.tidas.readMore' });
  const tidasImageSrc =
    lang === 'zh'
      ? isDarkMode
        ? '/images/tidas/TIDAS-zh-CN-dark.svg'
        : '/images/tidas/TIDAS-zh-CN.svg'
      : isDarkMode
        ? '/images/tidas/TIDAS-en-dark.svg'
        : '/images/tidas/TIDAS-en.svg';
  const tidasImageAlt = formatMessage({ id: 'pages.welcome.overview.tidas.imageAlt' });

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
            {overviewContent.intro}
          </Typography.Paragraph>
          <Space size={12} wrap>
            <Button type='primary' onClick={() => setIsTidasModalOpen(true)}>
              {tidasTitle}
            </Button>
            <Button onClick={handleOpenDataModal}>{dataEcosystemLabel}</Button>
            <Button onClick={handleOpenCarbonFootprintGuide}>
              {currentGuideContent.entryLabel}
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]} align='stretch'>
        {overviewContent.sections.map((section) => (
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
        title={
          <FormattedMessage id='pages.dataEcosystem' defaultMessage='Data Ecosystem (A-Z Order)' />
        }
      >
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          <Typography.Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
            {modalSubtitle}
          </Typography.Paragraph>
          {isTeamsLoading ? (
            <Row justify='center' style={{ minHeight: 180 }}>
              <Spin />
            </Row>
          ) : teamsLoadError ? (
            <Space direction='vertical' align='center' style={{ width: '100%', padding: 24 }}>
              <Typography.Text type='danger' role='alert'>
                {formatMessage({
                  id: 'pages.welcome.overview.dataEcosystem.error',
                  defaultMessage: 'Data teams could not be loaded.',
                })}
              </Typography.Text>
              <Button icon={<ReloadOutlined />} onClick={loadTeams}>
                {formatMessage({
                  id: 'pages.welcome.overview.dataEcosystem.retry',
                  defaultMessage: 'Try again',
                })}
              </Button>
            </Space>
          ) : !teams?.length ? (
            <Typography.Text
              type='secondary'
              role='status'
              aria-live='polite'
              style={{ display: 'block', padding: 24, textAlign: 'center' }}
            >
              {formatMessage({
                id: 'pages.welcome.overview.dataEcosystem.empty',
                defaultMessage: 'No data teams are available yet.',
              })}
            </Typography.Text>
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
