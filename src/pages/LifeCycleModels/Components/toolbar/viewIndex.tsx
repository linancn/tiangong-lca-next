import ProcessView from '@/pages/Processes/Components/view';
import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import {
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
  genNodeLabel,
} from '@/services/lifeCycleModels/util';
import { genProcessName } from '@/services/processes/util';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
import { Space, Spin, theme } from 'antd';
import { FC, useEffect, useState } from 'react';
import { useIntl } from 'umi';
import { Control } from './control';
import EdgeExhange from './Exchange/index';
import TargetAmount from './targetAmount';
import ToolbarViewInfo from './viewInfo';

type Props = {
  id: string;
  version: string;
  lang: string;
  drawerVisible: boolean;
};

const ToolbarView: FC<Props> = ({ id, version, lang, drawerVisible }) => {
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});

  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);

  const modelData = useGraphStore((state) => state.initData);
  const updateNode = useGraphStore((state) => state.updateNode);
  const intl = useIntl();

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const removeEdges = useGraphStore((state) => state.removeEdges);

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

  useGraphEvent('edge:added', (evt) => {
    const edge = evt.edge;
    removeEdges([edge.id]);
  });

  useEffect(() => {
    if (!drawerVisible) return;
    if (id && version) {
      setSpinning(true);
      getLifeCycleModelDetail(id, version).then(async (result: any) => {
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setInfoData({ ...fromData, id: id });
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
              node?.data?.quantitativeReference === '1' ? refTool : '',
              nodeTitleTool(node?.width ?? 0, genProcessName(node?.data?.label, lang) ?? ''),
              inputFlowTool,
              outputFlowTool,
            ],
          };
        });
        // initNodes = initNodes.map((node: any) => {
        //   return {
        //     ...node,
        //     ports: {
        //       ...node?.ports,
        //       groups: {
        //         ...node?.ports?.groups,
        //         group1: {
        //           ...node.ports?.groups?.group1,
        //           attrs: {
        //             circle: {
        //               strokeWidth: 0,
        //               r: 0,
        //             },
        //           },
        //         },
        //         group2: {
        //           ...node.ports?.groups?.group2,
        //           attrs: {
        //             circle: {
        //               strokeWidth: 0,
        //               r: 0,
        //             },
        //           },
        //         },
        //         group3: {
        //           ...node.ports?.groups?.group3,
        //           attrs: {
        //             circle: {
        //               strokeWidth: 0,
        //               r: 0,
        //             },
        //           },
        //         },
        //         group4: {
        //           ...node.ports?.groups?.group4,
        //           attrs: {
        //             circle: {
        //               strokeWidth: 0,
        //               r: 0,
        //             },
        //           },
        //         },
        //       },
        //     },
        //   };
        // });

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

        // if (thisAction !== 'view') {
        // }
        setSpinning(false);
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
          nodeTitleTool(node?.width ?? 0, genProcessName(node?.data?.label, lang) ?? ''),
          inputFlowTool,
          outputFlowTool,
        ],
      });
    });
  }, [nodeCount]);

  return (
    <Space direction="vertical" size={'middle'}>
      <ToolbarViewInfo lang={lang} data={infoData} />
      <ProcessView
        id={nodes.filter((node) => node.selected)?.[0]?.data?.id ?? ''}
        version={nodes.filter((node) => node.selected)?.[0]?.data?.version ?? ''}
        // dataSource={'tg'}
        buttonType={'toolIcon'}
        lang={lang}
        disabled={nodes.filter((node) => node.selected).length === 0}
      />
      <EdgeExhange
        lang={lang}
        disabled={edges.filter((edge) => edge.selected).length === 0}
        edge={edges.filter((edge) => edge.selected)?.[0]}
      />
      <TargetAmount
        refNode={nodes.filter((node) => node?.data?.quantitativeReference === '1')}
        drawerVisible={targetAmountDrawerVisible}
        lang={lang}
        setDrawerVisible={setTargetAmountDrawerVisible}
        onData={() => {}}
      />
      <br />
      <ProcessView
        id={id ?? ''}
        version={version ?? ''}
        lang={lang}
        buttonType={'toolResultIcon'}
        // dataSource={''}
        disabled={false}
      />
      <Control items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']} />
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default ToolbarView;
