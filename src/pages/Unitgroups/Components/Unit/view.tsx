import { toSuperscript } from '@/components/AlignedNumber';
import LangTextItemDescription from '@/components/LangTextItem/description';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { UnitItem } from '@/services/unitgroups/data';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: UnitItem[];
  buttonType: string;
};
const UnitView: FC<Props> = ({ id, data, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [viewData, setViewData] = useState<UnitItem>({ '@dataSetInternalID': '' });
  // const [spinning, setSpinning] = useState(false);

  const onView = () => {
    setDrawerVisible(true);
    const filteredData = data?.find((item) => item['@dataSetInternalID'] === id) ?? {};
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
        size='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        mask={{ closable: true }}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {/* <Spin spinning={spinning}> */}
        <Descriptions
          bordered
          size={'small'}
          column={1}
          items={[
            {
              key: 0,
              label: (
                <FormattedMessage id='pages.unitgroup.name' defaultMessage='Name of unit group' />
              ),
              styles: {
                label: {
                  width: '160px',
                },
              },
              children: toSuperscript(viewData.name ?? '-'),
            },
          ]}
        />
        <br />
        <Divider titlePlacement='start' styles={{ content: { margin: 0 } }} plain>
          <FormattedMessage id='pages.unitgroup.generalComment' defaultMessage='General comment' />
        </Divider>
        <LangTextItemDescription data={viewData.generalComment} />
        <br />
        <Descriptions
          bordered
          size={'small'}
          column={1}
          items={[
            {
              key: 0,
              label: (
                <FormattedMessage
                  id='pages.unitgroup.meanValue'
                  defaultMessage='Mean value (of unit)'
                />
              ),
              styles: {
                label: {
                  width: '180px',
                },
              },
              children: viewData.meanValue ?? '-',
            },
          ]}
        />
        <br />
        <Descriptions
          bordered
          size={'small'}
          column={1}
          items={[
            {
              key: 0,
              label: (
                <FormattedMessage
                  id='pages.unitgroup.quantitativeReference'
                  defaultMessage='Quantitative reference'
                />
              ),
              styles: {
                label: {
                  width: '180px',
                },
              },
              children: (
                <QuantitativeReferenceIcon value={Boolean(viewData.quantitativeReference)} />
              ),
            },
          ]}
        />
        <br />
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default UnitView;
