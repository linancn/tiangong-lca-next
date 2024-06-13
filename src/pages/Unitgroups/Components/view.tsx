import { getUnitGroupDetail } from '@/services/unitgroups/api';
// import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import type { DescriptionsProps } from 'antd';
import { Button, Card, Descriptions, Drawer, Space, Spin, Table, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitGroupDelete from './delete';
// import UnitGroupEdit from './edit';

type Props = {
  id: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactView: FC<Props> = ({ id, dataSource, actionRef }) => {
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

    getUnitGroupDetail(id).then(async (result: any) => {
      const info_name_items: DescriptionsProps['items'] = result.data['common:name'].map(
        (name: any) => {
          return {
            label: name['@xml:lang'],
            children: name['#text'] ?? '-',
          };
        },
      );
      const info_classification_items: DescriptionsProps['items'] = [
        {
          label: 'Level 1',
          children: result.data['common:class']['@level_0'] ?? '-',
        },
        {
          label: 'Level 2',
          children: result.data['common:class']['@level_1'] ?? '-',
        },
        {
          label: 'Level 3',
          children: result.data['common:class']['@level_2'] ?? '-',
        },
      ];
      const info_items: DescriptionsProps['items'] = [
        {
          label: 'ID',
          children: result.data.id ?? '-',
        },
        {
          label: 'Name',
          children: (
            <Descriptions
              items={info_name_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          ),
        },
        {
          label: 'Classification',
          children: (
            <Descriptions
              items={info_classification_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          ),
        },
        {
          label: 'Reference Unit',
          children: result.data.referenceToReferenceUnit ?? '-',
        },
      ];

      const compliance_shortDescription_items: DescriptionsProps['items'] = result.data[
        'compliance:common:shortDescription'
      ].map((name: any) => {
        return {
          label: name['@xml:lang'],
          children: name['#text'] ?? '-',
        };
      });
      const compliance_items: DescriptionsProps['items'] = [
        {
          label: '@refObjectId',
          children: result.data['compliance:common:@refObjectId'] ?? '-',
        },
        {
          label: '@type',
          children: result.data['compliance:common:@type'] ?? '-',
        },
        {
          label: '@uri',
          children: result.data['compliance:common:@uri'] ?? '-',
        },
        {
          label: '@version',
          children: result.data['compliance:common:@version'] ?? '-',
        },
        {
          label: 'Short Description',
          children: (
            <Descriptions
              items={compliance_shortDescription_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          ),
        },
        {
          label: 'Overall Compliance',
          children: result.data['compliance:common:approvalOfOverallCompliance'] ?? '-',
        },
      ];

      const dataEntryBy_shortDescription_items: DescriptionsProps['items'] = result.data[
        'dataEntryBy:common:shortDescription'
      ].map((name: any) => {
        return {
          label: name['@xml:lang'],
          children: name['#text'] ?? '-',
        };
      });
      const dataEntryBy_items: DescriptionsProps['items'] = [
        {
          label: 'TimeStamp',
          children: result.data['dataEntryBy:common:timeStamp'] ?? '-',
        },
        {
          label: '@refObjectId',
          children: result.data['dataEntryBy:common:@refObjectId'] ?? '-',
        },
        {
          label: '@type',
          children: result.data['dataEntryBy:common:@type'] ?? '-',
        },
        {
          label: '@uri',
          children: result.data['dataEntryBy:common:@uri'] ?? '-',
        },
        {
          label: '@version',
          children: result.data['dataEntryBy:common:@version'] ?? '-',
        },
        {
          label: 'Short Description',
          children: (
            <Descriptions
              items={dataEntryBy_shortDescription_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          ),
        },
        {
          label: 'DataSet Version',
          children: result.data['publicationAndOwnership:common:dataSetVersion'] ?? '-',
        },
      ];

      const units_columns = [
        {
          title: 'DataSet Internal ID',
          dataIndex: '@dataSetInternalID',
          key: '@dataSetInternalID',
        },
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
        },
        {
          title: 'Mean Value',
          dataIndex: 'meanValue',
          key: 'meanValue',
        },
      ];

      setViewDescriptions(
        <>
          <Card size="small" title={'UnitGroup Information'}>
            <Descriptions
              items={info_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          </Card>
          <br />
          <Card size="small" title={'Modelling And Validation'}>
            <Descriptions
              items={compliance_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          </Card>
          <br />
          <Card size="small" title={'Administrative Information'}>
            <Descriptions
              items={dataEntryBy_items}
              bordered
              size={'small'}
              column={1}
              labelStyle={{ width: '100px' }}
            ></Descriptions>
          </Card>
          <br />
          <Card size="small" title={'Units'}>
            <Table
              size={'small'}
              dataSource={result.data.unit}
              columns={units_columns}
              pagination={false}
            ></Table>
          </Card>
        </>,
      );
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            <UnitGroupDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            {/* <UnitGroupEdit
                            id={id}
                            buttonType={'text'}
                            actionRef={actionRef}
                            setViewDrawerVisible={setDrawerVisible}
                        /> */}
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

export default ContactView;
