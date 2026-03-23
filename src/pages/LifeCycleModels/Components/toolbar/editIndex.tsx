import { GraphEdge, GraphNode, useGraphEvent, useGraphStore } from '@/contexts/graphContext';
import ProcessEdit from '@/pages/Processes/Components/edit';
import ProcessView from '@/pages/Processes/Components/view';
import type { refDataType } from '@/pages/Utils/review';
import { checkReferences, getAllRefObj, getRefTableName, ReffPath } from '@/pages/Utils/review';
import { getRefData } from '@/services/general/api';
import { initVersion } from '@/services/general/data';
import { formatDateTime, getImportedId, getLangText } from '@/services/general/util';
import {
  createLifeCycleModel,
  getLifeCycleModelDetail,
  updateLifeCycleModel,
} from '@/services/lifeCycleModels/api';
import type {
  LifeCycleModelDetailResponse,
  LifeCycleModelEditorFormState,
  LifeCycleModelGraphEdge,
  LifeCycleModelGraphNode,
  LifeCycleModelImportData,
  LifeCycleModelJsonTg,
  LifeCycleModelMutationResult,
  LifeCycleModelPortItem,
  LifeCycleModelProcessInstance,
  LifeCycleModelSelectedPortPayload,
  LifeCycleModelTargetAmount,
} from '@/services/lifeCycleModels/data';
import {
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
  genNodeLabel,
  genPortLabel,
} from '@/services/lifeCycleModels/util';
import {
  getProcessDetail,
  getProcessDetailByIdAndVersion,
  getProcessesByIdAndVersion,
} from '@/services/processes/api';
import type {
  ProcessDetailByVersionResponse,
  ProcessDetailResponse,
} from '@/services/processes/data';
import { genProcessName } from '@/services/processes/util';
import { getUserTeamId } from '@/services/roles/api';
import { getUserId } from '@/services/users/api';
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { Edge as X6Edge, Node as X6Node } from '@antv/x6';
import { Button, message, Space, Spin, theme, Tooltip } from 'antd';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import ConnectableProcesses from '../connectableProcesses';
import LifeCycleModelEdit from '../edit';
import ModelResult from '../modelResult';
import LifeCycleModelView from '../view';
import ModelToolbarAdd from './add';
import { Control } from './control';
import TargetAmount from './editTargetAmount';
import ToolbarEditInfo, { type ToolbarEditInfoHandle } from './eidtInfo';
import EdgeExhange from './Exchange/index';
import IoPortSelect from './Exchange/ioPortSelect';
import { getEdgeLabel } from './utils/edge';
import {
  buildEditorNodeTools,
  buildEmptyCreateInfoData,
  buildPortSelectionUpdate,
  buildProcessNodesFromDetails,
  buildSavePayload,
  buildUpdatedNodeReferencePayload,
  hydrateEditorEdges,
  hydrateEditorNodes,
  normalizePastedReferenceCells,
  resolveDeleteSelection,
} from './utils/editGraph';
import {
  getPortLabelWithAllocation,
  getPortTextColor,
  getPortTextStyle,
  nodeTitleTool,
} from './utils/node';

type Props = {
  id: string;
  version: string;
  lang: string;
  drawerVisible: boolean;
  autoCheckRequired?: boolean;
  isSave: boolean;
  action: string;
  setIsSave: (isSave: boolean) => void;
  actionType?: 'create' | 'copy' | 'createVersion';
  importData?: LifeCycleModelImportData | null;
  onClose?: () => void;
  hideReviewButton?: boolean;
  updateNodeCb?: (ref: refDataType) => Promise<void>;
  newVersion?: string;
  onSubmitReviewSuccess?: () => void;
};

const VISUAL_ONLY_MUTATION_OPTIONS = { ignoreHistory: true };

