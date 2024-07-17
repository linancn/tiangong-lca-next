import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { FlowEditor, FlowEditorProvider, FlowPanel } from '@ant-design/pro-flow';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Drawer, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import { StringRender } from './node';
import Toolbar from './toolbar';

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
  const [spinning, setSpinning] = useState(false);

  // const { Sider, Content } = Layout;

  const onSpin = (spin: boolean) => {
    setSpinning(spin);
  };

  const onEdit = () => {
    setDrawerVisible(true);
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
        <FlowEditorProvider>
          <FlowEditor nodeTypes={{ StringNode: StringRender }}>
            <FlowPanel position="top-right">
              <Toolbar id={''} onSpin={onSpin} />
            </FlowPanel>
          </FlowEditor>
        </FlowEditorProvider>
        {/* </Spin> */}
        <Spin spinning={spinning} fullscreen />
      </Drawer>
    </>
  );
};

export default ModelFlowEdit;
