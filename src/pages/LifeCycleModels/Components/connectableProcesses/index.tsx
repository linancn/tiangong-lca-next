import { CloseOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import { Button, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id?: string;
  version?: string;
  lang?: string;
  buttonType?: string;
};

const ConnectableProcesses: FC<Props> = ({ id, version, lang, buttonType = 'icon' }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const onView = () => {
    setDrawerVisible(true);
    console.log('ConnectableProcesses clicked:', { id, version, lang });
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button shape='circle' icon={<DeploymentUnitOutlined />} size='small' onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='pages.button.view' defaultMessage='View' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.connectableProcesses.drawer.title.view'
            defaultMessage='View Connectable Processes'
          />
        }
        width='90%'
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
        {/* Drawer 内容暂时为空，后续可以添加具体内容 */}
      </Drawer>
    </>
  );
};

export default ConnectableProcesses;
