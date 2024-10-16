import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import EdgeExchangeSelect from './select';
import EdgeExchangeView from './view';

type Props = {
  lang: string;
  disabled: boolean;
  edge: any;
  readonly: boolean;
  onData: (data: any) => void;
};
const EdgeExhange: FC<Props> = ({ lang, disabled, edge, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const onEditEdgeData = (data: any) => {
    const newData = {
      outputExchange: {
        '@flowUUID': data?.selectedSource?.referenceToFlowDataSet?.['@refObjectId'],
        downstreamProcess: {
          '@flowUUID': data?.selectedTarget?.referenceToFlowDataSet?.['@refObjectId'],
        },
      },
    };
    onData({ ...edge, data: { ...edge?.data, connection: newData } });
  };

  const onOpenDrawer = () => {
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
  };

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id="pages.button.model.connection"
            defaultMessage="Connection relation"
          />
        }
        placement="left"
      >
        <Button
          type="primary"
          size="small"
          icon={<ArrowRightOutlined />}
          style={{ boxShadow: 'none' }}
          disabled={disabled}
          onClick={onOpenDrawer}
        />
      </Tooltip>
      <EdgeExchangeSelect
        id={''}
        lang={lang}
        sourceProcessId={edge?.data?.node?.sourceProcessId}
        targetProcessId={edge?.data?.node?.targetProcessId}
        onData={onEditEdgeData}
        sourceRowKeys={[]}
        targetRowKeys={[]}
        optionType={'create'}
        drawerVisible={
          drawerVisible &&
          edge &&
          !(
            edge?.data?.connection?.outputExchange?.['@flowUUID'] &&
            edge?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID']
          )
        }
        onCloseDrawer={onCloseDrawer}
      />
      <EdgeExchangeView
        lang={lang}
        sourceProcessId={edge?.data?.node?.sourceProcessId}
        targetProcessId={edge?.data?.node?.targetProcessId}
        sourceOutputFlowID={edge?.data?.connection?.outputExchange?.['@flowUUID']}
        targetInputFlowID={edge?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID']}
        drawerVisible={
          drawerVisible &&
          edge &&
          edge?.data?.connection?.outputExchange?.['@flowUUID'] &&
          edge?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID']
        }
        onCloseDrawer={onCloseDrawer}
      />
    </>
  );
};

export default EdgeExhange;
