import { getLangText } from '@/services/general/util';
import type {
  LifeCycleModelEditorFormState,
  LifeCycleModelGraphEdge,
  LifeCycleModelGraphNode,
  LifeCycleModelPortItem,
  LifeCycleModelSelectedPortPayload,
  LifeCycleModelThemeToken,
} from '@/services/lifeCycleModels/data';
import { genPortLabel } from '@/services/lifeCycleModels/util';
import type {
  ProcessDetailByVersionItem,
  ProcessDetailResponse,
  ProcessExchangeData,
} from '@/services/processes/data';
import { genProcessFromData, genProcessName, genProcessNameJson } from '@/services/processes/util';
import type { Edge as X6Edge, Node as X6Node } from '@antv/x6';
import { getEdgeLabel, type EdgeLabelText } from './edge';
import {
  getPortLabelWithAllocation,
  getPortTextColor,
  getPortTextStyle,
  nodeTitleTool,
} from './node';

type ToolbarToolContext = {
  refTool: any;
  nonRefTool: any;
  inputFlowTool: any;
  outputFlowTool: any;
  token: LifeCycleModelThemeToken;
  lang: string;
  nodeTemplateWidth: number;
};

type ToolbarNodeHydrationContext = ToolbarToolContext & {
  nodeAttrs: LifeCycleModelGraphNode['attrs'];
  portsGroups: NonNullable<LifeCycleModelGraphNode['ports']>['groups'];
};

type GraphNodeLike = Pick<LifeCycleModelGraphNode, 'id' | 'selected'>;
type GraphEdgeLike = Pick<LifeCycleModelGraphEdge, 'id' | 'selected' | 'source' | 'target'>;

const getNodeWidth = (
  node: Pick<LifeCycleModelGraphNode, 'size' | 'width'> | undefined,
  fallbackWidth: number,
) => node?.size?.width ?? node?.width ?? fallbackWidth;

const getPortTextLimit = (lang: string, nodeWidth: number) =>
  lang === 'zh' ? nodeWidth / 12 - 4 : nodeWidth / 7 - 4;

const getDisplayPortText = (labelWithAllocation: string, lang: string, nodeWidth: number) => {
  const limit = getPortTextLimit(lang, nodeWidth);
  const truncated = labelWithAllocation.substring(0, limit);

  if (labelWithAllocation.length > limit) {
    return `${truncated}...`;
  }

  return labelWithAllocation;
};

const buildDisplayPortItem = (
  item: LifeCycleModelPortItem,
  nodeWidth: number,
  lang: string,
  token: LifeCycleModelThemeToken,
) => {
  const itemText = getLangText(item?.data?.textLang, lang);
  const itemTextWithAllocation = getPortLabelWithAllocation(
    itemText ?? '',
    item?.data?.allocations,
    item?.group === 'groupOutput' ? 'OUTPUT' : 'INPUT',
  );

  return {
    ...item,
    attrs: {
      ...item?.attrs,
      text: {
        ...item?.attrs?.text,
        text: `${genPortLabel(itemTextWithAllocation, lang, nodeWidth)}`,
        title: itemTextWithAllocation,
        fill: getPortTextColor(item?.data?.quantitativeReference, item?.data?.allocations, token),
        'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
      },
    },
  };
};

export const buildEditorNodeTools = ({
  isReference,
  nodeLabel,
  nodeWidth,
  refTool,
  nonRefTool,
  inputFlowTool,
  outputFlowTool,
  token,
  lang,
}: ToolbarToolContext & {
  isReference: boolean;
  nodeLabel: unknown;
  nodeWidth: number;
}) => [
  isReference ? refTool : nonRefTool,
  nodeTitleTool(nodeWidth, genProcessName(nodeLabel, lang) ?? '', token, lang),
  inputFlowTool,
  outputFlowTool,
];

const buildProcessNodeTools = ({
  isReference,
  nodeLabel,
  nodeWidth,
  refTool,
  nonRefTool,
  inputFlowTool,
  outputFlowTool,
  token,
  lang,
}: ToolbarToolContext & {
  isReference: boolean;
  nodeLabel: unknown;
  nodeWidth: number;
}) => [
  nodeTitleTool(nodeWidth, genProcessName(nodeLabel, lang) ?? '', token, lang),
  isReference ? refTool : nonRefTool,
  inputFlowTool,
  outputFlowTool,
];

export const normalizePastedReferenceCells = (
  cells: Array<X6Node | X6Edge>,
  buildNodeTools: (nodeLabel: unknown, nodeWidth: number, isReference: boolean) => any[],
  fallbackWidth: number,
) => {
  cells.forEach((cell) => {
    if (!cell.isNode()) {
      return;
    }

    const node = cell as X6Node;
    const nodeData = node.getData() as LifeCycleModelGraphNode['data'] | undefined;
    if (nodeData?.quantitativeReference !== '1') {
      return;
    }

    const nodeWidth = node.getSize().width || fallbackWidth || 350;
    node.setData({
      ...nodeData,
      quantitativeReference: '0',
    });
    node.addTools(buildNodeTools(nodeData?.label, nodeWidth, false), { reset: true });
  });
};

