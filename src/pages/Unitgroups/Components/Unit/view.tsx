import { toSuperscript } from '@/components/AlignedNumber';
import LangTextItemDescription from '@/components/LangTextItem/description';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
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
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View' />}>
          <Button shape='circle' icon={<ProfileOutlined />} size='small' onClick={onView} />
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
            id='pages.unitgroup.unit.drawer.title.view'
            defaultMessage='View Unit'
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
        {/* <Spin spinning={spinning}> */}
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.unitgroup.name' defaultMessage='Name of unit group' />
            }
            styles={{ label: { width: '160px' } }}
          >
            {toSuperscript(viewData.name ?? '-')}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.unitgroup.generalComment' defaultMessage='General comment' />
        </Divider>
        <LangTextItemDescription data={viewData.generalComment} />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.meanValue'
                defaultMessage='Mean value (of unit)'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {viewData.meanValue ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.quantitativeReference'
                defaultMessage='Quantitative reference'
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {<QuantitativeReferenceIcon value={viewData.quantitativeReference} />}
          </Descriptions.Item>
        </Descriptions>
        <br />
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default UnitView;
