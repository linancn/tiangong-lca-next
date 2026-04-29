import X6GraphComponent from '@/components/X6Graph';
import { GraphProvider } from '@/contexts/graphContext';
import { AppstoreOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Drawer, Layout, theme, Tooltip } from 'antd';
import type { ButtonType } from 'antd/es/button';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import { lifeCycleModelConnectionOptions } from './graphConnectionOptions';
import ToolbarView from './toolbar/viewIndex';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  buttonTypeProp?: ButtonType;
  disabled?: boolean;
  autoOpen?: boolean;
  onDrawerClose?: () => void;
};
const LifeCycleModelView: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  buttonTypeProp = 'default',
  disabled = false,
  autoOpen = false,
  onDrawerClose,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { token } = theme.useToken();

  const { Sider, Content } = Layout;

  const onView = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    onDrawerClose?.();
  }, [onDrawerClose]);

  useEffect(() => {
    if (autoOpen && id && version) {
      onView();
    }
  }, [autoOpen, id, onView, version]);

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
      {!autoOpen && buttonType === 'toolIcon' ? (
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
      ) : !autoOpen && buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button
            shape='circle'
            type={buttonTypeProp}
            icon={<ProfileOutlined />}
            size='small'
            onClick={onView}
          />
        </Tooltip>
      ) : !autoOpen && buttonType === 'iconModel' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view.model' defaultMessage='View' />}>
          <Button
            disabled={disabled}
            shape='circle'
            type={buttonTypeProp}
            icon={<AppstoreOutlined />}
            size='small'
            onClick={onView}
          />
        </Tooltip>
      ) : !autoOpen ? (
        <Button onClick={onView}>
          <FormattedMessage id='pages.button.view' defaultMessage='View' />
        </Button>
      ) : null}
      <Drawer
        destroyOnHidden
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.flow.model.drawer.title.view' defaultMessage='View Model' />
        }
        width='100%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer} />}
        maskClosable={true}
        open={drawerVisible}
        onClose={closeDrawer}
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
                  connectionOptions={lifeCycleModelConnectionOptions}
                  gridOptions={{
                    type: 'dot',
                    color: undefined,
                    thickness: 1,
                    visible: true,
                  }}
                  transformOptions={{
                    resizing: {
                      enabled: true,
                      orthogonal: false,
                    },
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
