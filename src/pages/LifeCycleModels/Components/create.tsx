import ToolBarButton from '@/components/ToolBarButton';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Grid, Transform, XFlow, XFlowGraph } from '@antv/xflow';
import { Button, Drawer, Layout, theme, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import ToolbarEdit from './toolbar/editIndex';

type Props = {
  buttonType: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
  importData?: any;
  onClose?: () => void;
};

// When type is 'copy' or 'createVersion', id and version are required parameters
type CreateProps =
  | (Omit<Props, 'type'> & { actionType?: 'create' })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'copy';
      id: string;
      version: string;
    })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'createVersion';
      id: string;
      version: string;
    });

const LifeCycleModelCreate: FC<CreateProps> = ({
  buttonType,
  lang,
  actionRef,
  actionType,
  id,
  version,
  importData,
  onClose = () => {},
}) => {
  const [isSave, setIsSave] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [toolEditAction, setToolEditAction] = useState('create');

  useEffect(() => {
    if (importData && importData.length > 0 && !drawerVisible) {
      setDrawerVisible(true);
    }
  }, [importData]);

  useEffect(() => {
    if (drawerVisible) {
      setToolEditAction('create');
    } else {
      setToolEditAction('');
    }
  }, [drawerVisible]);

  const { token } = theme.useToken();

  const { Sider, Content } = Layout;

  const onCreate = () => {
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

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={
            <FormattedMessage
              id={
                actionType === 'copy'
                  ? 'pages.button.copy'
                  : actionType === 'createVersion'
                    ? 'pages.button.createVersion'
                    : 'pages.button.create'
              }
              defaultMessage='Create'
            />
          }
        >
          {actionType === 'copy' ? (
            <Button shape='circle' icon={<CopyOutlined />} size='small' onClick={onCreate}></Button>
          ) : (
            <ToolBarButton
              icon={<PlusOutlined />}
              tooltip={<FormattedMessage id='pages.button.create' defaultMessage='Create' />}
              onClick={onCreate}
            />
          )}
        </Tooltip>
      ) : (
        <Button onClick={onCreate}>
          <FormattedMessage id='pages.button.create' defaultMessage='Create' />
        </Button>
      )}
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id={
              actionType === 'copy'
                ? 'pages.flow.model.drawer.title.copy'
                : actionType === 'createVersion'
                  ? 'pages.flow.model.drawer.title.createVersion'
                  : 'pages.lifeCycleModel.drawer.title.create'
            }
            defaultMessage='Create Model'
          />
        }
        width='100%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              if (isSave) reload();
              setDrawerVisible(false);
            }}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          if (isSave) reload();
          setDrawerVisible(false);
        }}
      >
        <XFlow>
          <Layout style={layoutStyle}>
            <Layout>
              <Content>
                <XFlowGraph
                  selectOptions={
                    {
                      enabled: false,
                    } as any
                  }
                  zoomable
                  pannable
                  minScale={0.5}
                  connectionOptions={{
                    snap: true,
                    allowBlank: false,
                    allowLoop: false,
                    allowMulti: 'withPort',
                    allowNode: false,
                    allowEdge: false,
                    router: {
                      name: 'manhattan',
                    },
                    connector: {
                      name: 'rounded',
                    },
                  }}
                />
                <Grid
                  type='dot'
                  options={{
                    color: '#595959',
                    thickness: 1,
                  }}
                />
                <Transform resizing rotating />
              </Content>
            </Layout>
            <Sider width='50px' style={siderStyle}>
              <ToolbarEdit
                actionType={actionType}
                id={id ?? ''}
                version={version ?? ''}
                lang={lang}
                drawerVisible={drawerVisible}
                isSave={isSave}
                setIsSave={setIsSave}
                action={toolEditAction}
                importData={importData}
                onClose={onClose}
              />
            </Sider>
          </Layout>
        </XFlow>
      </Drawer>
    </>
  );
};

export default LifeCycleModelCreate;
