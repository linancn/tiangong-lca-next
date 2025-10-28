import X6GraphComponent from '@/components/X6Graph';
import { GraphProvider } from '@/contexts/graphContext';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Drawer, Layout, theme, Tooltip } from 'antd';
import type { ButtonType } from 'antd/es/button';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import ToolbarView from './toolbar/viewIndex';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  buttonTypeProp?: ButtonType;
  disabled?: boolean;
};
const LifeCycleModelView: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  buttonTypeProp = 'default',
  disabled = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { token } = theme.useToken();

  const { Sider, Content } = Layout;

  const onView = () => {
    setDrawerVisible(true);
  };

  const siderStyle: React.CSSProperties = {
    paddingTop: 8,
    textAlign: 'center',
    backgroundColor: token.colorBgBase,
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
      {buttonType === 'toolIcon' ? (
        <Tooltip
          title={
            <FormattedMessage
              id='pages.button.model.lifecyclemodel'
              defaultMessage='Lifecycle model infomation'
            ></FormattedMessage>
          }
          placement='left'
        >
          <Button
            type='primary'
            size='small'
            style={{ boxShadow: 'none' }}
            icon={<ProfileOutlined />}
            onClick={onView}
            disabled={disabled}
          />
        </Tooltip>
      ) : buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button
            shape='circle'
            type={buttonTypeProp}
            icon={<ProfileOutlined />}
            size='small'
            onClick={onView}
          />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='pages.button.view' defaultMessage='View' />
        </Button>
      )}
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.flow.model.drawer.title.view' defaultMessage='View Model' />
        }
        width='100%'
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
        <GraphProvider>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <X6GraphComponent
                  selectOptions={{
                    enabled: true,
                  }}
                  zoomable
                  pannable
                  minScale={0.5}
                  connectionOptions={{
                    router: {
                      name: 'manhattan',
                    },
                    connector: {
                      name: 'rounded',
                    },
                  }}
                  gridOptions={{
                    type: 'dot',
                    color: '#595959',
                    thickness: 1,
                    visible: true,
                  }}
                />
              </Content>
            </Layout>
            <Sider width='50px' style={siderStyle}>
              <ToolbarView
                id={id}
                version={version}
                lang={lang}
                drawerVisible={drawerVisible}
                actionRef={actionRef}
              />
            </Sider>
          </Layout>
        </GraphProvider>
      </Drawer>
    </>
  );
};

export default LifeCycleModelView;