export const resolveDeleteSelection = (
  nodes: GraphNodeLike[],
  edges: GraphEdgeLike[],
): { selectedNodeIds: string[]; selectedEdgeIds: string[] } => {
  const selectedNodeIds = nodes
    .filter((node) => node.selected)
    .map((node) => node.id ?? '')
    .filter(Boolean);
  const selectedEdgeIds = new Set(
    edges
      .filter((edge) => edge.selected)
      .map((edge) => edge.id ?? '')
      .filter(Boolean),
  );

  if (selectedNodeIds.length > 0) {
    const selectedNodeIdSet = new Set(selectedNodeIds);
    edges.forEach((edge) => {
      const sourceCell = (edge.source as { cell?: string } | undefined)?.cell;
      const targetCell = (edge.target as { cell?: string } | undefined)?.cell;
      if (
        (sourceCell && selectedNodeIdSet.has(sourceCell)) ||
        (targetCell && selectedNodeIdSet.has(targetCell))
      ) {
        selectedEdgeIds.add(edge.id ?? '');
      }
    });
  }

  return {
    selectedNodeIds,
    selectedEdgeIds: Array.from(selectedEdgeIds),
  };
};

export const buildPortSelectionUpdate = ({
  selectedNode,
  direction,
  payload,
  lang,
  token,
  portsTemplate,
}: {
  selectedNode?: LifeCycleModelGraphNode;
  direction: string;
  payload: LifeCycleModelSelectedPortPayload;
  lang: string;
  token: LifeCycleModelThemeToken;
  portsTemplate: LifeCycleModelGraphNode['ports'];
}) => {
  if (!selectedNode?.size?.width) {
    return null;
  }

  const group = direction === 'Output' ? 'groupOutput' : 'groupInput';
  const originalItems: LifeCycleModelPortItem[] =
    selectedNode?.ports?.items?.filter((item: LifeCycleModelPortItem) => item?.group !== group) ??
    [];
  const nodeWidth = selectedNode.size.width;
  const selectedRows = payload?.selectedRowData ?? [];
  const baseY = group === 'groupOutput' ? 65 + originalItems.length * 20 : 65;
  const newItems: LifeCycleModelPortItem[] = selectedRows.map(
    (item: ProcessExchangeData, index) => {
      const refFlow = Array.isArray(item?.referenceToFlowDataSet)
        ? item?.referenceToFlowDataSet[0]
        : item?.referenceToFlowDataSet;
      const textLang = refFlow?.['common:shortDescription'];
      const flowDirection = direction.toUpperCase();
      const flowUUID = refFlow?.['@refObjectId'] ?? '-';
      const label = getLangText(textLang, lang);
      const labelWithAllocation = getPortLabelWithAllocation(
        label,
        item?.allocations,
        flowDirection,
      );

      return {
        id: `${flowDirection}:${flowUUID}`,
        args: { x: group === 'groupOutput' ? '100%' : 0, y: baseY + index * 20 },
        attrs: {
          text: {
            text: getDisplayPortText(labelWithAllocation, lang, nodeWidth),
            title: labelWithAllocation,
            cursor: 'pointer',
            fill: getPortTextColor(item?.quantitativeReference, item?.allocations, token),
            'font-weight': getPortTextStyle(item?.quantitativeReference),
          },
        },
        group,
        data: {
          textLang,
          flowId: refFlow?.['@refObjectId'],
          flowVersion: refFlow?.['@version'],
          quantitativeReference: item?.quantitativeReference,
          allocations: item?.allocations,
        },
      };
    },
  );

  const items =
    group === 'groupInput'
      ? [
          ...newItems,
          ...originalItems.map((item: LifeCycleModelPortItem, index) => ({
            ...item,
            args: { ...item.args, y: 65 + (newItems.length + index) * 20 },
          })),
        ]
      : [...originalItems, ...newItems];

  return {
    ports: {
      ...portsTemplate,
      items,
    },
    width: nodeWidth,
    height: 60 + items.length * 20,
  };
};

