import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { createProduct, getProductDetail, updateProduct } from '@/services/products/api';
import { genProductInfoFromData, genProductModelFromData } from '@/services/products/util';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  FormatPainterOutlined,
  ProfileOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
import { Button, message, Space, Spin, Tooltip } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import { node } from '../config/node';
import ModelToolbarAdd from './add';
import ModelToolbarInfo from './info';

type Props = {
  id: string;
  flowId: string;
  lang: string;
  option: string;
  onSpin: (spin: boolean) => void;
};

const Toolbar: FC<Props> = ({ id, flowId, lang, option }) => {
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});
  const modelData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const updateInfoData = (data: any) => {
    setInfoData(data);
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

  const saveData = async () => {
    setSpinning(true);
    const newData = {
      productInformation: infoData?.productInformation ?? {},
      model: {
        nodes: nodes ?? [],
        edges: edges ?? [],
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
        setSpinning(false);
      } else {
        message.error(result.error.message);
      }
    }
    return true;
  };

  useGraphEvent('node:dblclick', (evt) => {
    console.log('node:dblclick', evt);
  });

  useGraphEvent('edge:dblclick', (evt) => {
    console.log('edge:dblclick', evt);
  });

  useEffect(() => {
    if (option === 'edit') {
      getProductDetail(id).then(async (result: any) => {
        setInfoData({ ...genProductInfoFromData(result.data?.json?.productDataSet ?? {}) });
        const model = genProductModelFromData(result.data?.json?.productDataSet ?? {}, lang);
        modelData({
          nodes: model.nodes ?? [],
          edges: model.edges ?? [],
        });
      });
    } else {
      setInfoData({});
      modelData({ nodes: [], edges: [] });
    }
  }, []);

  return (
    <Space direction="vertical" size={'middle'}>
      <ModelToolbarInfo data={infoData} onData={updateInfoData} />
      <ModelToolbarAdd buttonType={'icon'} lang={lang} onData={addProcessNode} />
      <Tooltip
        title={
          <FormattedMessage id="pages.button.process" defaultMessage="Process"></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<ProfileOutlined />} />
      </Tooltip>
      <Tooltip
        title={
          <FormattedMessage id="pages.button.exchange" defaultMessage="Exchange"></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<ArrowRightOutlined />} />
      </Tooltip>
      <Tooltip
        title={
          <FormattedMessage id="pages.button.design" defaultMessage="Design"></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<FormatPainterOutlined />} />
      </Tooltip>
      <Tooltip
        title={
          <FormattedMessage id="pages.button.delete" defaultMessage="Delete"></FormattedMessage>
        }
        placement="left"
      >
        <Button shape="circle" size="small" icon={<DeleteOutlined />} />
      </Tooltip>
      <br />

      <Tooltip
        title={<FormattedMessage id="pages.button.save" defaultMessage="Save"></FormattedMessage>}
        placement="left"
      >
        <Button shape="circle" size="small" icon={<SaveOutlined />} onClick={saveData} />
      </Tooltip>
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default Toolbar;
