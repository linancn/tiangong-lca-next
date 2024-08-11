import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Background, Control, Grid, Transform, XFlow, XFlowGraph } from '@antv/xflow';
import { Button, Drawer, Layout, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage } from 'umi';
import Toolbar from './toolbar';

type Props = {
  id: string;
  flowId: string;
  buttonType: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowModelEdit: FC<Props> = ({ id, flowId, buttonType, lang, actionRef }) => {
  const [isSave, setIsSave] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { Sider, Content } = Layout;

  const onEdit = () => {
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

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  // useEffect(() => {
  //   register({
  //     shape: 'my-rect',
  //     effect: ['data'],
  //     component: NodeComponent,
  //   });
  // }, []);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
        </Button>
      )}
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
            onClick={() => {
              if (isSave)
                reload();
              setDrawerVisible(false)
            }}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => {
          if (isSave)
            reload();
          setDrawerVisible(false);
        }
        }
      >
        <XFlow>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <XFlowGraph zoomable pannable minScale={0.5}
                  connectionOptions={{
                    snap: true,
                    allowBlank: false,
                    allowLoop: false,
                    allowMulti: false,
                    allowNode: false,
                    allowEdge: false,
                  }}
                />
                <Background color="#f5f5f5" />
                <Grid
                  type="dot"
                  options={{
                    color: '#595959',
                    thickness: 1,
                  }}
                />
                <Transform resizing rotating />
              </Content>
            </Layout>
            <Sider width="50px" style={siderStyle}>
              <Toolbar id={id} flowId={flowId} lang={lang} option={'edit'} drawerVisible={drawerVisible} isSave={isSave} setIsSave={setIsSave} />
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

export default FlowModelEdit;
