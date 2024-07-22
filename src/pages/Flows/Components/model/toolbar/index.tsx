import { Space } from 'antd';
import { FC } from 'react';

type Props = {
  id: string;
  lang: string;
  onSpin: (spin: boolean) => void;
};

const Toolbar: FC<Props> = ({  }) => {
  // const editor = useFlowEditor();

  // const addProcessNode = (id: any) => {
  //   onSpin(true);
  //   getProcessDetail(id).then(async (result) => {
  //     console.log(result);
  //     editor.addNode({
  //       id: `${id}`,
  //       type: 'ResizableNode',
  //       position: { x: 200, y: 100 },
  //       data: {
  //         title: getLangText(result?.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName ?? {}, lang),
  //         handles: {
  //           source: 'a1-source',
  //           target: 'a1-target',
  //         },
  //         titleLang: result?.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName ?? {}
  //       },
  //     });

  //     console.log(editor.getFlattenNodes());
  //     console.log(editor.getFlattenEdges());
  //     onSpin(false);
  //   });
  // };

  return (
    <Space direction="vertical">
      {/* <Add buttonType={'icon'} lang={''} onData={addProcessNode} /> */}
    </Space>
  );
};

export default Toolbar;
