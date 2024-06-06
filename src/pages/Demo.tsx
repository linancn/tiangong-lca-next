import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, theme } from 'antd';
import React from 'react';
import { flowHybridSearch, jsonSelectTest, returnUserEdgeFunction } from '../services/demo/api';

const Demo: React.FC = () => {
  const { token } = theme.useToken();
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
            <Button onClick={() => flowHybridSearch('猪肉')}>flowHybridSearch</Button>
            <Button onClick={() => returnUserEdgeFunction()}>returnUserEdgeFunction</Button>
            <Button onClick={() => jsonSelectTest()}>jsonSelectTest</Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Demo;
