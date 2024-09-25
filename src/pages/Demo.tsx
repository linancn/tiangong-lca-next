import { removeFile } from '@/services/supabase/storage';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Image, theme } from 'antd';
import React from 'react';
import {
  hybrid_search,
  jsonSelectTest,
  pgroonga_search,
  returnUserEdgeFunction,
  storage,
} from '../services/demo/api';
import CPCClassification_zh from '../services/flows/classification/CPCClassification_zh-CN.json';

const Demo: React.FC = () => {
  const { token } = theme.useToken();
  const [imageUrl, setImageUrl] = React.useState<string>('');

  return (
    <PageContainer>
      <Card
        style={{
          borderRadius: 8,
        }}
      >
        <div
          style={{
            backgroundPosition: '100% -30%',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '274px auto',
            backgroundImage:
              "url('https://gw.alipayobjects.com/mdn/rms_a9745b/afts/img/A*BuFmQqsB2iAAAAAAAAAAAAAAARQnAQ')",
          }}
        >
          <div
            style={{
              fontSize: '20px',
              color: token.colorTextHeading,
            }}
          >
            欢迎使用 Ant Design Pro
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <Image width={100} src={imageUrl} />
            <Button onClick={() => pgroonga_search()}>pgroonga_search</Button>
            <Button onClick={() => hybrid_search()}>hybrid_search</Button>

            <Button onClick={() => returnUserEdgeFunction()}>returnUserEdgeFunction</Button>
            <Button onClick={() => jsonSelectTest()}>jsonSelectTest</Button>
            <Button onClick={async () => setImageUrl(await storage())}>storage</Button>
            <Button onClick={async () => removeFile(['b81d4445-3c9f-44cb-ab02-fa52478eeea2.png'])}>
              storage.remove
            </Button>
            <Button onClick={() => console.log(CPCClassification_zh)}>CPCClassification_zh</Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Demo;
