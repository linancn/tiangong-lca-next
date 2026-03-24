import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import LocationTextItemDescription from '@/components/LocationTextItem/description';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
// import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import AlignedNumber from '@/components/AlignedNumber';
import { getFlowStateCodeByIdsAndVersions } from '@/services/flows/api';
import { ListPagination } from '@/services/general/data';
import { getLangJson, getLangText, getUnitData, jsonToList } from '@/services/general/util';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import type { LciaMethodListData, LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessDetail, getProcessExchange } from '@/services/processes/api';
import {
  FormProcess,
  ProcessDetailResponse,
  ProcessExchangeData,
  ProcessExchangeTable,
} from '@/services/processes/data';
import { genProcessExchangeTableData, genProcessFromData } from '@/services/processes/util';

import { getClassificationValues } from '@/pages/Utils';
import { getRejectedComments, mergeCommentsToData } from '@/pages/Utils/review';
import {
  cacheAndDecompressMethod,
  getDecompressedMethod,
  getReferenceQuantityFromMethod,
} from '@/services/lciaMethods/util';
import { CloseOutlined, ProductOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import type { ButtonType } from 'antd/es/button';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage, useLocation } from 'umi';
import ComplianceItemView from './Compliance/view';
import ProcessExchangeView from './Exchange/view';
import {
  completenessElementaryFlowsTypeOptions,
  completenessElementaryFlowsValueOptions,
  completenessProductModelOptions,
  uncertaintyDistributionTypeOptions,
} from './optiondata';
import ReviewItemView from './Review/view';

import { getExchangeColumns } from './Exchange/column';
import { getDefaultLcaDataScopeForPath } from './lcaAnalysisShared';
import LcaProfileSummary from './lcaProfileSummary';
import {
  copyrightOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  licenseTypeOptions,
  processtypeOfDataSetOptions,
} from './optiondata';

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  disabled: boolean;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  buttonTypeProp?: ButtonType;
  triggerLabel?: ReactNode;
};

type ProcessFormWithId = FormProcess & { id?: string };

type FlowStateCodeItem = {
  id?: string;
  version?: string;
  stateCode?: number;
  classification?: string;
};

type FlowStateCodeResponse = {
  error: unknown;
  data: FlowStateCodeItem[];
};

type ProcessExchangeResponse = {
  data: ProcessExchangeTable[];
  page?: number;
  success?: boolean;
  total?: number;
};

type SolverLciaValueRow = {
  impact_id: string;
  impact_index: number;
  impact_name: string;
  unit: string;
  value: number;
};

type LciaMethodListEntry = {
  id?: string;
  version?: string;
  description?: unknown;
  referenceQuantity?: {
    'common:shortDescription'?: unknown;
  };
};

type LciaMethodMeta = {
  description?: unknown;
  version?: string;
  referenceQuantityDesc?: unknown;
};

const LCA_SCOPE = 'dev-v1';
const UNKNOWN_LCIA_UNIT = 'unknown';

const getLciaMethodMetaMap = async (impactIds: string[]): Promise<Map<string, LciaMethodMeta>> => {
  const impactIdSet = new Set(impactIds.filter((id) => !!id));
  if (impactIdSet.size === 0) {
    return new Map<string, LciaMethodMeta>();
  }

  let listData = await getDecompressedMethod<LciaMethodListData>('list.json');
  const needsUpdate = listData && !listData.files?.[0]?.referenceQuantity;
  if (!listData || needsUpdate) {
    const cached = await cacheAndDecompressMethod('list.json');
    if (!cached) {
      return new Map<string, LciaMethodMeta>();
    }
    listData = await getDecompressedMethod<LciaMethodListData>('list.json');
  }

  const files = Array.isArray(listData?.files) ? (listData.files as LciaMethodListEntry[]) : [];
  const byId = new Map<string, LciaMethodMeta>();
  files.forEach((item) => {
    const methodId = String(item?.id ?? '');
    if (!methodId || !impactIdSet.has(methodId)) {
      return;
    }
    byId.set(methodId, {
      description: item?.description,
      version: item?.version,
      referenceQuantityDesc: getLangJson(item?.referenceQuantity?.['common:shortDescription']),
    });
  });
  return byId;
};

const toLangFallback = (text: string) => getLangJson({ '@xml:lang': 'en', '#text': text });

