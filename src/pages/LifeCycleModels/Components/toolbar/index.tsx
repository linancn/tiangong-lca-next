import ProcessView from '@/pages/Processes/Components/view';
import { formatDateTime, getLangText } from '@/services/general/util';
import { createLifeCycleModel, getLifeCycleModelDetail, updateLifeCycleModel } from '@/services/lifeCycleModels/api';
import { genLifeCycleModelData, genLifeCycleModelInfoFromData } from '@/services/lifeCycleModels/util';
import { getProcessDetail } from '@/services/processes/api';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useGraphStore } from '@antv/xflow';
import { Button, Space, Spin, Tooltip, message } from 'antd';
import { FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import ModelToolbarAdd from './add';
import { node } from './config/node';
import { Control } from './control';
import ToolbarEditInfo from './eidtInfo';
import EdgeExhange from './Exchange';
import ModelToolbarViewInfo from './viewInfo';

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
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const removeEdges = useGraphStore((state) => state.removeEdges);
  const updateEdge = useGraphStore((state) => state.updateEdge);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const saveCallback = useCallback(() => {
    setIsSave(true);
  }, [isSave, setIsSave]);

  const updateInfoData = (data: any) => {
    setInfoData(data);
    // if (thisId) {
    //   updateProduct({ ...data, id: thisId }).then((result: any) => {
    //     if (result.data) {
    //       message.success(
    //         <FormattedMessage id="pages.flows.savesuccess" defaultMessage="Save successfully!" />,
    //       );
    //     } else {
    //       message.error(result.error.message);
    //     }
    //   });
    // }
    // else {
    //   const newId = v4();
    //   setThisId(newId);
    //   setInfoData({
    //     ...data,
    //     lifeCycleModelInformation: {
    //       ...data.lifeCycleModelInformation,
    //       dataSetInformation: {
    //         ...data.lifeCycleModelInformation.dataSetInformation,
    //         'common:UUID': newId,
    //       },
    //     },
    //   });
    //   createLifeCycleModel({ ...data, id: newId }).then((result: any) => {
    //     if (result.data) {
    //       message.success(
    //         <FormattedMessage
    //           id="pages.flows.createsuccess"
    //           defaultMessage="Created successfully!"
    //         />,
    //       );
    //     } else {
    //       message.error(result.error.message);
    //     }
    //   });
    // }
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
      addNodes([
        {
          ...node,
          id: v4(),
          label: getLangText(
            result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
              ?.baseName,
            lang,
          ),
          data: {
            id: id,
            version: result.data?.json?.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
              'common:dataSetVersion'
            ],
            label:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
                ?.baseName,
            shortDescription:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName,
          },
        },
      ]);
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
      ...infoData ?? {},
      model: {
        nodes: nodes ?? [],
        edges: newEdges ?? [],
      },
    };

    if (thisId) {
      updateLifeCycleModel({ ...newData, id: id }).then((result: any) => {
        if (result.data) {
          message.success(
            <FormattedMessage id="pages.flows.savesuccess" defaultMessage="Save successfully!" />,
          );
          saveCallback();
        }
        else {
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
            <FormattedMessage
              id="pages.flows.createsuccess"
              defaultMessage="Created successfully!"
            />,
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
        const fromData = genLifeCycleModelInfoFromData(result.data?.json?.lifeCycleModelDataSet ?? {});
        setInfoData(fromData);
        const model = genLifeCycleModelData(result.data?.json_tg ?? {}, lang);
        let initNodes = model?.nodes ?? [];
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
              return { ...edge, target: targetRest };
            }
            return edge;
          }) ?? [];
        modelData({
          nodes: initNodes,
          edges: initEdges,
        });
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
      setInfoData(newData);
    }
  }, [drawerVisible]);

  return (
    <Space direction="vertical" size={'middle'}>
      {readonly ? (
        <ModelToolbarViewInfo data={infoData} />
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
        nodes={nodes}
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
              <FormattedMessage
                id="pages.button.model.delete"
                defaultMessage="Delete element"
              />
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
            title={
              <FormattedMessage
                id="pages.button.model.save"
                defaultMessage="Save data"
              />
            }
            placement="left"
          >
            <Button type="primary" size="small" icon={<SaveOutlined />} style={{ boxShadow: 'none' }} onClick={saveData} />
          </Tooltip>
        </>
      )}
      <Control
        items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']}
      />
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default Toolbar;
