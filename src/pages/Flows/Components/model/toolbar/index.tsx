import { getLangText } from '@/services/general/util';
import { getProcessDetail } from '@/services/processes/api';
import { useFlowEditor } from '@ant-design/pro-flow';
import { Space } from 'antd';
import { FC } from 'react';
import Add from './add';


type Props = {
  id: string;
  lang: string;
  onSpin: (spin: boolean) => void;
};

const Toolbar: FC<Props> = ({ onSpin }) => {
  const editor = useFlowEditor();

  const addProcessNode = (id: any) => {
    onSpin(true);
    getProcessDetail(id).then(async (result) => {
      console.log(result);
      editor.addNode({
        id: `${id}`,
        type: 'StringNode',
        position: { x: 200, y: 100 },
        data: {
          title: getLangText(result?.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName ?? {}, lang),
          handles: {
            source: 'a1-source',
            target: 'a1-target',
          },
          titleLang:[
            {
              lang: 'en',
              title: 'String Node'
            },
            {
              lang: 'zh',
              title: '字符串节点'
            }
          ]
        },
      });
      
      console.log(editor.getFlattenNodes());
      console.log(editor.getFlattenEdges());
      onSpin(false);
    });
  };

  return (
    <Space direction="vertical">
      <Add buttonType={'icon'} lang={''} onData={addProcessNode} />
    </Space>
  );
};

export default Toolbar;