const buildMergedLciaRows = (
  baseRows: LCIAResultTable[],
  solverRows: SolverLciaValueRow[],
  methodMetaById: Map<string, LciaMethodMeta>,
): LCIAResultTable[] => {
  const mergedRows = baseRows.map((row) => ({
    ...row,
    referenceToLCIAMethodDataSet: { ...row.referenceToLCIAMethodDataSet },
  }));
  const indexByMethodId = new Map<string, number>();
  mergedRows.forEach((row, idx) => {
    const methodId = String(row?.referenceToLCIAMethodDataSet?.['@refObjectId'] ?? '');
    if (methodId) {
      indexByMethodId.set(methodId, idx);
    }
  });

  solverRows.forEach((solverRow) => {
    const methodId = solverRow.impact_id;
    const methodMeta = methodMetaById.get(methodId);
    const shortDescription =
      methodMeta?.description ??
      toLangFallback(solverRow.impact_name?.trim() || solverRow.impact_id || '-');
    const unitDesc =
      methodMeta?.referenceQuantityDesc ??
      (solverRow.unit?.trim() && solverRow.unit !== UNKNOWN_LCIA_UNIT
        ? toLangFallback(solverRow.unit)
        : undefined);
    const existingIdx = indexByMethodId.get(methodId);

    if (existingIdx !== undefined) {
      const existing = mergedRows[existingIdx];
      mergedRows[existingIdx] = {
        ...existing,
        meanAmount: solverRow.value,
        referenceQuantityDesc: existing.referenceQuantityDesc || unitDesc,
        referenceToLCIAMethodDataSet: {
          ...existing.referenceToLCIAMethodDataSet,
          '@version':
            existing.referenceToLCIAMethodDataSet?.['@version'] || methodMeta?.version || '',
          'common:shortDescription':
            existing.referenceToLCIAMethodDataSet?.['common:shortDescription'] ||
            (shortDescription as any),
        },
      };
      return;
    }

    mergedRows.push({
      key: methodId,
      referenceToLCIAMethodDataSet: {
        '@refObjectId': methodId,
        '@type': 'lCIA method data set',
        '@uri': `../lciamethods/${methodId}.xml`,
        '@version': methodMeta?.version || '',
        'common:shortDescription': shortDescription as any,
      },
      meanAmount: solverRow.value,
      referenceQuantityDesc: unitDesc,
    });
  });

  return mergedRows;
};

const toReferenceValue = (reference?: ProcessExchangeData['referenceToFlowDataSet']) => {
  return Array.isArray(reference) ? reference[0] : reference;
};

