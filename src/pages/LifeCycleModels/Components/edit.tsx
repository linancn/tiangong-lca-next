import X6GraphComponent from '@/components/X6Graph';
import { GraphProvider } from '@/contexts/graphContext';
import type { refDataType } from '@/pages/Utils/review';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Drawer, Layout, theme, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import ToolbarEdit from './toolbar/editIndex';

type Props = {
  id: string | undefined;
  version: string | undefined;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  disabled?: boolean;
  hideReviewButton?: boolean;
  updateNodeCb?: (ref: refDataType) => Promise<void>;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
  onDrawerClose?: () => void;
};
const LifeCycleModelEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  disabled = false,
  hideReviewButton = false,
  updateNodeCb,
  autoOpen = false,
  autoCheckRequired = false,
  onDrawerClose,
}) => {
  const [isSave, setIsSave] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { token } = theme.useToken();

  const { Sider, Content } = Layout;

  const onEdit = () => {
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
    actionRef?.current?.reload();
  }, [actionRef]);

  useEffect(() => {
    if (autoOpen && id && version) {
      setDrawerVisible(true);
    }
  }, [autoOpen, id, version]);

  const closeDrawer = useCallback(() => {
    if (isSave) reload();
    setDrawerVisible(false);
    onDrawerClose?.();
  }, [isSave, onDrawerClose, reload]);

  return (
    <>
      {!autoOpen &&
        (buttonType === 'toolIcon' ? (
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
              icon={<FormOutlined />}
              onClick={onEdit}
              disabled={disabled}
            />
          </Tooltip>
        ) : buttonType === 'icon' ? (
          <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
            <Button
              disabled={disabled}
              shape='circle'
              icon={<FormOutlined />}
              size='small'
              onClick={onEdit}
            />
          </Tooltip>
        ) : (
          <Button disabled={disabled} onClick={onEdit}>
            <FormattedMessage
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            />
          </Button>
        ))}
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id={'pages.flow.model.drawer.title.edit'}
            defaultMessage={'Edit Model'}
          />
        }
        width='100%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer} />}
        maskClosable={false}
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
                  gridOptions={{
                    type: 'dot',
                    color: '#595959',
                    thickness: 1,
                    visible: true,
                  }}
                  transformOptions={{
                    resizing: true,
                    rotating: true,
                  }}
                />
              </Content>
            </Layout>
            <Sider width='50px' style={siderStyle}>
              <ToolbarEdit
                id={id ?? ''}
                version={version ?? ''}
                lang={lang}
                drawerVisible={drawerVisible}
                autoCheckRequired={autoCheckRequired}
                isSave={isSave}
                setIsSave={setIsSave}
                action={'edit'}
                hideReviewButton={hideReviewButton}
                updateNodeCb={updateNodeCb}
              />
            </Sider>
          </Layout>
        </GraphProvider>
      </Drawer>
    </>
  );
};

export default LifeCycleModelEdit;