const ToolbarEdit: FC<Props> = ({
  id,
  version,
  lang,
  drawerVisible,
  autoCheckRequired = false,
  isSave,
  action,
  setIsSave,
  actionType,
  importData,
  onClose = () => {},
  hideReviewButton = false,
  updateNodeCb = async () => {},
  newVersion,
  onSubmitReviewSuccess = () => {},
}) => {
  const [thisId, setThisId] = useState(id);
  const [thisVersion, setThisVersion] = useState(version);
  const [thisAction, setThisAction] = useState(action);
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<LifeCycleModelEditorFormState>({});
  const [jsonTg, setJsonTg] = useState<LifeCycleModelJsonTg>({});
  const [problemNodes, setProblemNodes] = useState<refDataType[]>([]);

  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);
  const [ioPortSelectorDirection, setIoPortSelectorDirection] = useState('');
  const [ioPortSelectorNode, setIoPortSelectorNode] = useState<LifeCycleModelGraphNode>();
  const [ioPortSelectorDrawerVisible, setIoPortSelectorDrawerVisible] = useState(false);
  const [connectableProcessesDrawerVisible, setConnectableProcessesDrawerVisible] = useState(false);
  const [connectableProcessesPortId, setConnectableProcessesPortId] = useState('');
  const [connectableProcessesFlowVersion, setConnectableProcessesFlowVersion] = useState('');
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);

  const modelData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);
  const updateNode = useGraphStore((state) => state.updateNode);
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const syncGraphData = useGraphStore((state) => state.syncGraphData);
  const graph = useGraphStore((state) => state.graph);
  const intl = useIntl();
  const edgeLabelText = {
    balanced: intl.formatMessage({
      id: 'pages.button.model.edgeStatus.balanced',
      defaultMessage: 'Bal',
    }),
    deficit: intl.formatMessage({
      id: 'pages.button.model.edgeStatus.deficit',
      defaultMessage: 'Def',
    }),
    surplus: intl.formatMessage({
      id: 'pages.button.model.edgeStatus.surplus',
      defaultMessage: 'Sur',
    }),
    input: intl.formatMessage({
      id: 'pages.button.input',
      defaultMessage: 'Input',
    }),
    output: intl.formatMessage({
      id: 'pages.button.output',
      defaultMessage: 'Output',
    }),
  };
  const [userId, setUserId] = useState<string>('');
  const [processInstances, setProcessInstances] = useState<LifeCycleModelProcessInstance[]>([]);
  const importedId = getImportedId(importData?.[0]);

  const editInfoRef = useRef<ToolbarEditInfoHandle>(null);
  useEffect(() => {
    setThisAction(action);
  }, [action]);

  const nodes: GraphNode[] = useGraphStore((state) => state.nodes);
  const edges: GraphEdge[] = useGraphStore((state) => state.edges);

  const selectNodeFromTool = (node: LifeCycleModelGraphNode | undefined) => {
    const nodeId = node?.id ?? '';
    if (!nodeId) {
      return;
    }
    edges.forEach((edge) => {
      if (edge.selected) {
        updateEdge(edge.id ?? '', { selected: false });
      }
    });
    nodes.forEach((currentNode) => {
      if (currentNode.id !== nodeId && currentNode.selected) {
        updateNode(currentNode.id ?? '', { selected: false });
      }
    });
    updateNode(nodeId, { selected: true });
  };

  const [nodeCount, setNodeCount] = useState(0);

  const { token } = theme.useToken();

  const inputFlowTool = {
    id: 'inputFlow',
    name: 'button',
    args: {
      markup: [
        {
          tagName: 'rect',
          selector: 'button',
          attrs: {
            width: 50,
            height: 20,
            rx: 4,
            ry: 4,
            fill: token.colorBgContainer,
            stroke: token.colorBorder,
            'stroke-width': 1,
            cursor: 'pointer',
          },
        },
        {
          tagName: 'text',
          textContent: intl.formatMessage({
            id: 'pages.button.input',
            defaultMessage: 'Input',
          }),
          selector: 'text',
          attrs: {
            fill: token.colorTextBase,
            'font-size': 12,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            'pointer-events': 'none',
            x: 25,
            y: 10,
          },
        },
      ],
      offset: { x: 10, y: 30 },
      async onClick(view: { cell: { store: { data: LifeCycleModelGraphNode } } }) {
        selectNodeFromTool(view.cell.store.data);
        await setIoPortSelectorDirection('Input');
        await setIoPortSelectorNode(view.cell.store.data);
        await setIoPortSelectorDrawerVisible(true);
      },
    },
  };

  const outputFlowTool = {
    id: 'outputFlow',
    name: 'button',
    args: {
      markup: [
        {
          tagName: 'rect',
          selector: 'button',
          attrs: {
            width: 50,
            height: 20,
            rx: 4,
            ry: 4,
            fill: token.colorBgContainer,
            stroke: token.colorBorder,
            'stroke-width': 1,
            cursor: 'pointer',
          },
        },
        {
          tagName: 'text',
          textContent: intl.formatMessage({
            id: 'pages.button.output',
            defaultMessage: 'Output',
          }),
          selector: 'text',
          attrs: {
            fill: token.colorTextBase,
            'font-size': 12,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            'pointer-events': 'none',
            x: 25,
            y: 10,
          },
        },
      ],
      x: '100%',
      y: 0,
      offset: { x: -60, y: 30 },
      async onClick(view: { cell: { store: { data: LifeCycleModelGraphNode } } }) {
        selectNodeFromTool(view.cell.store.data);
        await setIoPortSelectorDirection('Output');
        await setIoPortSelectorNode(view.cell.store.data);
        await setIoPortSelectorDrawerVisible(true);
      },
    },
  };

  const refTool = {
    id: 'ref',
    name: 'button',
    args: {
      markup: [
        {
          tagName: 'circle',
          selector: 'button',
          attrs: {
            r: 10,
            'stroke-width': 0,
            fill: token.colorBgBase,
            cursor: 'pointer',
          },
        },
        {
          tagName: 'text',
          textContent: '★', //https://symbl.cc/
          selector: 'icon',
          attrs: {
            fill: token.colorPrimary,
            'font-size': 22,
            'text-anchor': 'middle',
            'pointer-events': 'none',
            y: '0.3em',
          },
        },
        {
          tagName: 'title',
          textContent: intl.formatMessage({
            id: 'pages.button.model.referenceNode',
            defaultMessage: 'Reference node',
          }),
        },
      ],
      offset: { x: 10, y: -12 },
      onClick(view: { cell: { store: { data: LifeCycleModelGraphNode } } }) {
        selectNodeFromTool(view.cell.store.data);
        setTargetAmountDrawerVisible(true);
      },
    },
  };

  const nonRefTool = {
    id: 'nonRef',
    name: 'button',
    args: {
      markup: [
        {
          tagName: 'circle',
          selector: 'button',
          attrs: {
            r: 10,
            'stroke-width': 0,
            fill: token.colorBgBase,
            cursor: 'pointer',
          },
        },
        {
          tagName: 'text',
          textContent: '☆', //https://symbl.cc/
          selector: 'icon',
          attrs: {
            fill: token.colorPrimary,
            'font-size': 22,
            'text-anchor': 'middle',
            'pointer-events': 'none',
            y: '0.3em',
          },
        },
        {
          tagName: 'title',
          textContent: intl.formatMessage({
            id: 'pages.button.model.setReference',
            defaultMessage: 'Set as reference',
          }),
        },
      ],
      offset: { x: 10, y: -12 },
      onClick(view: { cell: { store: { data: LifeCycleModelGraphNode } } }) {
        selectNodeFromTool(view.cell.store.data);
        const thisData = view.cell.store.data;
        nodes.forEach(async (node) => {
          if (node.id === thisData?.id) {
            const updatedNodeData = {
              data: {
                ...node?.data,
                quantitativeReference: '1',
              },
              tools: (
                node.tools as Array<{ id?: string; [key: string]: unknown }> | undefined
              )?.map((tool) => {
                if (tool.id === 'nonRef') {
                  return refTool;
                }
                return tool;
              }),
            };
            await updateNode(node.id ?? '', updatedNodeData);
            setTargetAmountDrawerVisible(true);
          } else {
            const updatedNodeData = {
              data: {
                ...node.data,
                quantitativeReference: '0',
              },
              tools: (
                node.tools as Array<{ id?: string; [key: string]: unknown }> | undefined
              )?.map((tool) => {
                if (tool.id === 'ref' || tool.id === 'nonRef') {
                  return nonRefTool;
                }
                return tool;
              }),
            };
            await updateNode(node.id ?? '', updatedNodeData);
          }
        });
      },
    },
  };

  const nodeAttrs = {
    body: {
      stroke: token.colorPrimary,
      strokeWidth: 1,
      fill: token.colorBgContainer,
      rx: 6,
      ry: 6,
    },
    label: {
      fill: token.colorTextBase,
      refX: 0.5,
      refY: 8,
      textAnchor: 'middle',
      textVerticalAnchor: 'top',
    },
  };

  const ports = {
    groups: {
      groupInput: {
        position: {
          name: 'absolute',
        },
        label: {
          position: {
            name: 'right',
          },
        },
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
          text: {
            fill: token.colorTextDescription,
            fontSize: 14,
          },
        },
      },
      groupOutput: {
        position: {
          name: 'absolute',
        },
        label: {
          position: {
            name: 'left',
          },
        },
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
          text: {
            fill: token.colorTextDescription,
            fontSize: 14,
          },
        },
      },
    },
    items: [],
  };

  const nodeTemplateWidth = 350;
  const nodeTemplate: LifeCycleModelGraphNode = {
    id: '',
    label: '',
    shape: 'rect',
    x: 200,
    y: 100,
    width: nodeTemplateWidth,
    height: 80,
    attrs: nodeAttrs,
    data: {
      label: [],
      quantitativeReference: '0',
      generalComment: [],
    },
  };

  const edgeTemplate = {
    attrs: {
      line: {
        stroke: token.colorPrimary,
      },
    },
    // tools: ['edge-editor'],
  };

  const saveCallback = useCallback(() => {
    setIsSave(true);
  }, [isSave, setIsSave]);

  const resetGraphCommandState = useCallback(() => {
    graph?.cleanSelection?.();
    graph?.cleanClipboard?.();
    graph?.cleanHistory?.();
  }, [graph]);

  const syncGraphSnapshot = useCallback(() => {
    syncGraphData();
    setNodeCount(graph!.getNodes().length);
  }, [graph, syncGraphData]);

  const buildNodeTools = useCallback(
    (nodeLabel: any, nodeWidth: number, isReference: boolean) =>
      buildEditorNodeTools({
        isReference,
        nodeLabel,
        nodeWidth,
        refTool,
        nonRefTool,
        inputFlowTool,
        outputFlowTool,
        token,
        lang,
        nodeTemplateWidth,
      }),
    [inputFlowTool, lang, nonRefTool, outputFlowTool, refTool, token],
  );

  const normalizePastedCells = useCallback(
    (cells: Array<X6Node | X6Edge>) =>
      normalizePastedReferenceCells(cells, buildNodeTools, nodeTemplateWidth),
    [buildNodeTools],
  );

  const copySelection = useCallback(() => {
    const selectedCells = graph!.getSelectedCells();
    if (selectedCells.length === 0) {
      return;
    }

    graph.copy(selectedCells, {
      deep: true,
      useLocalStorage: false,
    });
  }, [graph]);

  const pasteSelection = useCallback(
    (offset: { dx: number; dy: number } = { dx: 32, dy: 32 }) => {
      if (!graph || graph.isClipboardEmpty({ useLocalStorage: false })) {
        return;
      }

      graph.batchUpdate('clipboard-paste', () => {
        const pastedCells = graph.paste({
          offset,
          useLocalStorage: false,
        });
        if (pastedCells.length === 0) {
          return;
        }

        normalizePastedCells(pastedCells as Array<X6Node | X6Edge>);
        graph.cleanSelection();
        graph.select(pastedCells);
      });

      syncGraphSnapshot();
    },
    [graph, normalizePastedCells, syncGraphSnapshot],
  );

  const duplicateSelection = useCallback(() => {
    if (!graph) {
      return;
    }

    const selectedCells = graph.getSelectedCells();
    if (selectedCells.length === 0) {
      return;
    }

    graph.copy(selectedCells, {
      deep: true,
      useLocalStorage: false,
    });
    pasteSelection({ dx: 32, dy: 32 });
  }, [graph, pasteSelection]);

  const undoGraph = useCallback(() => {
    if (!graph || !graph.canUndo()) {
      return;
    }

    graph.undo();
    syncGraphSnapshot();
  }, [graph, syncGraphSnapshot]);

  const redoGraph = useCallback(() => {
    if (!graph || !graph.canRedo()) {
      return;
    }

    graph.redo();
    syncGraphSnapshot();
  }, [graph, syncGraphSnapshot]);

  const refreshEdgeLabels = useCallback(() => {
    edges.forEach((edge) => {
      if (edge?.labels?.length > 0) {
        updateEdge(edge.id ?? '', { labels: [] }, VISUAL_ONLY_MUTATION_OPTIONS);
      }
    });
  }, [edges, updateEdge]);

  const updateInfoData = (data: LifeCycleModelEditorFormState) => {
    setInfoData({ ...data, id: thisId, version: thisVersion });
  };

  const updateTargetAmount = (data: LifeCycleModelTargetAmount) => {
    const refNode = nodes.find((node) => node?.data?.quantitativeReference === '1');
    if (refNode) {
      updateNode(refNode.id ?? '', {
        data: {
          ...refNode.data,
          targetAmount: data?.targetAmount,
          originalAmount: data?.originalAmount,
          scalingFactor: data?.scalingFactor,
        },
      });
    }
  };

  const updateNodePorts = (data: LifeCycleModelSelectedPortPayload) => {
    const portUpdate = buildPortSelectionUpdate({
      selectedNode: ioPortSelectorNode,
      direction: ioPortSelectorDirection,
      payload: data,
      lang,
      token,
      portsTemplate: ports,
    });
    if (!portUpdate) {
      return;
    }

    const nodeId = ioPortSelectorNode?.id;
    if (!nodeId) {
      return;
    }

    const applyPortUpdate = () => {
      updateNode(nodeId, {
        ports: portUpdate.ports,
        width: portUpdate.width,
        height: portUpdate.height,
      });
    };

    if (graph && typeof graph.batchUpdate === 'function') {
      graph.batchUpdate('update-node-ports', applyPortUpdate);
      return;
    }

    applyPortUpdate();
  };

  // const updateEdgeData = (data: unknown) => {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const { id, shape, ...newEdge } = data;
  //   if (newEdge.target) {
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     const { x, y, ...newTarget } = newEdge.target as Record<string, unknown>;
  //     updateEdge(id, { ...newEdge, target: newTarget });
  //   } else {
  //     updateEdge(id, { ...newEdge });
  //   }
  // };

  type TAddProcessNodesParams = { id: string; version: string };

  const addProcessNodes = (processes: TAddProcessNodesParams[]) => {
    setSpinning(true);
    getProcessDetailByIdAndVersion(processes).then((result: ProcessDetailByVersionResponse) => {
      if (result && result.data) {
        const newNodes = buildProcessNodesFromDetails({
          details: result.data,
          nodeCount,
          nodeTemplate,
          portsTemplate: ports,
          createId: v4,
          refTool,
          nonRefTool,
          inputFlowTool,
          outputFlowTool,
          token,
          lang,
          nodeTemplateWidth,
        });
        if (newNodes.length > 0) {
          addNodes(newNodes);
          setNodeCount((prev) => prev + newNodes.length);
        }
      }

      setSpinning(false);
    });
  };

  const updateReference = async (setLoadingData: boolean) => {
    if (setLoadingData) setSpinning(true);
    await Promise.all(
      nodes.map(async (node) => {
        const result: ProcessDetailResponse = await getProcessDetail(
          node?.data?.id ?? '',
          node?.data?.version ?? '',
        );
        updateNode(
          node.id ?? '',
          buildUpdatedNodeReferencePayload({
            node,
            result,
            refTool,
            nonRefTool,
            inputFlowTool,
            outputFlowTool,
            token,
            lang,
            nodeTemplateWidth,
          }),
        );
      }),
    );
    if (setLoadingData) setSpinning(false);
  };

  const deleteCell = useCallback(() => {
    const { selectedNodeIds, selectedEdgeIds } = resolveDeleteSelection(nodes, edges);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return;
    }

    const applyDelete = () => {
      if (selectedEdgeIds.length > 0) {
        removeEdges(selectedEdgeIds);
      }

      if (selectedNodeIds.length > 0) {
        removeNodes(selectedNodeIds);
      }
    };

    if (graph) {
      graph.batchUpdate('delete-selection', applyDelete);
      setNodeCount(graph.getNodes().length);
    } else if (selectedNodeIds.length > 0) {
      setNodeCount((prev) => Math.max(prev - selectedNodeIds.length, 0));
      applyDelete();
    } else {
      applyDelete();
    }

    refreshEdgeLabels();
  }, [edges, graph, nodes, refreshEdgeLabels, removeEdges, removeNodes]);

  const saveData = async (setLoadingData: boolean, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (setLoadingData) setSpinning(true);
    try {
      await editInfoRef.current?.updateReferenceDescription(infoData);
      await updateReference(false);

      // 直接从图中获取最新的节点和边数据
      const currentNodes: LifeCycleModelGraphNode[] = graph
        ? graph
            .getNodes()
            .map((node: X6Node | LifeCycleModelGraphNode) =>
              typeof (node as X6Node).toJSON === 'function'
                ? ((node as X6Node).toJSON() as LifeCycleModelGraphNode)
                : (node as LifeCycleModelGraphNode),
            )
        : (nodes as LifeCycleModelGraphNode[]);
      const currentEdges: LifeCycleModelGraphEdge[] = graph
        ? graph
            .getEdges()
            .map((edge: X6Edge | LifeCycleModelGraphEdge) =>
              typeof (edge as X6Edge).toJSON === 'function'
                ? ((edge as X6Edge).toJSON() as LifeCycleModelGraphEdge)
                : (edge as LifeCycleModelGraphEdge),
            )
        : (edges as LifeCycleModelGraphEdge[]);

      const newData = buildSavePayload(infoData, currentNodes, currentEdges);
      const showMutationError = (result: Extract<LifeCycleModelMutationResult, { ok: false }>) => {
        if (result.code === 'VERSION_CONFLICT') {
          message.error(
            intl.formatMessage({
              id: 'pages.button.create.error.duplicateId',
              defaultMessage: 'Data with the same ID already exists.',
            }),
          );
          return;
        }

        if (result.code === 'OPEN_DATA') {
          message.error(
            intl.formatMessage({
              id: 'pages.review.openData',
              defaultMessage: 'This data is open data, save failed',
            }),
          );
          return;
        }

        if (result.code === 'UNDER_REVIEW') {
          message.error(
            intl.formatMessage({
              id: 'pages.review.underReview',
              defaultMessage: 'Data is under review, save failed',
            }),
          );
          return;
        }

        message.error(result.message ?? 'Error');
      };

      if (thisAction === 'edit') {
        const result = await updateLifeCycleModel({ ...newData, id: thisId, version: thisVersion });
        if (result.ok) {
          const savedLifeCycleModel = result.lifecycleModel;
          setInfoData({ ...newData, id: thisId, version: thisVersion });
          if (!silent) {
            message.success(
              intl.formatMessage({
                id: 'pages.flows.savesuccess',
                defaultMessage: 'Save successfully',
              }),
            );
          }
          setThisId(savedLifeCycleModel?.id ?? result.modelId);
          setThisVersion(savedLifeCycleModel?.version ?? result.version);
          setJsonTg(savedLifeCycleModel?.json_tg ?? {});

          const savedEdges = (savedLifeCycleModel?.json_tg?.xflow?.edges ??
            []) as LifeCycleModelGraphEdge[];
          savedEdges.forEach((edge: LifeCycleModelGraphEdge) => {
            const label = getEdgeLabel(
              token,
              edge?.data?.connection?.unbalancedAmount as number,
              edge?.data?.connection?.exchangeAmount as number,
              edgeLabelText,
            );
            updateEdge(edge.id, { labels: [label] }, VISUAL_ONLY_MUTATION_OPTIONS);
          });

          saveCallback();
        } else {
          if (!silent) {
            showMutationError(result);
          }
        }
      } else if (thisAction === 'create') {
        const newId = actionType === 'createVersion' ? thisId : (importedId ?? v4());
        const result = await createLifeCycleModel({ ...newData, id: newId });
        if (result.ok) {
          const savedLifeCycleModel = result.lifecycleModel;
          if (!silent) {
            message.success(
              intl.formatMessage({
                id: 'pages.button.create.success',
                defaultMessage: 'Created successfully!',
              }),
            );
          }
          setThisAction('edit');
          setThisId(savedLifeCycleModel?.id ?? result.modelId);
          setThisVersion(savedLifeCycleModel?.version ?? result.version);
          setJsonTg(savedLifeCycleModel?.json_tg ?? {});

          const savedEdges = (savedLifeCycleModel?.json_tg?.xflow?.edges ??
            []) as LifeCycleModelGraphEdge[];
          savedEdges.forEach((edge: LifeCycleModelGraphEdge) => {
            const label = getEdgeLabel(
              token,
              edge?.data?.connection?.unbalancedAmount as number,
              edge?.data?.connection?.exchangeAmount as number,
              edgeLabelText,
            );
            updateEdge(edge.id, { labels: [label] }, VISUAL_ONLY_MUTATION_OPTIONS);
          });

          saveCallback();
        } else {
          if (!silent) {
            showMutationError(result);
          }
        }
      }
      return true;
    } finally {
      if (setLoadingData) setSpinning(false);
    }
  };

  useGraphEvent('edge:added', (evt) => {
    const edge = evt.edge;
    updateEdge(edge.id, edgeTemplate, VISUAL_ONLY_MUTATION_OPTIONS);
    edges.forEach((e) => {
      if (e?.labels?.length > 0) {
        updateEdge(e.id ?? '', { labels: [] }, VISUAL_ONLY_MUTATION_OPTIONS);
      }
    });
  });

  useGraphEvent('edge:connected', (evt) => {
    const edge = evt.edge;
    const sourcePortID = edge.getSourcePortId();
    const targetPortID = edge.getTargetPortId();
    const sourceFlowIDs = sourcePortID?.split(':');
    const targetFlowIDs = targetPortID?.split(':');
    if (
      sourcePortID?.toUpperCase()?.includes('OUTPUT') &&
      targetPortID?.toUpperCase()?.includes('INPUT') &&
      sourceFlowIDs?.[sourceFlowIDs?.length - 1] === targetFlowIDs?.[targetFlowIDs?.length - 1]
    ) {
      const sourceNodeID = edge.getSourceCellId();
      const targetNodeID = edge.getTargetCellId();
      const sourceNode = nodes.find((node) => node.id === sourceNodeID);
      const targetNode = nodes.find((node) => node.id === targetNodeID);
      const sourceProcessId = sourceNode?.data?.id;
      const sourceProcessVersion = sourceNode?.data?.version;
      const targetProcessId = targetNode?.data?.id;
      const targetProcessVersion = targetNode?.data?.version;
      const sourcePortIDs = sourcePortID.split(':');
      const targetPortIDs = targetPortID.split(':');

      updateEdge(edge.id, {
        data: {
          connection: {
            outputExchange: {
              '@flowUUID': sourcePortIDs?.[sourcePortIDs?.length - 1],
              downstreamProcess: {
                '@flowUUID': targetPortIDs?.[targetPortIDs?.length - 1],
              },
            },
          },
          node: {
            sourceNodeID: sourceNodeID,
            targetNodeID: targetNodeID,
            sourceProcessId: sourceProcessId,
            sourceProcessVersion: sourceProcessVersion,
            targetProcessId: targetProcessId,
            targetProcessVersion: targetProcessVersion,
          },
        },
      });
    } else {
      removeEdges([edge.id]);
    }
  });

  useGraphEvent('edge:click', (evt) => {
    nodes.forEach((n) => {
      if (n.selected) {
        updateNode(n.id ?? '', { selected: false });
      }
    });

    const currentEdge = edges.find((e) => e.selected === true);
    if (currentEdge) {
      if (currentEdge.id === evt.edge.id) return;

      updateEdge(currentEdge.id, {
        selected: false,
      });
    }

    updateEdge(evt.edge.id, {
      selected: true,
    });
  });

  useGraphEvent('node:change:size', (evt) => {
    const node = evt.node;
    const nodeWidth = node.getSize().width;
    const label = genProcessName(node?.data?.label, lang);
    const newItems = node?.getPorts()?.map((item: LifeCycleModelPortItem) => {
      const itemText = getLangText(item?.data?.textLang, lang);
      const itemTextWithAllocation = getPortLabelWithAllocation(
        itemText ?? '',
        item?.data?.allocations,
        item?.group === 'groupOutput' ? 'OUTPUT' : 'INPUT',
      );
      return {
        ...item,
        attrs: {
          text: {
            ...item?.attrs?.text,
            text: `${genPortLabel(itemTextWithAllocation, lang, nodeWidth)}`,
            cursor: 'pointer',
            fill: getPortTextColor(
              item?.data?.quantitativeReference,
              item?.data?.allocations,
              token,
            ),
            'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
          },
        },
      };
    });

    node.setAttrByPath(
      'label/text',
      genNodeLabel(label ?? '', lang, nodeWidth),
      VISUAL_ONLY_MUTATION_OPTIONS,
    );
    node.prop('ports/items', newItems, VISUAL_ONLY_MUTATION_OPTIONS);

    setTimeout(() => {
      node.addTools(
        [
          node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
          nodeTitleTool(nodeWidth, label ?? '', token, lang),
          inputFlowTool,
          outputFlowTool,
        ],
        { ...VISUAL_ONLY_MUTATION_OPTIONS, reset: true },
      );
    }, 0);
  });

  useGraphEvent('node:click', (evt) => {
    const node = evt.node;
    const event = evt.e;

    if (node.isNode()) {
      const currentNode = nodes.find((n) => n.id === node.id);
      const isClickingPort = event && event.target;

      let clickedPortId: string | null = null;
      if (isClickingPort) {
        const target = event.target as HTMLElement;
        const textContent = target.textContent;

        if (textContent) {
          const targetElement = event.target as HTMLElement;
          const parentElement = targetElement.parentElement;
          const grandParentElement = parentElement?.parentElement;

          if (grandParentElement) {
            const firstChild = grandParentElement.firstElementChild;

            if (firstChild && firstChild.tagName === 'circle') {
              const portAttr = firstChild.getAttribute('port');

              if (portAttr) {
                clickedPortId = portAttr;
              }
            }
          }

          let matchedPort = null;
          if (clickedPortId) {
            const ports: { id: string; data?: { flowVersion?: string } }[] = node.getPorts();
            matchedPort = ports.find((port) => port.id === clickedPortId);

            if (matchedPort) {
              setConnectableProcessesDrawerVisible(true);
              setConnectableProcessesPortId(clickedPortId);
              setConnectableProcessesFlowVersion(matchedPort?.data?.flowVersion ?? '');
              return;
            }
          }
        }
      }

      edges.forEach((e) => {
        if (e.selected) {
          updateEdge(e.id ?? '', { selected: false });
        }
      });

      const isCtrlOrMetaPressed = event && (event.ctrlKey || event.metaKey);

      if (isCtrlOrMetaPressed) {
        updateNode(node.id, {
          selected: !currentNode?.selected,
        });
      } else {
        nodes.forEach((n) => {
          if (n.id !== node.id && n.selected) {
            updateNode(n.id ?? '', { selected: false });
          }
        });
        updateNode(node.id, {
          selected: true,
        });
      }
    }
  });

  useGraphEvent('blank:click', () => {
    nodes.forEach((n) => {
      if (n.selected) {
        updateNode(n.id ?? '', { selected: false });
      }
    });

    edges.forEach((e) => {
      if (e.selected) {
        updateEdge(e.id ?? '', { selected: false });
      }
    });
  });

  useEffect(() => {
    if (!graph || typeof graph.bindKey !== 'function' || typeof graph.unbindKey !== 'function') {
      return;
    }

    const shortcuts: Array<{ keys: string[]; handler: () => void }> = [
      { keys: ['meta+z', 'ctrl+z'], handler: undoGraph },
      { keys: ['meta+shift+z', 'ctrl+shift+z', 'ctrl+y'], handler: redoGraph },
      { keys: ['backspace', 'delete'], handler: deleteCell },
      { keys: ['meta+c', 'ctrl+c'], handler: copySelection },
      { keys: ['meta+v', 'ctrl+v'], handler: pasteSelection },
      { keys: ['meta+d', 'ctrl+d'], handler: duplicateSelection },
    ];

    shortcuts.forEach(({ keys, handler }) => {
      graph.bindKey(keys, (event: any) => {
        event?.preventDefault?.();
        handler();
        return false;
      });
    });

    return () => {
      shortcuts.forEach(({ keys }) => {
        graph.unbindKey(keys);
      });
    };
  }, [copySelection, deleteCell, duplicateSelection, graph, pasteSelection, redoGraph, undoGraph]);

  const getProcessInstances = async (jsonTg: LifeCycleModelJsonTg) => {
    const userId = await getUserId();
    setUserId(userId);
    const params: { id: string; version: string }[] = [];
    jsonTg?.xflow?.nodes?.forEach((node) => {
      const nodeId = node?.data?.id;
      const nodeVersion = node?.data?.version;
      if (nodeId && nodeVersion) {
        params.push({
          id: nodeId,
          version: nodeVersion,
        });
      }
    });
    if (params.length > 0) {
      const procresses = await getProcessesByIdAndVersion(params);
      setProcessInstances((procresses.data ?? []) as LifeCycleModelProcessInstance[]);
    }
  };

  useEffect(() => {
    if (!drawerVisible) {
      onClose();
      setInfoData({});
      setAutoCheckTriggered(false);
      setNodeCount(0);
      setProblemNodes([]);
      setJsonTg({});
      modelData({ nodes: [], edges: [] });
      resetGraphCommandState();
      return;
    }

    if (importData && importData.length > 0) {
      const formData = genLifeCycleModelInfoFromData(importData[0].lifeCycleModelDataSet);
      setInfoData(formData);
      const model = genLifeCycleModelData(importData[0]?.json_tg ?? {}, lang);
      const initNodes = hydrateEditorNodes({
        nodes: model?.nodes ?? [],
        refTool,
        nonRefTool,
        inputFlowTool,
        outputFlowTool,
        token,
        lang,
        nodeTemplateWidth,
        nodeAttrs,
        portsGroups: ports.groups,
      });
      const initEdges = hydrateEditorEdges(model?.edges ?? [], token, edgeLabelText);

      modelData({
        nodes: initNodes,
        edges: initEdges,
      });

      setNodeCount(initNodes.length);
      resetGraphCommandState();
      return;
    }

    if (id !== '') {
      setIsSave(false);
      setSpinning(true);
      getLifeCycleModelDetail(id, version).then(async (result: LifeCycleModelDetailResponse) => {
        if (!result.success) {
          message.error(
            intl.formatMessage({
              id: 'pages.lifecyclemodel.notPublic',
              defaultMessage: 'Model is not public',
            }),
          );
          return;
        }
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setJsonTg(result.data?.json_tg ?? {});

        if (actionType === 'createVersion' && newVersion) {
          fromData.administrativeInformation.publicationAndOwnership['common:dataSetVersion'] =
            newVersion;
        }
        setInfoData({ ...fromData, id: thisId, version: thisVersion });
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        const initNodes = hydrateEditorNodes({
          nodes: model?.nodes ?? [],
          refTool,
          nonRefTool,
          inputFlowTool,
          outputFlowTool,
          token,
          lang,
          nodeTemplateWidth,
          nodeAttrs,
          portsGroups: ports.groups,
        });
        const initEdges = hydrateEditorEdges(model?.edges ?? [], token, edgeLabelText);
        await modelData({
          nodes: initNodes,
          edges: initEdges,
        });

        setNodeCount(initNodes.length);
        resetGraphCommandState();
        getProcessInstances(result.data?.json_tg ?? {})
          .then(() => {})
          .finally(() => {
            setSpinning(false);
          });
      });
    } else {
      const currentDateTime = formatDateTime(new Date());
      setInfoData(
        buildEmptyCreateInfoData({
          currentDateTime,
          initVersion,
          defaultPermanentDataSetURI: intl.formatMessage({
            id: 'pages.lifeCycleModel.administrativeInformation.permanentDataSetURI.default',
            defaultMessage: 'Automatically generated',
          }),
          id: thisId,
          version: thisVersion,
        }),
      );
      modelData({
        nodes: [],
        edges: [],
      });
      setNodeCount(0);
      resetGraphCommandState();
    }
  }, [drawerVisible]);

  useEffect(() => {
    nodes.forEach((node) => {
      updateNode(
        node.id ?? '',
        {
          tools: [
            node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
            nodeTitleTool(
              node?.size?.width ?? node?.width ?? nodeTemplateWidth,
              genProcessName(node?.data?.label, lang) ?? '',
              token,
              lang,
            ),
            inputFlowTool,
            outputFlowTool,
          ],
        },
        VISUAL_ONLY_MUTATION_OPTIONS,
      );
    });
  }, [nodeCount]);

  useEffect(() => {
    nodes.forEach((node) => {
      const isErrNode = problemNodes.find(
        (item: refDataType) =>
          item['@refObjectId'] === node.data.id && item['@version'] === node.data.version,
      );
      if (isErrNode) {
        updateNode(
          node.id ?? '',
          {
            attrs: {
              ...nodeAttrs,
              body: {
                ...nodeAttrs.body,
                stroke: token.colorError,
              },
            },
          },
          VISUAL_ONLY_MUTATION_OPTIONS,
        );
      } else {
        updateNode(
          node.id ?? '',
          {
            attrs: {
              ...nodeAttrs,
              body: {
                ...nodeAttrs.body,
                stroke: token.colorPrimary,
              },
            },
          },
          VISUAL_ONLY_MUTATION_OPTIONS,
        );
      }
    });
  }, [problemNodes]);

  const handleUpdateNode = async (ref: refDataType) => {
    setSpinning(true);
    const selectedNode = nodes.find((node) => node.selected);
    if (selectedNode) {
      const { data: procressDetail } = await getRefData(
        ref['@refObjectId'],
        ref['@version'],
        getRefTableName(ref['@type']),
      );
      const refObjs = getAllRefObj(procressDetail);
      const userTeamId = await getUserTeamId();

      const path = await checkReferences(
        refObjs,
        new Map<string, unknown>(),
        userTeamId,
        [],
        [],
        [],
        [],
        new ReffPath(
          {
            '@refObjectId': selectedNode.data.id,
            '@version': selectedNode.data.version,
            '@type': 'process data set',
          },
          procressDetail?.ruleVerification,
          false,
        ),
      );
      const problemNodesofSelectedNode = path?.findProblemNodes();
      if (!problemNodesofSelectedNode?.length) {
        setProblemNodes(
          problemNodes.filter(
            (item: refDataType) =>
              item['@refObjectId'] !== selectedNode.data.id ||
              item['@version'] !== selectedNode.data.version,
          ),
        );
      }
    }
    setSpinning(false);
  };

  const handleCheckData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    setSpinning(true);
    await saveData(false, { silent });
    const checkDataResult = await editInfoRef.current?.handleCheckData(
      'checkData',
      nodes as LifeCycleModelGraphNode[],
      edges as LifeCycleModelGraphEdge[],
      { silent },
    );
    setProblemNodes(checkDataResult?.problemNodes ?? []);
    setSpinning(false);
  };

  useEffect(() => {
    if (
      !autoCheckRequired ||
      autoCheckTriggered ||
      !drawerVisible ||
      Object.keys(infoData ?? {}).length === 0
    ) {
      return;
    }
    setAutoCheckTriggered(true);
    void handleCheckData({ silent: true });
  }, [autoCheckRequired, autoCheckTriggered, drawerVisible, handleCheckData, infoData]);

  const handelSubmitReview = async () => {
    setSpinning(true);
    await saveData(false);
    const reviewResult = await editInfoRef.current?.handleCheckData(
      'review',
      nodes as LifeCycleModelGraphNode[],
      edges as LifeCycleModelGraphEdge[],
    );
    const checkResult = reviewResult?.checkResult;
    const unReview = reviewResult?.unReview ?? [];
    setProblemNodes(reviewResult?.problemNodes ?? []);

    if (checkResult) {
      await editInfoRef.current?.submitReview(unReview);
      onSubmitReviewSuccess();
    }
    setSpinning(false);
  };

  const getShowResult = () => {
    const selectedNode = nodes.find((node) => node.selected);
    const processInstance = processInstances.find(
      (pi) => pi.id === selectedNode?.data?.id && pi.version === selectedNode?.data?.version,
    );
    if (processInstance?.userId === userId) {
      if (processInstance?.modelId) {
        return (
          <LifeCycleModelEdit
            id={processInstance.modelId}
            version={selectedNode?.data?.version ?? ''}
            lang={lang}
            buttonType={'toolIcon'}
            disabled={!selectedNode}
            hideReviewButton={true}
            updateNodeCb={handleUpdateNode}
          />
        );
      } else {
        return (
          <ProcessEdit
            id={selectedNode?.data?.id ?? ''}
            version={selectedNode?.data?.version ?? ''}
            buttonType={'toolIcon'}
            lang={lang}
            disabled={!selectedNode}
            actionRef={undefined}
            setViewDrawerVisible={() => {}}
            hideReviewButton={true}
            updateNodeCb={handleUpdateNode}
          />
        );
      }
    } else {
      if (processInstance?.modelId) {
        return (
          <LifeCycleModelView
            id={processInstance.modelId}
            version={selectedNode?.data?.version ?? ''}
            lang={lang}
            actionRef={undefined}
            buttonType={'toolIcon'}
            disabled={!selectedNode}
          />
        );
      } else {
        return (
          <ProcessView
            id={selectedNode?.data?.id ?? ''}
            version={selectedNode?.data?.version ?? ''}
            buttonType={'toolIcon'}
            lang={lang}
            disabled={!selectedNode}
          />
        );
      }
    }
  };

  const selectedEdge = edges.find((edge) => edge.selected);
  const quantitativeReferenceNode = nodes.find((node) => node?.data?.quantitativeReference === '1');
  const hasSelectedCells =
    nodes.some((node) => node.selected) || edges.some((edge) => edge.selected);

  return (
    <Space
      direction='vertical'
      size={'middle'}
      style={{ height: '70vh', overflowY: 'auto', paddingRight: 10, paddingLeft: 10 }}
    >
      <ToolbarEditInfo
        ref={editInfoRef}
        action={thisAction}
        actionType={actionType}
        data={infoData}
        onData={updateInfoData}
        lang={lang}
      />
      {getShowResult()}
      <EdgeExhange
        lang={lang}
        disabled={!selectedEdge}
        edge={selectedEdge as LifeCycleModelGraphEdge}
      />
      <TargetAmount
        refNode={quantitativeReferenceNode as LifeCycleModelGraphNode}
        drawerVisible={targetAmountDrawerVisible}
        lang={lang}
        setDrawerVisible={setTargetAmountDrawerVisible}
        onData={updateTargetAmount}
      />

      <ModelToolbarAdd buttonType={'icon'} lang={lang} onData={addProcessNodes} />
      {/* <Tooltip
            title={
              <FormattedMessage
                id="pages.button.model.design"
                defaultMessage="Design Appearance"
              ></FormattedMessage>
            }
            placement="left"
          >
            <Button
              shape="circle"
              size="small"
              icon={<FormatPainterOutlined />}
              disabled={
                nodes.filter((node) => node.selected).length === 0 &&
                edges.filter((edge) => edge.selected).length === 0
              }
            />
          </Tooltip> */}
      <Tooltip
        title={
          <FormattedMessage id='pages.button.updateReference' defaultMessage='Update Reference' />
        }
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<CopyOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={() => updateReference(true)}
        />
      </Tooltip>
      <Tooltip
        title={<FormattedMessage id='pages.button.model.delete' defaultMessage='Delete element' />}
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<DeleteOutlined />}
          style={{ boxShadow: 'none' }}
          disabled={
            nodes.filter((node) => node.selected).length === 0 &&
            edges.filter((edge) => edge.selected).length === 0
          }
          onClick={deleteCell}
        />
      </Tooltip>
      <br />

      <Tooltip
        title={<FormattedMessage id='pages.button.model.save' defaultMessage='Save data' />}
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<SaveOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={() => {
            saveData(true);
            updateNodeCb({
              '@refObjectId': id,
              '@version': version,
              '@type': 'lifeCycleModel data set',
            });
          }}
        />
      </Tooltip>
      <br />

      {/* <ProcessView
        id={id ?? ''}
        version={version ?? ''}
        lang={lang}
        buttonType={'toolResultIcon'}
        actionRef={undefined}
        disabled={false}
      /> */}
      <ModelResult
        submodels={(jsonTg?.submodels ?? []).map((submodel) => ({
          id: submodel.id,
          version: submodel.version ?? thisVersion,
        }))}
        modelId={thisId}
        modelVersion={thisVersion}
        lang={lang}
        actionType='edit'
      />
      <Tooltip
        title={<FormattedMessage id='pages.button.check' defaultMessage='Data Check' />}
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<CheckCircleOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={() => void handleCheckData()}
        />
      </Tooltip>
      {!hideReviewButton ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.review' defaultMessage='Submit for Review' />}
          placement='left'
        >
          <Button
            type='primary'
            size='small'
            icon={<SendOutlined />}
            style={{ boxShadow: 'none' }}
            onClick={handelSubmitReview}
          />
        </Tooltip>
      ) : null}
      <Control
        items={[
          'undo',
          'redo',
          'paste',
          'duplicate',
          'zoomOut',
          'zoomTo',
          'zoomIn',
          'zoomToFit',
          'zoomToOrigin',
          'autoLayoutLR',
        ]}
        editorActions={{
          undo: undoGraph,
          redo: redoGraph,
          paste: pasteSelection,
          duplicate: duplicateSelection,
        }}
        canDuplicate={hasSelectedCells}
      />
      <Spin spinning={spinning} fullscreen />
      <IoPortSelect
        lang={lang}
        node={ioPortSelectorNode as LifeCycleModelGraphNode}
        direction={ioPortSelectorDirection}
        drawerVisible={ioPortSelectorDrawerVisible}
        onData={updateNodePorts}
        onDrawerVisible={setIoPortSelectorDrawerVisible}
      />
      <ConnectableProcesses
        lang={lang}
        drawerVisible={connectableProcessesDrawerVisible}
        setDrawerVisible={setConnectableProcessesDrawerVisible}
        portId={connectableProcessesPortId}
        flowVersion={connectableProcessesFlowVersion}
        onData={addProcessNodes}
      />
    </Space>
  );
};

export default ToolbarEdit;
