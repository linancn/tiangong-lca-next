import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Background, Grid, XFlow, XFlowGraph } from '@antv/xflow';
import { Button, Drawer, Layout, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ModelFlowEdit: FC<Props> = ({ buttonType }) => {
  // const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [fromData, setFromData] = useState<any>({});
  // const [initData, setInitData] = useState<any>({});
  // const [spinning, setSpinning] = useState(false);

  const { Sider, Content } = Layout;

  // const onSpin = (spin: boolean) => {
  //   setSpinning(spin);
  // };

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const siderStyle: React.CSSProperties = {
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
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {/* <Spin spinning={spinning}> */}
        <XFlow>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <XFlowGraph zoomable minScale={0.5} />
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
              <Button shape="circle" icon={<FormOutlined />} onClick={onEdit} />
            </Sider>
          </Layout>
        </XFlow>
        {/* </Spin> */}
        {/* <Spin spinning={spinning} fullscreen /> */}
      </Drawer>
    </>
  );
};

export default ModelFlowEdit;