const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLCIMethodPrincipleOptions = (value: string) => {
  const option = LCIMethodPrincipleOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLCIMethodApproachOptions = (value: string) => {
  const option = LCIMethodApproachOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getCopyrightOptions = (value: string) => {
  const option = copyrightOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};
const getLicenseTypeOptions = (value: string) => {
  const option = licenseTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getComplianceLabel = (value: string) => {
  const option = uncertaintyDistributionTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getCompletenessProductModelOptions = (value: string) => {
  const option = completenessProductModelOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getCompletenessElementaryFlowsTypeOptions = (value: string) => {
  const option = completenessElementaryFlowsTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const getCompletenessElementaryFlowsValueOptions = (value: string) => {
  const option = completenessElementaryFlowsValueOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const ProcessView: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  disabled,
  buttonTypeProp = 'default',
  triggerLabel,
}) => {
  const location = useLocation();
  const defaultLcaDataScope = getDefaultLcaDataScopeForPath(location.pathname);
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [exchangeDataSource, setExchangeDataSource] = useState<ProcessExchangeData[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<Partial<ProcessFormWithId>>({});
  const [lciaResultDataSource, setLciaResultDataSource] = useState<LCIAResultTable[]>([]);
  const [baseLciaResultDataSource, setBaseLciaResultDataSource] = useState<LCIAResultTable[]>([]);
  const [solverLciaLoading, setSolverLciaLoading] = useState(false);
  const [solverLciaLoaded, setSolverLciaLoaded] = useState(false);
  const [solverLciaError, setSolverLciaError] = useState<string | null>(null);
  const [solverLciaMeta, setSolverLciaMeta] = useState<{
    snapshotId: string;
    resultId: string;
    source: string;
    computedAt: string;
  } | null>(null);
  const [solverLciaPendingBuild, setSolverLciaPendingBuild] = useState<{
    jobId: string;
    snapshotId: string;
  } | null>(null);
  // const [lciaResultDataSourceLoading, setLciaResultDataSourceLoading] = useState(false);
  const tabList = [
    {
      key: 'processInformation',
      tab: (
        <FormattedMessage
          id='pages.process.view.processInformation'
          defaultMessage='Process information'
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id='pages.process.view.modellingAndValidation'
          defaultMessage='Modelling and validation'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.process.view.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
    {
      key: 'exchanges',
      tab: <FormattedMessage id='pages.process.view.exchanges' defaultMessage='Exchanges' />,
    },
    {
      key: 'lciaResults',
      tab: <FormattedMessage id='pages.process.view.lciaresults' defaultMessage='LCIA Results' />,
    },
    {
      key: 'validation',
      tab: <FormattedMessage id='pages.process.validation' defaultMessage='Validation' />,
    },
    {
      key: 'complianceDeclarations',
      tab: (
        <FormattedMessage
          id='pages.process.complianceDeclarations'
          defaultMessage='Compliance declarations'
        />
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };
  const baseProcessExchangeColumns = getExchangeColumns(lang);
  const processExchangeColumns: ProColumns<ProcessExchangeTable>[] = [
    ...baseProcessExchangeColumns,
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ProcessExchangeView
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              lang={lang}
            />
          </Space>,
        ];
      },
    },
  ];
  const lciaResultColumns: ProColumns<LCIAResultTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      width: 70,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.shortDescription'
          defaultMessage='LCIA'
        />
      ),
      dataIndex: 'Name',
      search: false,
      width: 500,
      render: (_, row) => {
        return [
          <span key={0}>
            {getLangText(row?.referenceToLCIAMethodDataSet?.['common:shortDescription'], lang)}
          </span>,
        ];
      },
    },

    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.meanAmount'
          defaultMessage='Mean amount'
        />
      ),
      dataIndex: 'meanAmount',
      search: false,
      render: (_, row) => {
        return [<AlignedNumber key={0} value={row.meanAmount} />];
      },
    },
    {
      title: <FormattedMessage id='pages.process.view.lciaresults.unit' defaultMessage='Unit' />,
      dataIndex: 'referenceQuantity',
      search: false,
      render: (_, row) => {
        return [<span key={0}>{getLangText(row?.referenceQuantityDesc, lang) || '-'}</span>];
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.lciaresults.referenceToLCIAMethodDataSetVersion'
          defaultMessage='Version'
        />
      ),
      dataIndex: 'Version',
      search: false,
      render: (_, row) => {
        return [
          <Tooltip
            key={0}
            placement='topLeft'
            title={row?.referenceToLCIAMethodDataSet?.['@version']}
          >
            {row?.referenceToLCIAMethodDataSet?.['@version']}
          </Tooltip>,
        ];
      },
    },
  ];
  const loadSolverLciaResults = useCallback(
    async (forceReload: boolean) => {
      if (solverLciaLoading) {
        return;
      }
      if (solverLciaLoaded && !forceReload) {
        return;
      }
      setSolverLciaLoading(true);
      setSolverLciaError(null);
      setSolverLciaPendingBuild(null);
      try {
        const queried = await queryLcaResults({
          scope: LCA_SCOPE,
          ...(defaultLcaDataScope ? { data_scope: defaultLcaDataScope } : {}),
          mode: 'process_all_impacts',
          process_id: id,
          process_version: version,
          allow_fallback: false,
        });
        const values = (queried.data as { values?: unknown[] })?.values;
        const rows = (Array.isArray(values) ? values : [])
          .map((item) => {
            const row = item as {
              impact_id?: unknown;
              impact_index?: unknown;
              impact_name?: unknown;
              unit?: unknown;
              value?: unknown;
            };
            return {
              impact_id: String(row.impact_id ?? ''),
              impact_index: Number(row.impact_index ?? 0),
              impact_name: String(row.impact_name ?? ''),
              unit: String(row.unit ?? ''),
              value: Number(row.value ?? 0),
            } as SolverLciaValueRow;
          })
          .filter((row) => row.impact_id.length > 0)
          .sort((a, b) => a.impact_index - b.impact_index);
        const methodMetaById = await getLciaMethodMetaMap(rows.map((row) => row.impact_id));
        const mergedRows = buildMergedLciaRows(baseLciaResultDataSource, rows, methodMetaById);
        setLciaResultDataSource(mergedRows);
        setSolverLciaMeta({
          snapshotId: queried.snapshot_id,
          resultId: queried.result_id,
          source: queried.source,
          computedAt: queried.meta.computed_at,
        });
        setSolverLciaPendingBuild(null);
        setSolverLciaLoaded(true);
      } catch (error: unknown) {
        if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
          const buildJobId =
            typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
          const buildSnapshotId =
            typeof error.body?.build_snapshot_id === 'string'
              ? error.body.build_snapshot_id.trim()
              : '';
          if (buildJobId && buildSnapshotId) {
            setSolverLciaPendingBuild({
              jobId: buildJobId,
              snapshotId: buildSnapshotId,
            });
            setSolverLciaMeta(null);
            setSolverLciaError(null);
            setSolverLciaLoaded(true);
            return;
          }
        }
        setSolverLciaPendingBuild(null);
        setLciaResultDataSource(baseLciaResultDataSource);
        setSolverLciaMeta(null);
        setSolverLciaError(error instanceof Error ? error.message : String(error));
        setSolverLciaLoaded(true);
      } finally {
        setSolverLciaLoading(false);
      }
    },
    [
      baseLciaResultDataSource,
      defaultLcaDataScope,
      id,
      solverLciaLoaded,
      solverLciaLoading,
      version,
    ],
  );

  useEffect(() => {
    if (!drawerVisible || activeTabKey !== 'lciaResults') {
      return;
    }
    void loadSolverLciaResults(false);
  }, [activeTabKey, drawerVisible, loadSolverLciaResults]);

  useEffect(() => {
    if (!drawerVisible || activeTabKey !== 'lciaResults' || !solverLciaPendingBuild) {
      return;
    }
    const timer = globalThis.setTimeout(() => {
      void loadSolverLciaResults(true);
    }, 4000);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [activeTabKey, drawerVisible, loadSolverLciaResults, solverLciaPendingBuild]);

  // const getLCIAResult = async () => {
  //   setLciaResultDataSourceLoading(true);
  //   const lciaResults = await LCIAResultCalculation(exchangeDataSource);
  //   setLciaResultDataSource(lciaResults ?? []);
  //   setLciaResultDataSourceLoading(false);
  // };

  const contentList: Record<string, React.ReactNode> = {
    processInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.process.view.processInformation.id' defaultMessage='ID' />
            }
            styles={{ label: { width: '100px' } }}
          >
            {initData.processInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.name'
              defaultMessage='Name'
            />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            {
              <FormattedMessage
                id='pages.process.view.processInformation.baseName'
                defaultMessage='Base name'
              />
            }
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.dataSetInformation?.name?.baseName}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.treatmentStandardsRoutes'
              defaultMessage='Treatment, standards, routes'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name?.treatmentStandardsRoutes ??
              '-'
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.mixAndLocationTypes'
              defaultMessage='Mix and Location Types'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name?.mixAndLocationTypes ?? '-'
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.functionalUnitFlowProperties'
              defaultMessage='Quantitative product or process properties'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData?.processInformation?.dataSetInformation?.name
                ?.functionalUnitFlowProperties ?? '-'
            }
          />
        </Card>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.identifierOfSubDataSet'
                defaultMessage='Identifier of sub-data set'
              />
            }
            styles={{ label: { width: '140px' } }}
          >
            {initData.processInformation?.dataSetInformation?.identifierOfSubDataSet ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.processInformation.synonyms'
            defaultMessage='Synonyms'
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.processInformation?.dataSetInformation?.['common:synonyms']}
        />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.processInformation.generalComment'
            defaultMessage='General comment on data set'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.dataSetInformation?.['common:generalComment']}
        />
        <br />
        <LevelTextItemDescription
          data={getClassificationValues(
            initData.processInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class'],
          )}
          lang={lang}
          categoryType={'Process'}
        />
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.referenceToExternalDocumentation'
              defaultMessage='Data set LCA report, background info'
            />
          }
          data={initData.processInformation?.dataSetInformation?.referenceToExternalDocumentation}
          lang={lang}
        />
        {/* <Card size="small" title={'Quantitative Reference'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Type" styles={{ label: { width: '100px' } }}>
              {initData.processInformation?.quantitativeReference?.['@type'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Reference To Reference Flow"
              styles={{ label: { width: '220px' } }}
            >
              {initData.processInformation?.quantitativeReference?.referenceToReferenceFlow ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Functional Unit Or Other
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.quantitativeReference?.functionalUnitOrOther}
          />
        </Card>
        <br /> */}
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.time'
              defaultMessage='Time representativeness'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.referenceYear'
                  defaultMessage='Reference year'
                />
              }
              styles={{ label: { width: '140px' } }}
            >
              {initData.processInformation?.time?.['common:referenceYear'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.dataSetValidUntil'
                  defaultMessage='Data set valid until:'
                />
              }
              styles={{ label: { width: '140px' } }}
            >
              {initData.processInformation?.time?.['common:dataSetValidUntil'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.timeRepresentativenessDescription'
              defaultMessage='Time representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.time?.['common:timeRepresentativenessDescription']}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.locationOfOperationSupplyOrProduction'
              defaultMessage='Location'
            />
          }
        >
          <LocationTextItemDescription
            lang={lang}
            data={
              initData.processInformation?.geography?.locationOfOperationSupplyOrProduction?.[
                '@location'
              ] ?? '-'
            }
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.location'
                defaultMessage='Location'
              />
            }
            styles={{ label: { width: '100px' } }}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.geography?.locationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.subLocationOfOperationSupplyOrProduction'
              defaultMessage='Sub-location(s)'
            />
          }
        >
          <LocationTextItemDescription
            lang={lang}
            data={
              initData.processInformation?.geography?.subLocationOfOperationSupplyOrProduction?.[
                '@subLocation'
              ] ?? '-'
            }
            label={
              <FormattedMessage
                id='pages.process.view.processInformation.location'
                defaultMessage='Sub-location(s)'
              />
            }
            styles={{ label: { width: '100px' } }}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.descriptionOfRestrictions'
              defaultMessage='Geographical representativeness description'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.geography?.subLocationOfOperationSupplyOrProduction
                ?.descriptionOfRestrictions
            }
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.technology'
              defaultMessage='Technological representativeness'
            />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.technologyDescriptionAndIncludedProcesses'
              defaultMessage='Technology description including background system'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.processInformation?.technology?.technologyDescriptionAndIncludedProcesses
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.processInformation.technologicalApplicability'
              defaultMessage='Technical purpose of product or process'
            />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.technology?.technologicalApplicability}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.referenceToTechnologyPictogramme'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            data={initData.processInformation?.technology?.referenceToTechnologyPictogramme ?? {}}
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.processInformation.referenceToTechnologyFlowDiagrammOrPicture'
                defaultMessage='Flow diagramm(s) or picture(s)'
              />
            }
            data={
              initData.processInformation?.technology?.referenceToTechnologyFlowDiagrammOrPicture ??
              {}
            }
            lang={lang}
          />
        </Card>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.processInformation.modelDescription'
            defaultMessage='Model description'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.processInformation?.mathematicalRelations?.modelDescription}
        />
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.processInformation.variableParameter'
              defaultMessage='Variable / parameter'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.name'
                  defaultMessage='Name of variable'
                />
              }
              styles={{ label: { width: '120px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter?.['@name'] ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.formula'
                  defaultMessage='Formula'
                />
              }
              styles={{ label: { width: '120px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter?.formula ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.meanValue'
                  defaultMessage='Mean value'
                />
              }
              styles={{ label: { width: '120px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter?.meanValue ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.minimumValue'
                  defaultMessage='Minimum value'
                />
              }
              styles={{ label: { width: '120px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter
                ?.minimumValue ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.maximumValue'
                  defaultMessage='Maximum value'
                />
              }
              styles={{ label: { width: '120px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter
                ?.maximumValue ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.uncertaintyDistributionType'
                  defaultMessage='Uncertainty distribution type'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              {getComplianceLabel(
                initData.processInformation?.mathematicalRelations?.variableParameter
                  ?.uncertaintyDistributionType ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.processInformation.variableParameter.relativeStandardDeviation95In'
                  defaultMessage='Relative StdDev in %'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              {initData.processInformation?.mathematicalRelations?.variableParameter
                ?.relativeStandardDeviation95In ?? '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin='0' orientation='left' plain>
            {
              <FormattedMessage
                id='pages.process.view.processInformation.variableParameter.comment'
                defaultMessage='Comment, units, defaults'
              />
            }
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.mathematicalRelations?.variableParameter?.comment}
          />
        </Card>
      </>
    ),
    modellingAndValidation: (
      <>
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.lCIMethodAndAllocation'
              defaultMessage='LCI method and allocation'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.typeOfDataSet'
                  defaultMessage='Type of data set'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {getProcesstypeOfDataSetOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.lCIMethodPrinciple'
                  defaultMessage='LCI method principle'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {getLCIMethodPrincipleOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodPrinciple'
              defaultMessage='Deviation from LCI method principle / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromLCIMethodPrinciple
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.lCIMethodApproaches'
                  defaultMessage='LCI method approaches'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {getLCIMethodApproachOptions(
                initData.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromLCIMethodApproaches'
              defaultMessage='Deviations from LCI method approaches / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromLCIMethodApproaches
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.modellingConstants'
              defaultMessage='Modelling constants'
            />
          </Divider>
          <LangTextItemDescription
            data={initData.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants}
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromModellingConstants'
              defaultMessage='Deviation from modelling constants / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.deviationsFromModellingConstants
            }
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToLCAMethodDetails'
                defaultMessage='LCA methodology report'
              />
            }
            data={
              initData.modellingAndValidation?.LCIMethodAndAllocation
                ?.referenceToLCAMethodDetails ?? {}
            }
            lang={lang}
          />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness'
              defaultMessage='Data sources, treatment, and representativeness'
            />
          }
        >
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataCutOffAndCompletenessPrinciples'
              defaultMessage='Data cut-off and completeness principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromCutOffAndCompletenessPrinciples'
              defaultMessage='Deviation from data cut-off and completeness principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromCutOffAndCompletenessPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataSelectionAndCombinationPrinciples'
              defaultMessage='Data selection and combination principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromSelectionAndCombinationPrinciples'
              defaultMessage='Deviation from data selection and combination principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromSelectionAndCombinationPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataTreatmentAndExtrapolationsPrinciples'
              defaultMessage='Data treatment and extrapolations principles'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataTreatmentAndExtrapolationsPrinciples
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.deviationsFromTreatmentAndExtrapolationPrinciples'
              defaultMessage='Deviation from data treatment and extrapolations principles / explanations'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.deviationsFromTreatmentAndExtrapolationPrinciples
            }
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToDataHandlingPrinciples'
                defaultMessage='Data handling report'
              />
            }
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataHandlingPrinciples ?? {}
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.referenceToDataSource'
                defaultMessage='Data source(s) used for this data set'
              />
            }
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.referenceToDataSource ?? {}
            }
            lang={lang}
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.percentageSupplyOrProductionCovered'
                  defaultMessage='Percentage supply or production covered'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.percentageSupplyOrProductionCovered ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.annualSupplyOrProductionVolume'
              defaultMessage='Annual supply or production volume'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.annualSupplyOrProductionVolume
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.samplingProcedure'
              defaultMessage='Sampling procedure'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.samplingProcedure
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.dataCollectionPeriod'
              defaultMessage='Data collection period'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.dataCollectionPeriod
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.uncertaintyAdjustments'
              defaultMessage='Uncertainty adjustments'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.uncertaintyAdjustments
            }
          />
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.useAdviceForDataSet'
              defaultMessage='Use advice for data set'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                ?.useAdviceForDataSet
            }
          />
        </Card>
        <br />
        {/* <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.modellingAndValidation.completenessOtherProblemField'
            defaultMessage='Completeness other problem field(s)'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.modellingAndValidation?.completeness?.completenessOtherProblemField}
        /> */}
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.completeness'
              defaultMessage='Completeness'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.modellingAndValidation.completeness.completenessProductModel'
                  defaultMessage='Completeness product model'
                />
              }
              styles={{ label: { width: '140px' } }}
            >
              {getCompletenessProductModelOptions(
                initData.modellingAndValidation?.completeness?.completenessProductModel ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows'
                defaultMessage='Completeness elementary flows, per topic'
              />
            }
          >
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows.type'
                    defaultMessage='completeness type'
                  />
                }
                styles={{ label: { width: '140px' } }}
              >
                {getCompletenessElementaryFlowsTypeOptions(
                  initData.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                    '@type'
                  ] ?? '-',
                )}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id='pages.process.view.modellingAndValidation.completeness.completenessElementaryFlows.value'
                    defaultMessage='value'
                  />
                }
                styles={{ label: { width: '140px' } }}
              >
                {getCompletenessElementaryFlowsValueOptions(
                  initData.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                    '@value'
                  ] ?? '-',
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.modellingAndValidation.completeness.completenessOtherProblemField'
              defaultMessage='Completeness other problem field(s)'
            />
          </Divider>
          <LangTextItemDescription
            data={initData.modellingAndValidation?.completeness?.completenessOtherProblemField}
          />
        </Card>
        <br />
      </>
    ),
    administrativeInformation: (
      <>
        <ContactSelectDescription
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.referenceToCommissioner'
              defaultMessage='Commissioner of data set'
            />
          }
          lang={lang}
          data={
            initData.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:referenceToCommissioner'
            ]
          }
        />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.administrativeInformation.project'
            defaultMessage='Project'
          />
        </Divider>
        <LangTextItemDescription
          data={
            initData.administrativeInformation?.['common:commissionerAndGoal']?.['common:project']
          }
        />
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.process.view.administrativeInformation.intendedApplications'
            defaultMessage='Intended applications'
          />
        </Divider>
        <LangTextItemDescription
          data={
            initData.administrativeInformation?.['common:commissionerAndGoal']?.[
              'common:intendedApplications'
            ]
          }
        />
        <br />

        <ContactSelectDescription
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.RreferenceToPersonOrEntityGeneratingTheDataSet'
              defaultMessage='Data set generator / modeller'
            />
          }
          lang={lang}
          data={
            initData.administrativeInformation?.dataGenerator?.[
              'common:referenceToPersonOrEntityGeneratingTheDataSet'
            ]
          }
        />
        <br />

        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.dataEntryBy'
              defaultMessage='Data entry by'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.timeStamp'
                  defaultMessage='Time stamp (last saved)'
                />
              }
              styles={{ label: { width: '200px' } }}
            >
              {initData?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            title={
              <FormattedMessage
                id='pages.flow.process.administrativeInformation.referenceToDataSetFormat'
                defaultMessage='Data set format(s)'
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToConvertedOriginalDataSetFrom'
              ]
            }
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToConvertedOriginalDataSetFrom'
                defaultMessage='Converted original data set from:'
              />
            }
            lang={lang}
          />
          <br />
          <ContactSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToPersonOrEntityEnteringTheData'
              ]
            }
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToPersonOrEntityEnteringTheData'
                defaultMessage='Data entry by:'
              />
            }
            lang={lang}
          />
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.[
                'common:referenceToDataSetUseApproval'
              ]
            }
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToDataSetUseApproval'
                defaultMessage='Official approval of data set by producer/operator:'
              />
            }
            lang={lang}
          />
          <br />
        </Card>
        <br />
        <Card
          size='small'
          title={
            <FormattedMessage
              id='pages.process.view.administrativeInformation.publicationAndOwnership'
              defaultMessage='Publication and ownership'
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.dateOfLastRevision'
                  defaultMessage='Date of last revision'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dateOfLastRevision'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.dataSetVersion'
                  defaultMessage='Data set version'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              <Space>
                {initData.administrativeInformation?.publicationAndOwnership?.[
                  'common:dataSetVersion'
                ] ?? '-'}
              </Space>
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.permanentDataSetURI'
                  defaultMessage='Permanent data set URI'
                />
              }
              styles={{ label: { width: '220px' } }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.workflowAndPublicationStatus'
                  defaultMessage='Workflow and publication status	'
                />
              }
              styles={{ label: { width: '240px' } }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:workflowAndPublicationStatus'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToUnchangedRepublication'
                defaultMessage='Unchanged re-publication of:'
              />
            }
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToUnchangedRepublication'
              ] ?? {}
            }
            lang={lang}
          />
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToRegistrationAuthority'
                defaultMessage='Registration authority'
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToRegistrationAuthority'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.registrationNumber'
                  defaultMessage='Registration number'
                />
              }
              styles={{ label: { width: '140px' } }}
            >
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:registrationNumber'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToOwnershipOfDataSet'
                defaultMessage='Owner of data set'
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToOwnershipOfDataSet'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.copyright'
                  defaultMessage='Copyright?'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              {getCopyrightOptions(
                initData.administrativeInformation?.publicationAndOwnership?.['common:copyright'] ??
                  '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <ContactSelectDescription
            title={
              <FormattedMessage
                id='pages.process.view.administrativeInformation.referenceToEntitiesWithExclusiveAccess'
                defaultMessage='Entities or persons with exclusive access to this data set'
              />
            }
            lang={lang}
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:referenceToEntitiesWithExclusiveAccess'
              ]
            }
          />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.process.view.administrativeInformation.licenseType'
                  defaultMessage='License type'
                />
              }
              styles={{ label: { width: '180px' } }}
            >
              {getLicenseTypeOptions(
                initData.administrativeInformation?.publicationAndOwnership?.[
                  'common:licenseType'
                ] ?? '-',
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin='0' orientation='left' plain>
            <FormattedMessage
              id='pages.process.view.administrativeInformation.accessRestrictions'
              defaultMessage='Access and use restrictions'
            />
          </Divider>
          <LangTextItemDescription
            data={
              initData.administrativeInformation?.publicationAndOwnership?.[
                'common:accessRestrictions'
              ]
            }
          />
        </Card>
      </>
    ),
    exchanges: (
      <>
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: <FormattedMessage id='pages.process.exchange.input' defaultMessage='Input' />,
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Input',
                      params,
                    ).then((res) => {
                      const processExchangeRes = res as ProcessExchangeResponse;
                      return getUnitData('flow', processExchangeRes?.data).then((unitRes) => {
                        const normalizedUnitRes = (unitRes ?? []) as ProcessExchangeTable[];
                        const flows = exchangeDataSource.map((item) => {
                          const ref = toReferenceValue(item?.referenceToFlowDataSet);
                          return {
                            id: ref?.['@refObjectId'] ?? '',
                            version: ref?.['@version'] ?? '',
                          };
                        });
                        return getFlowStateCodeByIdsAndVersions(flows, lang).then((flowRes) => {
                          const { error, data: flowsResp } = flowRes as FlowStateCodeResponse;
                          if (!error) {
                            normalizedUnitRes.forEach((item) => {
                              const flow = flowsResp.find(
                                (flowItem) =>
                                  flowItem.id === item?.referenceToFlowDataSetId &&
                                  flowItem.version === item?.referenceToFlowDataSetVersion,
                              );
                              if (flow) {
                                item.stateCode = flow.stateCode;
                                item['classification'] = flow.classification ?? '';
                              }
                            });
                          }
                          return {
                            ...processExchangeRes,
                            data: normalizedUnitRes,
                            success: true,
                          };
                        });
                      });
                    });
                  }}
                  columns={processExchangeColumns}
                />
              ),
            },
          ]}
        />
        <Collapse
          defaultActiveKey={['1']}
          items={[
            {
              key: '1',
              label: (
                <FormattedMessage id='pages.process.exchange.output' defaultMessage='Output' />
              ),
              children: (
                <ProTable<ProcessExchangeTable, ListPagination>
                  search={false}
                  pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                  }}
                  request={async (params: { pageSize: number; current: number }) => {
                    return getProcessExchange(
                      genProcessExchangeTableData(exchangeDataSource, lang),
                      'Output',
                      params,
                    ).then((res) => {
                      const processExchangeRes = res as ProcessExchangeResponse;
                      return getUnitData('flow', processExchangeRes?.data).then((unitRes) => {
                        const normalizedUnitRes = (unitRes ?? []) as ProcessExchangeTable[];
                        const flows = exchangeDataSource.map((item) => {
                          const ref = toReferenceValue(item?.referenceToFlowDataSet);
                          return {
                            id: ref?.['@refObjectId'] ?? '',
                            version: ref?.['@version'] ?? '',
                          };
                        });
                        return getFlowStateCodeByIdsAndVersions(flows, lang).then((flowRes) => {
                          const { error, data: flowsResp } = flowRes;
                          if (!error) {
                            normalizedUnitRes.forEach((item) => {
                              const flow = flowsResp.find(
                                (flowItem) =>
                                  flowItem.id === item?.referenceToFlowDataSetId &&
                                  flowItem.version === item?.referenceToFlowDataSetVersion,
                              );
                              if (flow) {
                                item.stateCode = flow.stateCode;
                                item['classification'] = flow.classification ?? '';
                              }
                            });
                          }
                          return {
                            ...processExchangeRes,
                            data: normalizedUnitRes,
                            success: true,
                          };
                        });
                      });
                    });
                  }}
                  columns={processExchangeColumns}
                />
              ),
            },
          ]}
        />
      </>
    ),
    lciaResults: (
      <Space direction='vertical' size={'middle'} style={{ width: '100%' }}>
        <Space size={'middle'} wrap>
          <Button
            size='small'
            loading={solverLciaLoading}
            onClick={() => {
              void loadSolverLciaResults(true);
            }}
          >
            <FormattedMessage
              id='pages.process.view.lciaresults.solver.reload'
              defaultMessage='Refresh latest calculated results'
            />
          </Button>
          {solverLciaMeta && (
            <Typography.Text type='secondary'>
              {`source=${solverLciaMeta.source}, snapshot=${solverLciaMeta.snapshotId}, result=${solverLciaMeta.resultId}, computed_at=${solverLciaMeta.computedAt}`}
            </Typography.Text>
          )}
          {solverLciaPendingBuild && (
            <Typography.Text type='secondary'>
              <FormattedMessage
                id='pages.process.view.lciaresults.solver.snapshotBuilding'
                defaultMessage='Snapshot is rebuilding (job {jobId}). Retrying automatically...'
                values={{ jobId: solverLciaPendingBuild.jobId }}
              />
            </Typography.Text>
          )}
        </Space>
        {solverLciaError && !solverLciaPendingBuild && (
          <Typography.Text type='danger'>
            <FormattedMessage
              id='pages.process.view.lciaresults.solver.error'
              defaultMessage='Result query failed: {message}'
              values={{ message: solverLciaError }}
            />
          </Typography.Text>
        )}
        <LcaProfileSummary rows={lciaResultDataSource} lang={lang} loading={solverLciaLoading} />
        <ProTable<LCIAResultTable, ListPagination>
          rowKey={(row) => row.referenceToLCIAMethodDataSet?.['@refObjectId'] || row.key}
          loading={solverLciaLoading}
          search={false}
          options={false}
          dataSource={lciaResultDataSource}
          columns={lciaResultColumns}
        />
      </Space>
    ),
    validation: (
      <ReviewItemView data={initData?.modellingAndValidation?.validation?.review ?? []} />
    ),
    complianceDeclarations: (
      <ComplianceItemView
        data={initData?.modellingAndValidation?.complianceDeclarations?.compliance ?? []}
      />
    ),
  };

  const onView = async () => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
    setSpinning(true);
    setLciaResultDataSource([]);
    setBaseLciaResultDataSource([]);
    setSolverLciaError(null);
    setSolverLciaMeta(null);
    setSolverLciaPendingBuild(null);
    setSolverLciaLoaded(false);
    setSolverLciaLoading(false);
    getProcessDetail(id, version).then(async (result: ProcessDetailResponse) => {
      const formData = genProcessFromData(result.data?.json?.processDataSet ?? {});
      if ((result?.data?.stateCode ?? 100) < 100) {
        const rejectedCommentsRes = await getRejectedComments(id, version);
        mergeCommentsToData(rejectedCommentsRes, formData);
      }
      setInitData({ ...formData, id: id });
      setExchangeDataSource([...(formData?.exchanges?.exchange ?? [])]);
      const sourceData = jsonToList(formData?.LCIAResults?.LCIAResult) as LCIAResultTable[];
      await getReferenceQuantityFromMethod(sourceData);
      setBaseLciaResultDataSource(sourceData);
      setLciaResultDataSource(sourceData);
      // if (dataSource === 'my') {
      //   setFooterButtons(
      //     <>
      //       {/* <ContactDelete
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       />
      //       <ContactEdit
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       /> */}
      //     </>,
      //   );
      // } else {
      //   setFooterButtons(<></>);
      // }
      setSpinning(false);
    });
  };

  return (
    <>
      {buttonType === 'toolIcon' ? (
        <Tooltip
          title={
            <FormattedMessage
              id='pages.button.model.process'
              defaultMessage='Process infomation'
            ></FormattedMessage>
          }
          placement='left'
        >
          <Button
            type='primary'
            size='small'
            style={{ boxShadow: 'none' }}
            icon={<ProfileOutlined />}
            onClick={onView}
            disabled={disabled}
          />
        </Tooltip>
      ) : buttonType === 'toolResultIcon' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />}
          placement='left'
        >
          <Button
            disabled={id === ''}
            type='primary'
            icon={<ProductOutlined />}
            size='small'
            style={{ boxShadow: 'none' }}
            onClick={onView}
          />
        </Tooltip>
      ) : buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button
            shape='circle'
            type={buttonTypeProp}
            icon={<ProfileOutlined />}
            size='small'
            onClick={onView}
          />
        </Tooltip>
      ) : buttonType === 'link' ? (
        disabled || id === '' ? (
          <Typography.Text type='secondary'>
            {triggerLabel ?? <FormattedMessage id='pages.button.view' defaultMessage='View' />}
          </Typography.Text>
        ) : (
          <Typography.Link onClick={onView}>
            {triggerLabel ?? <FormattedMessage id='pages.button.view' defaultMessage='View' />}
          </Typography.Link>
        )
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='pages.button.view' defaultMessage='View' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.process.drawer.title.view' defaultMessage='View process' />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        // footer={
        //   <Space size={'middle'} className={styles.footer_right}>
        //     {footerButtons}
        //   </Space>
        // }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessView;

export { buildMergedLciaRows, getLciaMethodMetaMap, toReferenceValue };
