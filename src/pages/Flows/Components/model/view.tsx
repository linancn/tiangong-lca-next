import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Background, Control, Grid, XFlow, XFlowGraph } from '@antv/xflow';
import { Button, Drawer, Layout, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import Toolbar from './toolbar';

type Props = {
  id: string;
  flowId: string;
  buttonType: string;
  lang: string;
};
const FlowModelView: FC<Props> = ({ id, flowId, buttonType, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { Sider, Content } = Layout;

  const onView = () => {
    setDrawerVisible(true);
  };

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
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="pages.button.view" defaultMessage="View" />
        </Button>
      )}
      <Drawer
        title={
          <FormattedMessage id="pages.flow.model.drawer.title.view" defaultMessage="View Model" />
        }
        width="100%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
      >
        <XFlow>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <XFlowGraph zoomable pannable minScale={0.5} readonly={true} />
                <Background color="#f5f5f5" />
                <Grid
                  type="dot"
                  options={{
                    color: '#595959',
                    thickness: 1,
                  }}
                />
              </Content>
            </Layout>
            <Sider width="50px" style={siderStyle}>
              <Toolbar
                id={id}
                flowId={flowId}
                lang={lang}
                drawerVisible={drawerVisible}
                isSave={true}
                setIsSave={() => {}}
                readonly={true}
              />
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

export default FlowModelView;