export const buildProcessNodesFromDetails = ({
  details,
  nodeCount,
  nodeTemplate,
  portsTemplate,
  createId,
  refTool,
  nonRefTool,
  inputFlowTool,
  outputFlowTool,
  token,
  lang,
}: ToolbarToolContext & {
  details: ProcessDetailByVersionItem[];
  nodeCount: number;
  nodeTemplate: LifeCycleModelGraphNode;
  portsTemplate: LifeCycleModelGraphNode['ports'];
  createId: () => string;
}) =>
  details.map((data, index) => {
    const exchange = (genProcessFromData(data?.json?.processDataSet ?? {})?.exchanges?.exchange ??
      []) as ProcessExchangeData[];
    const refExchange = exchange.find((item) => item?.quantitativeReference === true);
    const refFlow = Array.isArray(refExchange?.referenceToFlowDataSet)
      ? refExchange?.referenceToFlowDataSet[0]
      : refExchange?.referenceToFlowDataSet;
    const direction = refExchange?.exchangeDirection ?? '';
    const isInput = direction.toUpperCase() === 'INPUT';
    const text = getLangText(refFlow?.['common:shortDescription'], lang);
    const textWithAllocation = getPortLabelWithAllocation(
      text ?? '',
      refExchange?.allocations,
      direction,
    );
    const referencePortItem = {
      id: `${isInput ? 'INPUT' : 'OUTPUT'}:${refFlow?.['@refObjectId'] ?? '-'}`,
      args: { x: isInput ? 0 : '100%', y: 65 },
      attrs: {
        text: {
          text: `${genPortLabel(textWithAllocation, lang, nodeTemplate.width ?? 350)}`,
          title: textWithAllocation,
          cursor: 'pointer',
          fill: getPortTextColor(
            refExchange?.quantitativeReference,
            refExchange?.allocations,
            token,
          ),
          'font-weight': getPortTextStyle(refExchange?.quantitativeReference),
        },
      },
      group: direction.toUpperCase() === 'OUTPUT' ? 'groupOutput' : 'groupInput',
      data: {
        textLang: refFlow?.['common:shortDescription'],
        flowId: refFlow?.['@refObjectId'],
        flowVersion: refFlow?.['@version'],
        quantitativeReference: refExchange?.quantitativeReference,
        allocations: refExchange?.allocations,
      },
    } satisfies LifeCycleModelPortItem;

    const processDataSet = data?.json?.processDataSet;
    const name = processDataSet?.processInformation?.dataSetInformation?.name ?? {};
    const isReference = nodeCount === 0 && index === 0;

    return {
      ...nodeTemplate,
      id: createId(),
      data: {
        id: data.id,
        version: data?.version,
        label: name,
        shortDescription: genProcessNameJson(name),
        quantitativeReference: isReference ? '1' : '0',
      },
      tools: buildProcessNodeTools({
        isReference,
        nodeLabel: name,
        nodeWidth: nodeTemplate.width ?? 350,
        refTool,
        nonRefTool,
        inputFlowTool,
        outputFlowTool,
        token,
        lang,
        nodeTemplateWidth: nodeTemplate.width ?? 350,
      }),
      ports: {
        ...portsTemplate,
        items: [referencePortItem],
      },
    } satisfies LifeCycleModelGraphNode;
  });

export const buildUpdatedNodeReferencePayload = ({
  node,
  result,
  refTool,
  nonRefTool,
  inputFlowTool,
  outputFlowTool,
  token,
  lang,
  nodeTemplateWidth,
}: ToolbarToolContext & {
  node: LifeCycleModelGraphNode;
  result: ProcessDetailResponse;
}) => {
  const nodeWidth = getNodeWidth(node, nodeTemplateWidth);
  const processDataSet = result.data?.json?.processDataSet;
  const newLabel = processDataSet?.processInformation?.dataSetInformation?.name ?? {};
  const newShortDescription = genProcessNameJson(newLabel);
  const newVersion = result.data?.version ?? '';
  const exchanges = (genProcessFromData(processDataSet ?? {})?.exchanges?.exchange ??
    []) as ProcessExchangeData[];
  const newItems = (node?.ports?.items ?? []).map((item: LifeCycleModelPortItem) => {
    const newItem = exchanges.find((exchangeItem: ProcessExchangeData) => {
      const ids = item?.id?.split(':') ?? [];
      if (ids.length < 2) {
        return false;
      }
      const flowRef = Array.isArray(exchangeItem?.referenceToFlowDataSet)
        ? exchangeItem?.referenceToFlowDataSet[0]
        : exchangeItem?.referenceToFlowDataSet;
      return (
        `${(exchangeItem?.exchangeDirection ?? '-').toUpperCase()}:${flowRef?.['@refObjectId'] ?? '-'}` ===
        `${ids[0].toUpperCase()}:${ids[ids.length - 1]}`
      );
    });

    if (newItem) {
      const newRefFlow = Array.isArray(newItem?.referenceToFlowDataSet)
        ? newItem?.referenceToFlowDataSet[0]
        : newItem?.referenceToFlowDataSet;
      const newTitle = getLangText(newRefFlow?.['common:shortDescription'], lang) ?? '';
      const newTitleWithAllocation = getPortLabelWithAllocation(
        newTitle,
        newItem?.allocations,
        newItem?.exchangeDirection ?? '',
      );

      return {
        ...item,
        attrs: {
          ...item?.attrs,
          text: {
            text: `${genPortLabel(newTitleWithAllocation, lang, nodeWidth)}`,
            title: newTitleWithAllocation,
            cursor: 'pointer',
            fill: getPortTextColor(newItem?.quantitativeReference, newItem?.allocations, token),
            'font-weight': getPortTextStyle(newItem?.quantitativeReference),
          },
        },
        data: {
          ...item?.data,
          textLang: newRefFlow?.['common:shortDescription'],
          flowId: newRefFlow?.['@refObjectId'],
          flowVersion: newRefFlow?.['@version'],
          quantitativeReference: newItem?.quantitativeReference,
          allocations: newItem?.allocations,
        },
      };
    }

    return {
      ...item,
      attrs: {
        ...item?.attrs,
        text: {
          text: '-',
          title: '-',
          fill: token.colorTextDescription,
        },
      },
      data: {
        ...item?.data,
        textLang: {},
      },
    };
  });

  return {
    data: {
      ...node.data,
      label: newLabel,
      shortDescription: newShortDescription,
      version: newVersion,
    },
    tools: buildEditorNodeTools({
      isReference: node?.data?.quantitativeReference === '1',
      nodeLabel: newLabel,
      nodeWidth,
      refTool,
      nonRefTool,
      inputFlowTool,
      outputFlowTool,
      token,
      lang,
      nodeTemplateWidth,
    }),
    ports: {
      ...node?.ports,
      items: newItems,
    },
  };
};

