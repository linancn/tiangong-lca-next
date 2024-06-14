import { getFlowpropertiesDetail } from '@/services/flowproperties/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowpropertiesDelete from './delete';
import FlowpropertiesEdit from './edit';

type Props = {
  id: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowpropertiesView: FC<Props> = ({ id, dataSource, actionRef }) => {
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();

  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );

    getFlowpropertiesDetail(id).then(async (result: any) => {
      setViewDescriptions(
        <>
          <p>
            <br /> Name
          </p>
          <Descriptions bordered size={'small'} column={1}>
            {result.data['common:name'].map((name: any, index: number) => (
              <Descriptions.Item
                key={index}
                label={name['@xml:lang']}
                labelStyle={{ width: '100px' }}
              >
                {name['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
          </Descriptions>

          <p>
            <br />
            Classification
          </p>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="Level 1" labelStyle={{ width: '100px' }}>
              {result.data['common:class']['@level_0'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 2" labelStyle={{ width: '100px' }}>
              {result.data['common:class']['@level_1'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Level 3" labelStyle={{ width: '100px' }}>
              {result.data['common:class']['@level_2'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <p>
            <br />
            General Comment
          </p>
          <Descriptions bordered size={'small'} column={1}>
            {result.data['common:generalComment'].map((generalComment: any, index: number) => (
              <Descriptions.Item
                key={index}
                label={generalComment['@xml:lang']}
                labelStyle={{ width: '100px' }}
              >
                {generalComment['#text'] ?? '-'}
              </Descriptions.Item>
            ))}
          </Descriptions>
          <p>
            <br />
          </p>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
              {result.data.id ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="version" labelStyle={{ width: '100px' }}>
              {result.data['common:dataSetVersion'] ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item key={0} label="Created At" labelStyle={{ width: '100px' }}>
              {result.data.createdAt ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </>,
      );
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            <FlowpropertiesDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            <FlowpropertiesEdit
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
          </>,
        );
      } else {
        setFooterButtons(<></>);
      }
    });
  };
  return (
    <>
      <Tooltip title={<FormattedMessage id="options.view" defaultMessage="View" />}>
        <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.view" defaultMessage="View" />}
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            {footerButtons}
          </Space>
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {viewDescriptions}
      </Drawer>
    </>
  );
};

export default FlowpropertiesView;
