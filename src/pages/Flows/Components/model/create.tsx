import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Background, Control, Grid, Snapline, Transform, XFlow, XFlowGraph } from '@antv/xflow';
import { Button, Drawer, Layout, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import Toolbar from './toolbar';

type Props = {
  id: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowModelCreate: FC<Props> = ({ id, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { Sider, Content } = Layout;

  const siderStyle: React.CSSProperties = {
    paddingTop: 8,
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
  };

  const layoutStyle = {
    borderRadius: 8,
    overflow: 'hidden',
    width: 'calc(100%)',
    minWidth: 'calc(100%)',
    maxWidth: 'calc(100%)',
    height: 'calc(100%)',
    minHeight: 'calc(100%)',
    maxHeight: 'calc(100%)',
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.flow.model.drawer.title.edit" defaultMessage="Edit Model" />
        }
        width="100%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <XFlow>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <XFlowGraph zoomable pannable minScale={0.5} />
                <Background color="#f5f5f5" />
                <Grid
                  type="dot"
                  options={{
                    color: '#595959',
                    thickness: 1,
                  }}
                />
                <Snapline />
                <Transform resizing rotating />
              </Content>
            </Layout>
            <Sider width="50px" style={siderStyle}>
              <Toolbar id={''} flowId={id} lang={lang} onSpin={() => {}} option={''} />
            </Sider>
            <div style={{ position: 'absolute', right: 80, bottom: 30 }}>
              <Control
                items={['zoomOut', 'zoomTo', 'zoomIn', 'zoomToFit', 'zoomToOrigin']}
                direction={'horizontal'}
              />
            </div>
          </Layout>
        </XFlow>
      </Drawer>
    </>
  );
};

export default FlowModelCreate;
