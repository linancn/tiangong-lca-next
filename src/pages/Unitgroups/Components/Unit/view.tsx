import LangTextItemDescription from '@/components/LangTextItem/description';
import { CheckCircleTwoTone, CloseCircleOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: any;
  buttonType: string;
};
const UnitView: FC<Props> = ({ id, data, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [viewData, setViewData] = useState<any>({});
  // const [spinning, setSpinning] = useState(false);

  const onView = () => {
    setDrawerVisible(true);
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setViewData(filteredData);
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.table.option.view" defaultMessage="View" />}
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.table.option.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.unit.drawer.title.view" defaultMessage="View Unit" />
        }
        width="90%"
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
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Name" labelStyle={{ width: '100px' }}>
            {viewData.name ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin="0" orientation="left" plain>
          General Comment
        </Divider>
        <LangTextItemDescription data={viewData.generalComment} />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Mean Value" labelStyle={{ width: '180px' }}>
            {viewData.meanValue ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Quantitative Reference" labelStyle={{ width: '180px' }}>
            {viewData.quantitativeReference ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleOutlined />}
          </Descriptions.Item>
        </Descriptions>
        <br />
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default UnitView;
