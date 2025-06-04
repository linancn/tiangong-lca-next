import ProcessView from '@/pages/Processes/Components/view';
import { getCommentApi } from '@/services/comments/api';
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
import IoPortView from './Exchange/ioPortView';
import ToolbarViewInfo from './viewInfo';
import TargetAmount from './viewTargetAmount';

type Props = {
  type: 'edit' | 'view';
  id: string;
  version: string;
  lang: string;
  reviewId: string;
  tabType: 'assigned' | 'review';
  drawerVisible: boolean;
  actionRef?: any;
};

const ToolbarView: FC<Props> = ({
  id,
  version,
  lang,
  drawerVisible,
  type,
  reviewId,
  tabType,
  actionRef,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});

  const [targetAmountDrawerVisible, setTargetAmountDrawerVisible] = useState(false);
  const [ioPortSelectorDirection, setIoPortSelectorDirection] = useState('');
  const [ioPortSelectorNode, setIoPortSelectorNode] = useState<any>({});
  const [ioPortSelectorDrawerVisible, setIoPortSelectorDrawerVisible] = useState(false);
  const [approveReviewDisabled, setApproveReviewDisabled] = useState(true);
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
        const { data, error } = await getCommentApi(reviewId, tabType);

        if (!error && data && data.length) {
          const isSaveReview = data && data.every((item: any) => item.state_code === 1);
          const allReviews: any[] = [];
          data.forEach((item: any) => {
            if (item?.json?.modellingAndValidation.validation.review[0]) {
              allReviews.push(item?.json?.modellingAndValidation.validation.review[0]);
            }
          });
          const allCompliance: any[] = [];
          data.forEach((item: any) => {
            if (item?.json?.modellingAndValidation.complianceDeclarations.compliance[0]) {
              allCompliance.push(
                item?.json?.modellingAndValidation.complianceDeclarations.compliance[0],
              );
            }
          });
          setApproveReviewDisabled(
            !isSaveReview || allReviews.length === 0 || allCompliance.length === 0,
          );
          if (result?.data?.json?.lifeCycleModelDataSet) {
            const _compliance =
              result.data.json.lifeCycleModelDataSet?.modellingAndValidation?.complianceDeclarations
                .compliance;
            const _review =
              result.data.json.lifeCycleModelDataSet?.modellingAndValidation?.validation?.review;
            result.data.json.lifeCycleModelDataSet.modellingAndValidation = {
              ...result.data.json.lifeCycleModelDataSet.modellingAndValidation,
              complianceDeclarations: {
                compliance: Array.isArray(_compliance)
                  ? [..._compliance, ...allCompliance]
                  : [_compliance, ...allCompliance],
              },
              validation: {
                review: Array.isArray(_review)
                  ? [..._review, ...allReviews]
                  : [_review, ...allReviews],
              },
            };
          }
        }
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setInfoData({ ...fromData, id: id, version: version });
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
    <Space direction='vertical' size={'middle'}>
      <ToolbarViewInfo
        approveReviewDisabled={approveReviewDisabled}
        actionRef={actionRef}
        type={type}
        lang={lang}
        data={infoData}
        reviewId={reviewId}
        tabType={tabType}
        modelId={id}
        modelVersion={version}
      />
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
        onData={() => {}}
      />
      <br />
      <ProcessView
        id={id ?? ''}
        version={version ?? ''}
        lang={lang}
        buttonType={'toolResultIcon'}
        disabled={false}
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
    </Space>
  );
};

export default ToolbarView;
