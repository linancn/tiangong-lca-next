import ProcessView from '@/pages/Processes/Components/view';
import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { createProduct, getProductDetail, updateProduct } from '@/services/products/api';
import { genProductInfoFromData, genProductModelFromData } from '@/services/products/util';
import {
  DeleteOutlined,
  FormatPainterOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useGraphStore } from '@antv/xflow';
import { Button, message, Space, Spin, Tooltip } from 'antd';
import { FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import { node } from '../Config/node';
import ModelToolbarAdd from './add';
import EdgeExhange from './Exchange';
import ModelToolbarInfo from './info';

type Props = {
  id: string;
  flowId: string;
  lang: string;
  option: string;
  drawerVisible: boolean;
  isSave: boolean;
  setIsSave: (isSave: boolean) => void;
};

const Toolbar: FC<Props> = ({ id, flowId, lang, option, drawerVisible, isSave, setIsSave }) => {
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
  };

  const updateEdgeData = (data: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, shape, ...newEdge } = data;
    if (newEdge.target) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { x, y, ...newTarget } = newEdge.target as any;
      updateEdge(id, { ...newEdge, target: newTarget });
    }
    else {
      updateEdge(id, { ...newEdge });
    }
  }

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
            label:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name
                ?.baseName,
            generalComment:
              result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.[
              'common:generalComment'
              ],
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
        const selectedEdges = edges.filter((edge) => (edge.source as any)?.cell === node.id || (edge.target as any)?.cell === node.id);
        await removeEdges(selectedEdges.map((e) => e.id ?? ''));
        await removeNodes([node.id ?? '']);
      });
    }
    else {
      const selectedEdges = edges.filter((edge) => edge.selected);
      if (selectedEdges.length > 0) {
        removeEdges(selectedEdges.map((e) => e.id ?? ''));
      }
    }
  }

  const saveData = async () => {
    setSpinning(true);

    const newEdges = edges.map(edge => {
      if (edge.target) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { x, y, ...targetRest } = edge.target as any;
        return { ...edge, target: targetRest };
      }
      return edge;
    });

    const newData = {
      productInformation: infoData?.productInformation ?? {},
      model: {
        nodes: nodes ?? [],
        edges: newEdges ?? [],
      },
    };
    let result: any = {};
    if (option === 'edit') {
      result = await updateProduct({ ...newData, id: id });
      if (result.data) {
      }
      message.success(
        <FormattedMessage id="pages.flows.savesuccess" defaultMessage="Save Successfully!" />,
      );
      saveCallback();
      setSpinning(false);
    } else {
      result = await createProduct(flowId, newData);
      if (result.data) {
        message.success(
          <FormattedMessage
            id="pages.flows.createsuccess"
            defaultMessage="Created Successfully!"
          />,
        );
        saveCallback();
        setSpinning(false);
      } else {
        message.error(result.error.message);
      }
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
    setIsSave(false);
    setSpinning(true);
    if (option === 'edit') {
      getProductDetail(id).then(async (result: any) => {
        setInfoData({ ...genProductInfoFromData(result.data?.json?.productDataSet ?? {}) });
        const model = genProductModelFromData(result.data?.json?.productDataSet ?? {}, lang);
        const newEdges = model?.edges?.map((edge: any) => {
          if (edge.target) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { x, y, ...targetRest } = edge.target as any;
            return { ...edge, target: targetRest };
          }
          return edge;
        }) ?? [];
        modelData({
          nodes: model.nodes ?? [],
          edges: newEdges ?? [],
        });
        setSpinning(false);
      });
    } else {
      setInfoData({});
      modelData({ nodes: [], edges: [] });
      setSpinning(false);
    }
  }, [drawerVisible]);

  return (
    <Space direction="vertical" size={'middle'}>
      <ModelToolbarInfo data={infoData} onData={updateInfoData} />
      <ModelToolbarAdd buttonType={'icon'} lang={lang} onData={addProcessNode} />
      <ProcessView id={nodes.filter((node) => node.selected)?.[0]?.data?.id ?? ''} dataSource={'tg'} buttonType={'toolIcon'} lang={lang} disabled={nodes.filter((node) => node.selected).length === 0} />
      <EdgeExhange lang={lang} disabled={edges.filter((edge) => edge.selected).length === 0} edge={edges.filter((edge) => edge.selected)?.[0]} nodes={nodes} onData={updateEdgeData} />
      <Tooltip
        title={
          <FormattedMessage
            id="pages.button.model.design"
            defaultMessage="Design Appearance"
          ></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<FormatPainterOutlined />} disabled={(nodes.filter((node) => node.selected).length === 0 && edges.filter((edge) => edge.selected).length === 0)} />
      </Tooltip>
      <Tooltip
        title={
          <FormattedMessage
            id="pages.button.model.delete"
            defaultMessage="Delete Element"
          ></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<DeleteOutlined />} disabled={(nodes.filter((node) => node.selected).length === 0 && edges.filter((edge) => edge.selected).length === 0)} onClick={deleteCell} />
      </Tooltip>
      <br />

      <Tooltip
        title={
          <FormattedMessage
            id="pages.button.model.save"
            defaultMessage="Save Data"
          ></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<SaveOutlined />} onClick={saveData} />
      </Tooltip>
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default Toolbar;
