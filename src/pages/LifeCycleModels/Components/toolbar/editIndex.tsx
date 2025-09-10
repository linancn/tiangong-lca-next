import ProcessEdit from '@/pages/Processes/Components/edit';
import ProcessView from '@/pages/Processes/Components/view';
import type { refDataType } from '@/pages/Utils/review';
import { checkReferences, getAllRefObj, getRefTableName, ReffPath } from '@/pages/Utils/review';
import { getRefData } from '@/services/general/api';
import { initVersion } from '@/services/general/data';
import { formatDateTime, getLangText } from '@/services/general/util';
import {
  createLifeCycleModel,
  getLifeCycleModelDetail,
  updateLifeCycleModel,
} from '@/services/lifeCycleModels/api';
import {
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
  genNodeLabel,
  genPortLabel,
} from '@/services/lifeCycleModels/util';
import { getProcessDetail, getProcessDetailByIdAndVersion } from '@/services/processes/api';
import { genProcessFromData, genProcessName, genProcessNameJson } from '@/services/processes/util';
import { getUserTeamId } from '@/services/roles/api';
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
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
import ToolbarEditInfo from './eidtInfo';
import EdgeExhange from './Exchange/index';
import IoPortSelect from './Exchange/ioPortSelect';

type Props = {
  id: string;
  version: string;
  lang: string;
  drawerVisible: boolean;
  isSave: boolean;
  action: string;
  setIsSave: (isSave: boolean) => void;
  actionType?: 'create' | 'copy' | 'createVersion';
  importData?: any;
  onClose?: () => void;
  hideReviewButton?: boolean;
  updateNodeCb?: (ref: refDataType) => Promise<void>;
};

