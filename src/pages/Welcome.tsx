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
      coreTitle: string;
      sections: Array<{ key: SectionKey; heading: string; description: string }>;
    }
  > = {
    zh: {
      intro:
        '天工LCA数据平台是一个用于生命周期评价 (LCA) 与碳管理的软件平台。它基于开源的 TIDAS (TIangong DAta System) 核心构建，提供了一个支持标准化、互操作性及可扩展的分析环境。',
      coreTitle: '核心能力',
      sections: [
        {
          key: 'internationalMethodology',
          heading: '基于国际方法论',
          description: '平台的数据体系与方法论依据 ILCD Handbook 等国际标准进行构建。',
        },
        {
          heading: '生态互操作性',
          key: 'ecosystemInteroperability',
          description:
            '平台采用 TIDAS 的统一数据格式 (JSON)，并提供格式转换工具，可与 openLCA、Brightway 等第三方软件进行数据交换。系统支持与 eILCD 格式的无损转换，实现了数据在不同LCA工具生态中的流通。',
        },
        {
          heading: '技术架构与扩展性',
          key: 'architectureExtensibility',
          description:
            '平台采用可扩展的数据结构，为集成大语言模型 (LLM) 及接入数据空间 (Data Spaces) 提供支持。其服务层架构已包含隐私计算等技术的调用接口，为未来的功能扩展预留了空间。',
        },
      ],
    },
    en: {
      intro:
        'TianGong LCA Data Platform supports life cycle assessment (LCA) and carbon management workflows. Built on the open-source TIDAS (TIangong DAta System) core, it provides a standardized, interoperable, and extensible analysis environment.',
      coreTitle: 'Core Capabilities',
      sections: [
        {
          heading: 'Grounded in International Methodologies',
          key: 'internationalMethodology',
          description:
            'The data system and methodologies follow international standards such as the ILCD Handbook.',
        },
        {
          heading: 'Ecosystem Interoperability',
          key: 'ecosystemInteroperability',
          description:
            'Unified TIDAS JSON data structures and conversion tools enable data exchange with third-party software like openLCA and Brightway. Lossless conversion to the eILCD format keeps data flowing across LCA tool ecosystems.',
        },
        {
          heading: 'Architecture and Extensibility',
          key: 'architectureExtensibility',
          description:
            'An extensible data design supports integrating large language models (LLMs) and connecting to data spaces. The service layer already exposes privacy computing interfaces, leaving room for future capabilities.',
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
          <Typography.Paragraph
            style={{
              fontSize: '1.2em',
              lineHeight: 1.6,
            }}
          >
            {currentContent.intro}
          </Typography.Paragraph>
          <Typography.Title level={4}>{currentContent.coreTitle}</Typography.Title>
          {currentContent.sections.map((section) => (
            <Typography.Paragraph key={section.key}>
              <span
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
              </span>
              <br />
              {section.description}
            </Typography.Paragraph>
          ))}
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