export const buildSavePayload = (
  infoData: LifeCycleModelEditorFormState,
  currentNodes: LifeCycleModelGraphNode[],
  currentEdges: LifeCycleModelGraphEdge[],
) => {
  const edges = currentEdges.map((edge) => {
    if (edge.target) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { x, y, ...targetRest } = edge.target as { [key: string]: unknown };
      return { ...edge, target: targetRest };
    }
    return edge;
  });

  const nodes = currentNodes.map((node, index) => ({
    ...node,
    data: { ...node.data, index: index.toString() },
  }));

  return {
    ...(infoData ?? {}),
    model: {
      nodes,
      edges,
    },
  };
};

export const hydrateEditorNodes = ({
  nodes,
  refTool,
  nonRefTool,
  inputFlowTool,
  outputFlowTool,
  token,
  lang,
  nodeTemplateWidth,
  nodeAttrs,
  portsGroups,
}: ToolbarNodeHydrationContext & {
  nodes: LifeCycleModelGraphNode[];
}) =>
  nodes.map((node) => {
    const nodeWidth = getNodeWidth(node, nodeTemplateWidth);

    return {
      ...node,
      attrs: nodeAttrs,
      ports: {
        ...node.ports,
        groups: portsGroups,
        items: (node.ports?.items ?? []).map((item) =>
          buildDisplayPortItem(item, nodeWidth, lang, token),
        ),
      },
      tools: buildEditorNodeTools({
        isReference: node?.data?.quantitativeReference === '1',
        nodeLabel: node?.data?.label,
        nodeWidth,
        refTool,
        nonRefTool,
        inputFlowTool,
        outputFlowTool,
        token,
        lang,
        nodeTemplateWidth,
      }),
    };
  });

export const hydrateEditorEdges = (
  edges: LifeCycleModelGraphEdge[],
  token: LifeCycleModelThemeToken,
  edgeLabelText?: EdgeLabelText,
) =>
  edges.map((edge) => {
    if (edge.target) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { x, y, ...targetRest } = edge.target as { [key: string]: unknown };
      const label = getEdgeLabel(
        token,
        edge?.data?.connection?.unbalancedAmount as number,
        edge?.data?.connection?.exchangeAmount as number,
        edgeLabelText,
      );

      return {
        ...edge,
        labels: [label],
        attrs: {
          line: {
            stroke: token.colorPrimary,
          },
        },
        target: targetRest,
      };
    }

    return edge;
  });

export const buildEmptyCreateInfoData = ({
  currentDateTime,
  initVersion,
  defaultPermanentDataSetURI,
  id,
  version,
}: {
  currentDateTime: string;
  initVersion: string;
  defaultPermanentDataSetURI: string;
  id: string;
  version: string;
}) => ({
  modellingAndValidation: {
    complianceDeclarations: {},
  },
  administrativeInformation: {
    dataEntryBy: {
      'common:timeStamp': currentDateTime,
    },
    publicationAndOwnership: {
      'common:dataSetVersion': initVersion,
      'common:permanentDataSetURI': defaultPermanentDataSetURI,
    },
  },
  id,
  version,
});