const ToolbarEdit: FC<Props> = ({
  id,
  version,
  lang,
  drawerVisible,
  isSave,
  action,
  setIsSave,
  actionType,
  importData,
  onClose = () => {},
  hideReviewButton = false,
  updateNodeCb = () => {},
}) => {
  const [thisId, setThisId] = useState(id);
  const [thisVersion, setThisVersion] = useState(version);
  const [thisAction, setThisAction] = useState(action);
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});
  const [jsonTg, setJsonTg] = useState<any>({});
  const [problemNodes, setProblemNodes] = useState<refDataType[]>([]);

  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);
  const [ioPortSelectorDirection, setIoPortSelectorDirection] = useState('');
  const [ioPortSelectorNode, setIoPortSelectorNode] = useState<any>({});
  const [ioPortSelectorDrawerVisible, setIoPortSelectorDrawerVisible] = useState(false);
  const [connectableProcessesDrawerVisible, setConnectableProcessesDrawerVisible] = useState(false);
  const [connectableProcessesPortId, setConnectableProcessesPortId] = useState<any>('');
  const [connectableProcessesFlowVersion, setConnectableProcessesFlowVersion] = useState<any>('');

  const modelData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);
  const updateNode = useGraphStore((state) => state.updateNode);
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const intl = useIntl();

  const editInfoRef = useRef<any>(null);
  useEffect(() => {
    setThisAction(action);
  }, [action]);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const [nodeCount, setNodeCount] = useState(0);

  const { token } = theme.useToken();

  const nodeTitleTool = (width: number, title: string) => {
    return {
      id: 'nodeTitle',
      name: 'button',
      args: {
        markup: [
          {
            tagName: 'rect',
            selector: 'button',
            attrs: {
              width: width,
              height: 26,
              rx: 4,
              ry: 4,
              fill: token.colorPrimary,
              stroke: token.colorPrimary,
              'stroke-width': 1,
              cursor: 'pointer',
            },
          },
          {
            tagName: 'text',
            textContent: genNodeLabel(title ?? '', lang, width),
            selector: 'text',
            attrs: {
              fill: 'white',
              'font-size': 14,
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
              'pointer-events': 'none',
              x: width / 2,
              y: 13,
            },
          },
          {
            tagName: 'title',
            textContent: title,
          },
        ],
        x: 0,
        y: 0,
        offset: { x: 0, y: 0 },
      },
    };
  };

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
      async onClick(view: any) {
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
      async onClick(view: any) {
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
      onClick() {
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
      onClick(view: any) {
        const thisData = view.cell.store.data;
        nodes.forEach(async (node) => {
          if (node.id === thisData?.id) {
            const updatedNodeData = {
              data: {
                ...node?.data,
                quantitativeReference: '1',
              },
              tools: (node.tools as any)?.map((tool: any) => {
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
              tools: (node.tools as any)?.map((tool: any) => {
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

  const nodeTemplate: any = {
    id: '',
    label: '',
    shape: 'rect',
    x: 200,
    y: 100,
    width: 350,
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
    // labels: [{
    //   position: 0.5,
    //   attrs: {
    //     body: {
    //       stroke: token.colorBorder,
    //       strokeWidth: 1,
    //       fill: token.colorBgBase,
    //       rx: 6,
    //       ry: 6,
    //     },
    //     label: {
    //       text: '1',
    //       fill: token.colorTextBase,
    //     },
    //   },
    // },
    // ],
    // tools: ['edge-editor'],
  };

  const saveCallback = useCallback(() => {
    setIsSave(true);
  }, [isSave, setIsSave]);

  const updateInfoData = (data: any) => {
    setInfoData({ ...data, id: thisId, version: thisVersion });
  };

  const updateTargetAmount = (data: any) => {
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

  const getPortTextColor = (quantitativeReference: boolean, allocations: any) => {
    const num = allocations?.allocation?.['@allocatedFraction']?.split('%')[0];
    const allocatedFractionNum = Number(num);
    if (allocatedFractionNum > 0 || quantitativeReference) {
      return token.colorPrimary;
    }
    return token.colorTextDescription;
  };

  const getPortTextStyle = (quantitativeReference: boolean) => {
    if (quantitativeReference) {
      return 'bold';
    }
    return 'normal';
  };

  const getPortLabelWithAllocation = (label: string, allocations: any) => {
    const allocatedFraction = allocations?.allocation?.['@allocatedFraction'];
    const num = allocatedFraction?.split('%')[0];
    if (allocatedFraction) {
      return `${num && num > 0 ? `[${allocatedFraction}]` : ''} ${label}`;
    }
    return label;
  };

  const updateNodePorts = (data: any) => {
    const group = ioPortSelectorDirection === 'Output' ? 'groupOutput' : 'groupInput';

    const originalItems: any[] =
      ioPortSelectorNode?.ports?.items?.filter((item: any) => item?.group !== group) ?? [];

    let baseY = 65;
    if (group === 'groupOutput') {
      baseY = 65 + originalItems.length * 20;
    }

    const newItems: any[] = data?.selectedRowData?.map((item: any, index: number) => {
      const nodeWidth = ioPortSelectorNode.size.width;
      const textLang = item?.referenceToFlowDataSet?.['common:shortDescription'];
      const direction = ioPortSelectorDirection.toUpperCase();
      const flowUUID = item?.referenceToFlowDataSet?.['@refObjectId'] ?? '-';
      const label = getLangText(textLang, lang);
      const labelWithAllocation = getPortLabelWithAllocation(label, item?.allocations);
      let labelSubWithAllocation = labelWithAllocation?.substring(0, nodeWidth / 7 - 4);
      if (lang === 'zh') {
        labelSubWithAllocation = labelWithAllocation?.substring(0, nodeWidth / 12 - 4);
      }

      return {
        id: direction + ':' + flowUUID,
        args: { x: group === 'groupOutput' ? '100%' : 0, y: baseY + index * 20 },
        attrs: {
          text: {
            text: `${labelWithAllocation && labelWithAllocation.length > (lang === 'zh' ? nodeWidth / 12 - 4 : nodeWidth / 7 - 4) ? labelSubWithAllocation + '...' : labelWithAllocation}`,
            title: labelWithAllocation,
            cursor: 'pointer',
            fill: getPortTextColor(item?.quantitativeReference, item?.allocations),
            'font-weight': getPortTextStyle(item?.quantitativeReference),
          },
        },
        group: group,
        data: {
          textLang: textLang,
          flowId: item?.referenceToFlowDataSet?.['@refObjectId'],
          flowVersion: item?.referenceToFlowDataSet?.['@version'],
          quantitativeReference: item?.quantitativeReference,
          allocations: item?.allocations,
        },
      };
    });

    let thisItems: any[] = [];
    if (group === 'groupInput') {
      const inputItemLength = newItems.length;
      const outputItems = originalItems.map((item: any, index: number) => {
        return { ...item, args: { ...item.args, y: 65 + (inputItemLength + index) * 20 } };
      });
      thisItems = [...newItems, ...outputItems];
    } else if (group === 'groupOutput') {
      thisItems = [...originalItems, ...newItems];
    } else {
      thisItems = ioPortSelectorNode?.ports?.items ?? [];
    }

    const thisPorts = {
      ...ports,
      items: thisItems,
    };

    const nodeWidth = ioPortSelectorNode.size.width;
    const nodeHeight = 60 + thisItems.length * 20;

    updateNode(ioPortSelectorNode.id, { ports: thisPorts });
    updateNode(ioPortSelectorNode.id, { width: nodeWidth, height: nodeHeight });
  };

  // const updateEdgeData = (data: any) => {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const { id, shape, ...newEdge } = data;
  //   if (newEdge.target) {
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     const { x, y, ...newTarget } = newEdge.target as any;
  //     updateEdge(id, { ...newEdge, target: newTarget });
  //   } else {
  //     updateEdge(id, { ...newEdge });
  //   }
  // };

  type TAddProcessNodesParams = { id: string; version: string };

  const addProcessNodes = (processes: TAddProcessNodesParams[]) => {
    setSpinning(true);
    if (processes.length > 1) {
    }
    getProcessDetailByIdAndVersion(processes).then(async (result: any) => {
      const dealData = (data: any, index: number) => {
        const exchange =
          genProcessFromData(data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? [];
        const refExchange = exchange.find((i: any) => i?.quantitativeReference === true);
        const inOrOut = refExchange?.exchangeDirection.toUpperCase() === 'INPUT';
        const text = getLangText(
          refExchange?.referenceToFlowDataSet?.['common:shortDescription'],
          lang,
        );
        const textWithAllocation = getPortLabelWithAllocation(text ?? '', refExchange?.allocations);
        const refPortItem = {
          id:
            (inOrOut ? 'INPUT' : 'OUTPUT') +
            ':' +
            (refExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '-'),
          args: { x: inOrOut ? 0 : '100%', y: 65 },
          attrs: {
            text: {
              text: `${genPortLabel(textWithAllocation ?? '', lang, nodeTemplate.width)}`,
              title: textWithAllocation,
              cursor: 'pointer',
              fill: getPortTextColor(refExchange?.quantitativeReference, refExchange?.allocations),
              'font-weight': getPortTextStyle(refExchange?.quantitativeReference),
            },
          },
          group:
            refExchange?.exchangeDirection.toUpperCase() === 'OUTPUT'
              ? 'groupOutput'
              : 'groupInput',
          data: {
            textLang: refExchange?.referenceToFlowDataSet?.['common:shortDescription'],
            flowId: refExchange?.referenceToFlowDataSet?.['@refObjectId'],
            flowVersion: refExchange?.referenceToFlowDataSet?.['@version'],
            quantitativeReference: refExchange?.quantitativeReference,
            allocations: refExchange?.allocations,
          },
        };

        const name = data?.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {};
        const quantitativeReference = nodeCount === 0 && index === 0 ? '1' : '0';
        addNodes([
          {
            ...nodeTemplate,
            id: v4(),
            data: {
              id: data.id,
              version: data?.version,
              label: name,
              shortDescription: genProcessNameJson(name),
              quantitativeReference: quantitativeReference,
            },
            tools: [
              nodeTitleTool(nodeTemplate.width, genProcessName(name, lang) ?? ''),
              quantitativeReference === '1' ? refTool : nonRefTool,
              inputFlowTool,
              outputFlowTool,
            ],
            ports: {
              ...ports,
              items: [refPortItem],
            },
          },
        ]);
      };

      if (result && result.data) {
        result?.data.forEach(async (item: TAddProcessNodesParams, index: number) => {
          await dealData(item, index);
          await setNodeCount(nodeCount + 1);
        });
      }

      setSpinning(false);
    });
  };

  const updateReference = async () => {
    setSpinning(true);
    let requestCount = 0;
    nodes.forEach((node) => {
      const nodeWidth = node?.size?.width ?? nodeTemplate.width;
      getProcessDetail(node?.data?.id ?? '', node?.data?.version ?? '')
        .then(async (result: any) => {
          const newLabel =
            result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {};
          const newShortDescription = genProcessNameJson(
            result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {},
          );
          const newVersion = result.data?.version ?? '';
          const exchanges =
            genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? [];
          const newItems = (node?.ports as any)?.items?.map((item: any) => {
            const newItem = exchanges.find((i: any) => {
              const ids = item?.id?.split(':');
              if (ids.length < 2) return false;
              return (
                (i?.exchangeDirection ?? '-').toUpperCase() +
                  ':' +
                  (i?.referenceToFlowDataSet?.['@refObjectId'] ?? '-') ===
                ids[0].toUpperCase() + ':' + (ids[ids.length - 1] ?? '-')
              );
            });
            if (newItem) {
              const newTitle = getLangText(
                newItem?.referenceToFlowDataSet?.['common:shortDescription'],
                lang,
              );
              const newTitleWithAllocation = getPortLabelWithAllocation(
                newTitle,
                newItem?.allocations,
              );
              return {
                ...item,
                attrs: {
                  ...item?.attrs,
                  text: {
                    text: `${genPortLabel(newTitleWithAllocation, lang, nodeWidth)}`,
                    title: newTitleWithAllocation,
                    cursor: 'pointer',
                    fill: getPortTextColor(newItem?.quantitativeReference, newItem?.allocations),
                    'font-weight': getPortTextStyle(newItem?.quantitativeReference),
                  },
                },
                data: {
                  ...item?.data,
                  textLang: newItem?.referenceToFlowDataSet?.['common:shortDescription'],
                  flowId: newItem?.referenceToFlowDataSet?.['@refObjectId'],
                  flowVersion: newItem?.referenceToFlowDataSet?.['@version'],
                  quantitativeReference: newItem?.quantitativeReference,
                  allocations: newItem?.allocations,
                },
              };
            } else {
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
            }
          });
          updateNode(node.id ?? '', {
            data: {
              ...node.data,
              label: newLabel,
              shortDescription: newShortDescription,
              version: newVersion,
            },
            tools: [
              node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
              nodeTitleTool(node?.width ?? 0, genProcessName(newLabel, lang) ?? ''),
              inputFlowTool,
              outputFlowTool,
            ],
            ports: {
              ...node?.ports,
              items: newItems,
            },
          });
        })
        .finally(() => {
          requestCount++;
          if (requestCount === nodes.length) {
            setSpinning(false);
          }
        });
    });
  };

  const deleteCell = () => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      selectedNodes.forEach(async (node) => {
        const selectedEdges = edges.filter(
          (edge) =>
            (edge.source as any)?.cell === node.id || (edge.target as any)?.cell === node.id,
        );
        await removeEdges(selectedEdges.map((e) => e.id ?? ''));
        if (node.data?.quantitativeReference === '1') {
        }
        await removeNodes([node.id ?? '']);
        setNodeCount(nodeCount - 1);
      });
    } else {
      const selectedEdges = edges.filter((edge) => edge.selected);
      if (selectedEdges.length > 0) {
        removeEdges(selectedEdges.map((e) => e.id ?? ''));
      }
    }
  };

  const saveData = async (setLoadingData = true) => {
    setSpinning(true);

    const newEdges = edges.map((edge) => {
      if (edge.target) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { x, y, ...targetRest } = edge.target as any;
        return { ...edge, target: targetRest };
      }
      return edge;
    });

    const newData = {
      ...(infoData ?? {}),
      model: {
        nodes: nodes ?? [],
        edges: newEdges ?? [],
      },
    };

    if (thisAction === 'edit') {
      const result = await updateLifeCycleModel({ ...newData, id: thisId, version: thisVersion });
      if (result?.data) {
        setInfoData({ ...newData, id: thisId, version: thisVersion });
        message.success(
          intl.formatMessage({
            id: 'pages.flows.savesuccess',
            defaultMessage: 'Save successfully',
          }),
        );
        setThisId(result.data?.[0]?.id);
        setThisVersion(result.data?.[0]?.version);
        saveCallback();
      } else {
        if (result?.error?.state_code === 100) {
          message.error(
            intl.formatMessage({
              id: 'pages.review.openData',
              defaultMessage: 'This data is open data, save failed',
            }),
          );
        } else if (result?.error?.state_code === 20) {
          message.error(
            intl.formatMessage({
              id: 'pages.review.underReview',
              defaultMessage: 'Data is under review, save failed',
            }),
          );
        } else {
          message.error(result?.error?.message);
        }
      }
      if (setLoadingData) setSpinning(false);
    } else if (thisAction === 'create') {
      const newId = actionType === 'createVersion' ? thisId : v4();
      const result = await createLifeCycleModel({ ...newData, id: newId });
      if (result.data) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.create.success',
            defaultMessage: 'Created successfully!',
          }),
        );
        setThisAction('edit');
        setThisId(result.data?.[0]?.id);
        setThisVersion(result.data?.[0]?.version);
        saveCallback();
      } else {
        message.error(result.error.message);
      }
      if (setLoadingData) setSpinning(false);
    }
    return true;
  };

  useGraphEvent('edge:added', (evt) => {
    const edge = evt.edge;
    updateEdge(edge.id, edgeTemplate);
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

  useGraphEvent('node:change:size', (evt) => {
    const node = evt.node;
    const nodeWidth = node.getSize().width;
    const label = genProcessName(node?.data?.label, lang);
    const newItems = node?.getPorts()?.map((item: any) => {
      const itemText = getLangText(item?.data?.textLang, lang);
      const itemTextWithAllocation = getPortLabelWithAllocation(
        itemText ?? '',
        item?.data?.allocations,
      );
      return {
        ...item,
        attrs: {
          text: {
            ...item?.attrs?.text,
            text: `${genPortLabel(itemTextWithAllocation ?? '', lang, nodeWidth)}`,
            cursor: 'pointer',
            fill: getPortTextColor(item?.data?.quantitativeReference, item?.data?.allocations),
            'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
          },
        },
      };
    });

    updateNode(node.id, {
      label: genNodeLabel(label ?? '', lang, nodeWidth),
      ports: {
        ...node?.ports,
        items: newItems,
      },
      tools: [
        node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
        nodeTitleTool(nodeWidth ?? 0, label ?? ''),
        inputFlowTool,
        outputFlowTool,
      ],
    });
  });

  useGraphEvent('node:click', (evt) => {
    const node = evt.node;
    const event = evt.e;

    if (node.isNode()) {
      if (event && event.target) {
        const target = event.target as HTMLElement;
        const textContent = target.textContent;

        if (textContent) {
          const targetElement = event.target as HTMLElement;
          const parentElement = targetElement.parentElement;
          const grandParentElement = parentElement?.parentElement;

          let clickedPortId = null;
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
            const ports = node.getPorts();
            matchedPort = ports.find((port: any) => port.id === clickedPortId);

            if (matchedPort) {
              setConnectableProcessesDrawerVisible(true);
              setConnectableProcessesPortId(clickedPortId);
              setConnectableProcessesFlowVersion(matchedPort?.data?.flowVersion);
            }
          }
        }
      }
    }
  });

  useEffect(() => {
    if (!drawerVisible) {
      onClose();
      setInfoData({});
      setNodeCount(0);
      setProblemNodes([]);
      setJsonTg({});
      return;
    }
    if (importData && importData.length > 0) {
      const formData = genLifeCycleModelInfoFromData(importData[0].lifeCycleModelDataSet);
      setInfoData(formData);
      const model = genLifeCycleModelData(importData[0]?.json_tg ?? {}, lang);
      let initNodes = (model?.nodes ?? []).map((node: any) => {
        const updatedPorts = {
          ...node.ports,
          groups: ports.groups,
          items: (node.ports?.items ?? []).map((item: any) => {
            const itemText = getLangText(item?.data?.textLang, lang);
            const itemTextWithAllocation = getPortLabelWithAllocation(
              itemText ?? '',
              item?.data?.allocations,
            );
            return {
              ...item,
              attrs: {
                ...item?.attrs,
                text: {
                  ...item?.attrs?.text,
                  text: `${genPortLabel(itemTextWithAllocation ?? '', lang, node?.width ?? nodeTemplate.width)}`,
                  title: itemTextWithAllocation,
                  fill: getPortTextColor(
                    item?.data?.quantitativeReference,
                    item?.data?.allocations,
                  ),
                  'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
                },
              },
            };
          }),
        };

        return {
          ...node,
          attrs: nodeAttrs,
          ports: updatedPorts,
          tools: [
            node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
            nodeTitleTool(node?.width ?? 0, genProcessName(node?.data?.label, lang) ?? ''),
            inputFlowTool,
            outputFlowTool,
          ],
        };
      });
      const initEdges =
        model?.edges?.map((edge: any) => {
          if (edge.target) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { x, y, ...targetRest } = edge.target as any;
            return {
              ...edge,
              attrs: {
                line: {
                  stroke: token.colorPrimary,
                },
              },
              target: targetRest,
            };
          }
          return edge;
        }) ?? [];
      modelData({
        nodes: initNodes,
        edges: initEdges,
      });

      setNodeCount(initNodes.length);
      return;
    }
    if (id !== '') {
      setIsSave(false);
      setSpinning(true);
      getLifeCycleModelDetail(id, version, true).then(async (result: any) => {
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setJsonTg(result.data?.json_tg);
        setInfoData({ ...fromData, id: thisId, version: thisVersion });
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        let initNodes = (model?.nodes ?? []).map((node: any) => {
          const updatedPorts = {
            ...node.ports,
            groups: ports.groups,
            items: (node.ports?.items ?? []).map((item: any) => {
              const itemText = getLangText(item?.data?.textLang, lang);
              const itemTextWithAllocation = getPortLabelWithAllocation(
                itemText ?? '',
                item?.data?.allocations,
              );
              return {
                ...item,
                attrs: {
                  ...item?.attrs,
                  text: {
                    ...item?.attrs?.text,
                    text: `${genPortLabel(itemTextWithAllocation ?? '', lang, node?.width ?? nodeTemplate.width)}`,
                    title: itemTextWithAllocation,
                    fill: getPortTextColor(
                      item?.data?.quantitativeReference,
                      item?.data?.allocations,
                    ),
                    'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
                  },
                },
              };
            }),
          };

          return {
            ...node,
            attrs: nodeAttrs,
            ports: updatedPorts,
            tools: [
              node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
              nodeTitleTool(node?.width ?? 0, genProcessName(node?.data?.label, lang) ?? ''),
              inputFlowTool,
              outputFlowTool,
            ],
          };
        });
        const initEdges =
          model?.edges?.map((edge: any) => {
            if (edge.target) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { x, y, ...targetRest } = edge.target as any;
              return {
                ...edge,
                attrs: {
                  line: {
                    stroke: token.colorPrimary,
                  },
                },
                target: targetRest,
              };
            }
            return edge;
          }) ?? [];
        await modelData({
          nodes: initNodes,
          edges: initEdges,
        });

        setNodeCount(initNodes.length);
        setSpinning(false);
      });
    } else {
      const currentDateTime = formatDateTime(new Date());
      const newData = {
        modellingAndValidation: {
          complianceDeclarations: {
            // compliance: [
            //   {
            //     'common:approvalOfOverallCompliance': 'Fully compliant',
            //     'common:nomenclatureCompliance': 'Fully compliant',
            //     'common:methodologicalCompliance': 'Fully compliant',
            //     'common:reviewCompliance': 'Fully compliant',
            //     'common:documentationCompliance': 'Fully compliant',
            //     'common:qualityCompliance': 'Fully compliant',
            //   },
            // ],
          },
          // validation: {
          //   review: [
          //     {
          //       'common:scope': [{}],
          //     },
          //   ],
          // },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': currentDateTime,
          },
          publicationAndOwnership: {
            'common:dataSetVersion': initVersion,
          },
        },
      };
      setInfoData({ ...newData, id: thisId, version: thisVersion });
      modelData({
        nodes: [],
        edges: [],
      });
      setNodeCount(0);
    }
  }, [drawerVisible]);

  useEffect(() => {
    nodes.forEach((node) => {
      updateNode(node.id ?? '', {
        tools: [
          node?.data?.quantitativeReference === '1' ? refTool : nonRefTool,
          nodeTitleTool(node?.width ?? 0, genProcessName(node?.data?.label, lang) ?? ''),
          inputFlowTool,
          outputFlowTool,
        ],
      });
    });
  }, [nodeCount]);

  useEffect(() => {
    nodes.forEach((node) => {
      const isErrNode = problemNodes.find(
        (item: any) =>
          item['@refObjectId'] === node.data.id && item['@version'] === node.data.version,
      );
      if (isErrNode) {
        updateNode(node.id ?? '', {
          attrs: {
            ...nodeAttrs,
            body: {
              ...nodeAttrs.body,
              stroke: token.colorError,
            },
          },
        });
      } else {
        updateNode(node.id ?? '', {
          attrs: {
            ...nodeAttrs,
            body: {
              ...nodeAttrs.body,
              stroke: token.colorPrimary,
            },
          },
        });
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
        new Map<string, any>(),
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

  const handleCheckData = async () => {
    setSpinning(true);
    await saveData(false);
    const { problemNodes } = await editInfoRef.current?.handleCheckData(nodes, edges);
    setProblemNodes(problemNodes ?? []);
    setSpinning(false);
  };

  const handelSubmitReview = async () => {
    setSpinning(true);
    await saveData(false);
    const { checkResult, unReview, problemNodes } = await editInfoRef.current?.handleCheckData(
      nodes,
      edges,
    );
    setProblemNodes(problemNodes ?? []);

    if (checkResult) {
      await editInfoRef.current?.submitReview(unReview);
    }
    setSpinning(false);
  };

  const getShowTool = () => {
    const selectedNode = nodes.find((node) => node.selected);

    if (selectedNode?.isMyProcess) {
      if (selectedNode?.modelData) {
        return (
          <LifeCycleModelEdit
            id={selectedNode?.modelData?.id ?? ''}
            version={selectedNode?.modelData?.version ?? ''}
            lang={lang}
            actionRef={undefined}
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
      if (selectedNode?.modelData) {
        return (
          <LifeCycleModelView
            id={selectedNode?.modelData?.id ?? ''}
            version={selectedNode?.modelData?.version ?? ''}
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

  return (
    <Space
      direction='vertical'
      size={'middle'}
      style={{ height: '70vh', overflowY: 'auto', paddingRight: 10, paddingLeft: 10 }}
    >
      <ToolbarEditInfo
        ref={editInfoRef}
        action={thisAction}
        data={infoData}
        onData={updateInfoData}
        lang={lang}
      />
      {getShowTool()}
      <EdgeExhange
        lang={lang}
        disabled={!edges.find((edge) => edge.selected)}
        edge={edges.find((edge) => edge.selected)}
      />
      <TargetAmount
        refNode={nodes.find((node) => node?.data?.quantitativeReference === '1')}
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
          <FormattedMessage id='pages.button.updateReference' defaultMessage='Update reference' />
        }
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<CopyOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={updateReference}
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
      <ModelResult submodels={jsonTg?.submodels ?? []} modelVersion={version} lang={lang} />
      <Tooltip
        title={<FormattedMessage id='pages.button.check' defaultMessage='Data check' />}
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<CheckCircleOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={handleCheckData}
        />
      </Tooltip>
      {!hideReviewButton ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.review' defaultMessage='Submit for review' />}
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
      <Control items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']} />
      <Spin spinning={spinning} fullscreen />
      <IoPortSelect
        lang={lang}
        node={ioPortSelectorNode}
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
