import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { useGraphEvent, useGraphStore } from '@antv/xflow';
import { Space, Spin } from 'antd';
import { FC, useEffect, useState } from 'react';
import { node } from '../config/node';
import Add from './add';

type Props = {
  id: string;
  lang: string;
  onSpin: (spin: boolean) => void;
};

const Toolbar: FC<Props> = ({ lang }) => {
  const [spinning, setSpinning] = useState(false);

  const initData = useGraphStore((state) => state.initData);
  const addNodes = useGraphStore((state) => state.addNodes);

  const addProcessNode = (id: any) => {
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      addNodes([
        {
          ...node,
          id: id,
          label: getLangText(result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName, lang),
          data: {
            label: result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName,
            generalComment: result.data?.json?.processDataSet?.processInformation?.dataSetInformation?.['common:generalComment'],
          }
        },
      ]);
      setSpinning(false);
    });
  }

  useGraphEvent('node:mouseenter', (evt) => {
    console.log('node:mouseenter', evt);
  });

  useEffect(() => {
    initData({
      nodes: [],
      edges: [],
    })
  }, [])

  return (
    <Space direction="vertical">
      <Add buttonType={'icon'} lang={lang} onData={addProcessNode} />
      <Spin spinning={spinning} fullscreen />
    </Space>
  );
};

export default Toolbar;
