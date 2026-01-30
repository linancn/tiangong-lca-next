import { useGraphEvent, useGraphStore } from '@/contexts/graphContext';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import { initVersion } from '@/services/general/data';
import { formatDateTime, getLangText } from '@/services/general/util';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import {
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
  genPortLabel,
} from '@/services/lifeCycleModels/util';
import { getProcessesByIdAndVersion } from '@/services/processes/api';
import { genProcessName } from '@/services/processes/util';
import { ActionType } from '@ant-design/pro-components';
import { message, Space, Spin, theme } from 'antd';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';
// import ConnectableProcesses from '../connectableProcesses';
import { GraphEdge, GraphNode } from '@/contexts/graphContext';
import ModelResult from '../modelResult';
import { Control } from './control';
import EdgeExhange from './Exchange/index';
import IoPortView from './Exchange/ioPortView';
import { getEdgeLabel } from './utils/edge';
import {
  getPortLabelWithAllocation,
  getPortTextColor,
  getPortTextStyle,
  nodeTitleTool,
} from './utils/node';
import ToolbarViewInfo from './viewInfo';
import TargetAmount from './viewTargetAmount';
type Props = {
  id: string;
  version: string;
  lang: string;
  drawerVisible: boolean;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
};

const ToolbarView: FC<Props> = ({ id, version, lang, drawerVisible }) => {
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});
  const [jsonTg, setJsonTg] = useState<any>({});
  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);
  const [ioPortSelectorDirection, setIoPortSelectorDirection] = useState('');
  const [ioPortSelectorNode, setIoPortSelectorNode] = useState<any>({});
  const [ioPortSelectorDrawerVisible, setIoPortSelectorDrawerVisible] = useState(false);
  const [processInstances, setProcessInstances] = useState<any[]>([]);
  // const [connectableProcessesDrawerVisible, setConnectableProcessesDrawerVisible] = useState(false);
  // const [connectableProcessesPortId, setConnectableProcessesPortId] = useState<any>('');
  // const [connectableProcessesFlowVersion, setConnectableProcessesFlowVersion] = useState<any>('');

  const modelData = useGraphStore((state) => state.initData);
  const updateNode = useGraphStore((state) => state.updateNode);
  const intl = useIntl();

  const nodes: GraphNode[] = useGraphStore((state) => state.nodes);
  const edges: GraphEdge[] = useGraphStore((state) => state.edges);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);

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

  useGraphEvent('node:click', (evt) => {
    const node = evt.node;
    const event = evt.e;

    if (node.isNode()) {
      const currentNode = nodes.find((n) => n.id === node.id);

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
          selected: !currentNode?.selected,
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

  useGraphEvent('edge:click', (evt) => {
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

  useGraphEvent('edge:added', (evt) => {
    const edge = evt.edge;
    removeEdges([edge.id]);
  });

  const getProcessInstances = async (jsonTg: any) => {
    let params: { id: string; version: string }[] = [];
    jsonTg?.xflow?.nodes?.forEach((node: any) => {
      params.push({
        id: node?.data?.id,
        version: node?.data?.version,
      });
    });
    if (params.length > 0) {
      const procresses = await getProcessesByIdAndVersion(params);
      setProcessInstances(procresses.data ?? []);
    }
  };

  useEffect(() => {
    if (!drawerVisible) {
      setJsonTg({});
      return;
    }
    if (id && version) {
      setSpinning(true);
      getLifeCycleModelDetail(id, version).then(async (result: any) => {
        if (!result?.data?.id) {
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
        setInfoData({ ...fromData, id: id });
        setJsonTg(result.data?.json_tg);
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        const initNodes = (model?.nodes ?? []).map((node: any) => {
          return {
            ...node,
            attrs: nodeAttrs,
            ports: {
              ...node.ports,
              groups: ports.groups,
              items: node?.ports?.items?.map((item: any) => {
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
                      text: `${genPortLabel(itemTextWithAllocation ?? '', lang, node?.size?.width ?? node?.width ?? nodeTemplate.width)}`,
                      title: itemTextWithAllocation,
                      fill: getPortTextColor(
                        item?.data?.quantitativeReference,
                        item?.data?.allocations,
                        token,
                      ),
                      'font-weight': getPortTextStyle(item?.data?.quantitativeReference),
                    },
                  },
                };
              }),
            },
            tools: [
              node?.data?.quantitativeReference === '1' ? refTool : '',
              nodeTitleTool(
                node?.size?.width ?? node?.width ?? 350,
                genProcessName(node?.data?.label, lang) ?? '',
                token,
                lang,
              ),
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
              const label = getEdgeLabel(
                token,
                edge?.data?.connection?.unbalancedAmount,
                edge?.data?.connection?.exchangeAmount,
              );
              return {
                ...edge,
                attrs: {
                  line: {
                    stroke: token.colorPrimary,
                  },
                },
                labels: [label],
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
        getProcessInstances(result.data?.json_tg)
          .then(() => {})
          .finally(() => {
            setSpinning(false);
          });
      });
    } else {
      const currentDateTime = formatDateTime(new Date());
      const newData = {
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': currentDateTime,
          },
          publicationAndOwnership: {
            'common:dataSetVersion': initVersion,
          },
        },
      };
      setInfoData({ ...newData, id: id });
    }
  }, [drawerVisible]);

  useEffect(() => {
    nodes.forEach((node) => {
      updateNode(node.id ?? '', {
        tools: [
          node?.data?.quantitativeReference === '1' ? refTool : '',
          nodeTitleTool(
            node?.size?.width ?? node?.width ?? 350,
            genProcessName(node?.data?.label, lang) ?? '',
            token,
            lang,
          ),
          inputFlowTool,
          outputFlowTool,
        ],
      });
    });
  }, [nodeCount]);

  const getShowResult = () => {
    const selectedNode = nodes.find((node) => node.selected);
    const processInstance = processInstances.find(
      (pi) => pi.id === selectedNode?.data?.id && pi.version === selectedNode?.data?.version,
    );
    return processInstance?.modelId ? (
      <LifeCycleModelView
        id={processInstance.modelId}
        version={selectedNode?.data?.version ?? ''}
        lang={lang}
        buttonType={'toolIcon'}
      />
    ) : (
      <ProcessView
        id={selectedNode?.data?.id ?? ''}
        version={selectedNode?.data?.version ?? ''}
        buttonType={'toolIcon'}
        lang={lang}
        disabled={!selectedNode}
      />
    );
  };

  return (
    <Space direction='vertical' size={'middle'}>
      <ToolbarViewInfo lang={lang} data={infoData} />
      {getShowResult()}
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
        onData={() => {}}
      />
      {React.createElement('div', { style: { height: 8 } })}
      {/* <ProcessView
        id={id ?? ''}
        version={version ?? ''}
        lang={lang}
        buttonType={'toolResultIcon'}
        disabled={false}
      /> */}
      <ModelResult
        submodels={jsonTg?.submodels ?? []}
        modelId={id}
        modelVersion={version}
        lang={lang}
        actionType='view'
      />
      <Control items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']} />
      <Spin spinning={spinning} fullscreen />
      <IoPortView
        lang={lang}
        node={ioPortSelectorNode}
        direction={ioPortSelectorDirection}
        drawerVisible={ioPortSelectorDrawerVisible}
        onDrawerVisible={setIoPortSelectorDrawerVisible}
      />
      {/* <ConnectableProcesses
        lang={lang}
        drawerVisible={connectableProcessesDrawerVisible}
        setDrawerVisible={setConnectableProcessesDrawerVisible}
        portId={connectableProcessesPortId}
        flowVersion={connectableProcessesFlowVersion}
        readOnly={true}
      /> */}
    </Space>
  );
};

export default ToolbarView;
