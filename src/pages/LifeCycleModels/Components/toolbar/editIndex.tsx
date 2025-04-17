import ProcessEdit from '@/pages/Processes/Components/edit';
import ProcessView from '@/pages/Processes/Components/view';
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
import { CopyOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
import { Button, Space, Spin, Tooltip, message, theme } from 'antd';
import { FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
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
}) => {
  const [thisId, setThisId] = useState(id);
  const [thisVersion, setThisVersion] = useState(version);
  const [thisAction, setThisAction] = useState(action);
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});

  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);
  const [ioPortSelectorDirection, setIoPortSelectorDirection] = useState('');
  const [ioPortSelectorNode, setIoPortSelectorNode] = useState<any>({});
  const [ioPortSelectorDrawerVisible, setIoPortSelectorDrawerVisible] = useState(false);

  const modelData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);
  const updateNode = useGraphStore((state) => state.updateNode);
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const intl = useIntl();

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

      let labelSub = label?.substring(0, nodeWidth / 7 - 4);
      if (lang === 'zh') {
        labelSub = label?.substring(0, nodeWidth / 12 - 4);
      }

      return {
        id: direction + ':' + flowUUID,
        args: { x: group === 'groupOutput' ? '100%' : 0, y: baseY + index * 20 },
        attrs: {
          text: {
            text: label !== labelSub ? labelSub + '...' : label,
            title: labelSub,
          },
        },
        group: group,
        data: {
          textLang: textLang,
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
        const refPortItem = {
          id:
            (inOrOut ? 'INPUT' : 'OUTPUT') +
            ':' +
            (refExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '-'),
          args: { x: inOrOut ? 0 : '100%', y: 65 },
          attrs: {
            text: {
              text: genPortLabel(text ?? '', lang, nodeTemplate.width),
              title: text,
            },
          },
          group:
            refExchange?.exchangeDirection.toUpperCase() === 'OUTPUT'
              ? 'groupOutput'
              : 'groupInput',
          data: {
            textLang: refExchange?.referenceToFlowDataSet?.['common:shortDescription'],
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
    nodes.forEach((node) => {
      const nodeWidth = node?.size?.width ?? nodeTemplate.width;
      getProcessDetail(node?.data?.id ?? '', node?.data?.version ?? '').then(
        async (result: any) => {
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
              return {
                ...item,
                attrs: {
                  ...item?.attrs,
                  text: {
                    text: genPortLabel(newTitle, lang, nodeWidth),
                    title: newTitle,
                  },
                },
                data: {
                  ...item?.data,
                  textLang: newItem?.referenceToFlowDataSet?.['common:shortDescription'],
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
        },
      );
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

  const saveData = async () => {
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
      updateLifeCycleModel({ ...newData, id: thisId, version: thisVersion }).then((result: any) => {
        if (result.data) {
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
          message.error(result.error.message);
        }
        setSpinning(false);
      });
    } else if (thisAction === 'create') {
      const newId = actionType === 'createVersion' ? thisId : v4();
      console.log(newData, 'newData');
      createLifeCycleModel({ ...newData, id: newId }).then((result: any) => {
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
        setSpinning(false);
      });
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
      return {
        ...item,
        attrs: {
          text: {
            ...item?.attrs?.text,
            text: genPortLabel(itemText ?? '', lang, nodeWidth),
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

  useEffect(() => {
    if (!drawerVisible) return;
    if (id !== '') {
      setIsSave(false);
      setSpinning(true);
      getLifeCycleModelDetail(id, version).then(async (result: any) => {
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setInfoData({ ...fromData, id: thisId, version: thisVersion });
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        let initNodes = (model?.nodes ?? []).map((node: any) => {
          return {
            ...node,
            attrs: nodeAttrs,
            ports: {
              ...node.ports,
              groups: ports.groups,
            },
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
            compliance: [
              {
                'common:approvalOfOverallCompliance': 'Fully compliant',
                'common:nomenclatureCompliance': 'Fully compliant',
                'common:methodologicalCompliance': 'Fully compliant',
                'common:reviewCompliance': 'Fully compliant',
                'common:documentationCompliance': 'Fully compliant',
                'common:qualityCompliance': 'Fully compliant',
              },
            ],
          },
          validation: {
            review: [
              {
                'common:scope': [{}],
              },
            ],
          },
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

  return (
    <Space direction='vertical' size={'middle'}>
      <ToolbarEditInfo action={thisAction} data={infoData} onData={updateInfoData} lang={lang} />
      <ProcessView
        id={nodes.find((node) => node.selected)?.data?.id ?? ''}
        version={nodes.find((node) => node.selected)?.data?.version ?? ''}
        buttonType={'toolIcon'}
        lang={lang}
        disabled={!nodes.find((node) => node.selected)}
      />
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
          onClick={saveData}
        />
      </Tooltip>
      <br />

      <ProcessEdit
        id={id ?? ''}
        version={version ?? ''}
        lang={lang}
        buttonType={'tool'}
        actionRef={undefined}
        setViewDrawerVisible={() => {}}
      />
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
    </Space>
  );
};

export default ToolbarEdit;
