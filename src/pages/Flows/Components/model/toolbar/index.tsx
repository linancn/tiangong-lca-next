import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { createProduct } from '@/services/products/api';
import { SaveOutlined } from '@ant-design/icons';
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
  lang: string;
  onSpin: (spin: boolean) => void;
};

const Toolbar: FC<Props> = ({ id, lang }) => {
  const [spinning, setSpinning] = useState(false);
  const [infoData, setInfoData] = useState<any>({});
  const initData = useGraphStore((state) => state.initData);
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
    const result = await createProduct(id, newData);
    if (result.data) {
      message.success(
        <FormattedMessage id="pages.flows.createdSuccessfully!" defaultMessage="Created Successfully!" />,
      );
      setSpinning(false);
    } else {
      message.error(result.error.message);
    }
    return true;
  };

  useGraphEvent('node:mouseenter', (evt) => {
    console.log('node:mouseenter', evt);
  });

  useEffect(() => {
    initData({
      nodes: [],
      edges: [],
    });
  }, []);

  return (
    <Space direction="vertical" size={'middle'}>
      <ModelToolbarInfo data={infoData} onData={updateInfoData} />
      <ModelToolbarAdd buttonType={'icon'} lang={lang} onData={addProcessNode} />
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
