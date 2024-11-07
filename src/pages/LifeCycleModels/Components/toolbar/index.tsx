import ProcessEdit from '@/pages/Processes/Components/edit';
import ProcessView from '@/pages/Processes/Components/view';
import { formatDateTime, getLangText } from '@/services/general/util';
import {
  createLifeCycleModel,
  getLifeCycleModelDetail,
  updateLifeCycleModel,
} from '@/services/lifeCycleModels/api';
import {
  genLifeCycleModelData,
  genLifeCycleModelInfoFromData,
} from '@/services/lifeCycleModels/util';
import { getProcessDetail } from '@/services/processes/api';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
import { Button, Space, Spin, Tooltip, message, theme } from 'antd';
import { FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import ModelToolbarAdd from './add';
import { Control } from './control';
import ToolbarEditInfo from './eidtInfo';
import EdgeExhange from './Exchange/index';
import ToolbarViewInfo from './viewInfo';

type Props = {
  id: string | undefined;
  lang: string;
  drawerVisible: boolean;
  isSave: boolean;
  readonly: boolean;
  setIsSave: (isSave: boolean) => void;
};

const Toolbar: FC<Props> = ({ id, lang, drawerVisible, isSave, readonly, setIsSave }) => {
  const [thisId, setThisId] = useState(id);
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});
  const modelData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);
  const updateNode = useGraphStore((state) => state.updateNode);
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const intl = useIntl();

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const [nodeCount, setNodeCount] = useState(0);

  const { token } = theme.useToken();

  const refTools = [
    {
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
            // textContent: '☆',
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
        onClick() {},
      },
    },
  ];

  const nonRefTools = [
    {
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
            // textContent: '★', //https://symbl.cc/
            textContent: '☆',
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
          nodes.forEach((node) => {
            if (node.id === thisData?.id) {
              const updatedNodeData = {
                data: {
                  ...node?.data,
                  quantitativeReference: '1',
                },
                tools: refTools,
              };
              updateNode(node.id ?? '', updatedNodeData);
            } else {
              const updatedNodeData = {
                data: {
                  ...node.data,
                  quantitativeReference: '0',
                },
                tools: nonRefTools,
              };
              updateNode(node.id ?? '', updatedNodeData);
            }
          });
        },
      },
    },
  ];

  const nodeAttrs = {
    body: {
      stroke: token.colorBorder,
      strokeWidth: 1,
      fill: token.colorBgBase,
      rx: 6,
      ry: 6,
    },
    label: {
      fill: token.colorTextBase,
    },
  };

  const ports = {
    groups: {
      group1: {
        position: 'top',
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
        },
      },
      group2: {
        position: 'right',
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
        },
      },
      group3: {
        position: 'bottom',
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
        },
      },
      group4: {
        position: 'left',
        attrs: {
          circle: {
            stroke: token.colorPrimary,
            fill: token.colorBgBase,
            strokeWidth: 1,
            r: 4,
            magnet: true,
          },
        },
      },
    },
    items: [
      { id: 'group1', group: 'group1' },
      { id: 'group2', group: 'group2' },
      { id: 'group3', group: 'group3' },
      { id: 'group4', group: 'group4' },
    ],
  };

  const nodeTemplate = {
    id: '',
    shape: 'rect',
    x: 200,
    y: 100,
    width: 300,
    height: 40,
    attrs: nodeAttrs,
    tools: nonRefTools,
    data: {
      label: [],
      quantitativeReference: '0',
      generalComment: [],
    },
    ports: ports,
  };

  const saveCallback = useCallback(() => {
    setIsSave(true);
  }, [isSave, setIsSave]);

  const updateInfoData = (data: any) => {
    setInfoData({ ...data, id: thisId });
  };

  const updateEdgeData = (data: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, shape, ...newEdge } = data;
    if (newEdge.target) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { x, y, ...newTarget } = newEdge.target as any;
      updateEdge(id, { ...newEdge, target: newTarget });
    } else {
      updateEdge(id, { ...newEdge });
    }
  };

  const addProcessNode = (id: any) => {
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      await addNodes([
        {
          ...nodeTemplate,
          id: v4(),
          label: getLangText(
            result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
              ?.baseName,
            lang,
          ),
          data: {
            id: id,
            version:
              result.data?.json?.processDataSet?.administrativeInformation
                ?.publicationAndOwnership?.['common:dataSetVersion'],
            label:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
                ?.baseName,
            shortDescription:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
                ?.baseName,
            quantitativeReference: '0',
          },
        },
      ]);
      setNodeCount(nodes.length);
      setSpinning(false);
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
        await removeNodes([node.id ?? '']);
        setNodeCount(nodes.length);
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

    if (thisId) {
      updateLifeCycleModel({ ...newData, id: id }).then((result: any) => {
        if (result.data) {
          message.success(
            intl.formatMessage({
              id: 'pages.flows.savesuccess',
              defaultMessage: 'Save successfully',
            }),
          );
          saveCallback();
        } else {
          message.error(result.error.message);
        }
        setSpinning(false);
      });
    } else {
      const newId = v4();
      setThisId(newId);
      createLifeCycleModel({ ...newData, id: newId }).then((result: any) => {
        if (result.data) {
          message.success(
            intl.formatMessage({
              id: 'pages.button.create.success',
              defaultMessage: 'Created successfully!',
            }),
          );
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
    updateEdge(edge.id, {
      attrs: {
        line: {
          stroke: token.colorPrimary,
        },
      },
    });
  });

  useGraphEvent('edge:connected', (evt) => {
    const edge = evt.edge;
    const sourceNodeID = edge.getSourceCellId();
    const targetNodeID = edge.getTargetCellId();
    const sourceNode = nodes.find((node) => node.id === sourceNodeID);
    const targetNode = nodes.find((node) => node.id === targetNodeID);
    const sourceProcessId = sourceNode?.data?.id;
    const targetProcessId = targetNode?.data?.id;
    updateEdge(edge.id, {
      data: {
        node: {
          sourceNodeID: sourceNodeID,
          targetNodeID: targetNodeID,
          sourceProcessId: sourceProcessId,
          targetProcessId: targetProcessId,
        },
      },
    });
  });

  // useGraphEvent('cell:click', async (evt) => {
  //   console.log('cell:click', evt);
  //   console.log(nodes.filter((node) => node.selected)?.[0]?.data?.id);
  // });

  // useGraphEvent('node:dblclick', (evt) => {
  //   console.log('node:dblclick', evt);
  // });

  // useGraphEvent('edge:dblclick', (evt) => {
  //   console.log('edge:dblclick', evt);
  //   const selectedEdges = edges.filter((edge) => edge.selected);
  //   console.log(selectedEdges);
  // });

  useEffect(() => {
    if (!drawerVisible) return;
    if (id) {
      setIsSave(false);
      setSpinning(true);
      getLifeCycleModelDetail(id).then(async (result: any) => {
        const fromData = genLifeCycleModelInfoFromData(
          result.data?.json?.lifeCycleModelDataSet ?? {},
        );
        setInfoData({ ...fromData, id: thisId });
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        let initNodes = (model?.nodes ?? []).map((node: any) => {
          return {
            ...node,
            attrs: nodeAttrs,
            ports: ports,
            tools: node?.data?.quantitativeReference === '1' ? refTools : nonRefTools,
          };
        });
        if (readonly) {
          initNodes = initNodes.map((node: any) => {
            return {
              ...node,
              ports: {
                ...node?.ports,
                groups: {
                  ...node?.ports?.groups,
                  group1: {
                    ...node.ports?.groups?.group1,
                    attrs: {
                      circle: {
                        strokeWidth: 0,
                        r: 0,
                      },
                    },
                  },
                  group2: {
                    ...node.ports?.groups?.group2,
                    attrs: {
                      circle: {
                        strokeWidth: 0,
                        r: 0,
                      },
                    },
                  },
                  group3: {
                    ...node.ports?.groups?.group3,
                    attrs: {
                      circle: {
                        strokeWidth: 0,
                        r: 0,
                      },
                    },
                  },
                  group4: {
                    ...node.ports?.groups?.group4,
                    attrs: {
                      circle: {
                        strokeWidth: 0,
                        r: 0,
                      },
                    },
                  },
                },
              },
            };
          });
        }
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
        setNodeCount(initNodes.length);
        await modelData({
          nodes: initNodes,
          edges: initEdges,
        });
        if (!readonly) {
        }
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
            'common:dataSetVersion': '01.00.000',
          },
        },
      };
      setInfoData({ ...newData, id: thisId });
    }
  }, [drawerVisible]);

  useEffect(() => {
    nodes.forEach((node) => {
      updateNode(node.id ?? '', {
        tools: node?.data?.quantitativeReference === '1' ? refTools : nonRefTools,
      });
    });
  }, [nodeCount]);

  return (
    <Space direction="vertical" size={'middle'}>
      {readonly ? (
        <ToolbarViewInfo lang={lang} data={infoData} />
      ) : (
        <ToolbarEditInfo data={infoData} onData={updateInfoData} lang={lang} />
      )}
      <ProcessView
        id={nodes.filter((node) => node.selected)?.[0]?.data?.id ?? ''}
        dataSource={'tg'}
        buttonType={'toolIcon'}
        lang={lang}
        disabled={nodes.filter((node) => node.selected).length === 0}
      />
      <EdgeExhange
        lang={lang}
        disabled={edges.filter((edge) => edge.selected).length === 0}
        edge={edges.filter((edge) => edge.selected)?.[0]}
        onData={updateEdgeData}
        readonly={readonly}
      />
      {!readonly && (
        <>
          <ModelToolbarAdd buttonType={'icon'} lang={lang} onData={addProcessNode} />
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
              <FormattedMessage id="pages.button.model.delete" defaultMessage="Delete element" />
            }
            placement="left"
          >
            <Button
              type="primary"
              size="small"
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
            title={<FormattedMessage id="pages.button.model.save" defaultMessage="Save data" />}
            placement="left"
          >
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              style={{ boxShadow: 'none' }}
              onClick={saveData}
            />
          </Tooltip>
          <br />

          <ProcessEdit
            id={id}
            lang={lang}
            buttonType={'tool'}
            actionRef={undefined}
            setViewDrawerVisible={() => {}}
          />
        </>
      )}
      <Control items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']} />
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default Toolbar;
