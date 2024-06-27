import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import SourceDescription from '@/components/ReferenceData/description';
import { getUnitGroupDetail } from '@/services/unitgroups/api';
import { ListPagination } from '@/services/general/data';
import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import ProTable from '@ant-design/pro-table';
import type { ProColumns } from '@ant-design/pro-table';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { FormattedMessage } from 'umi';
import UnitGroupDelete from './delete';
import UnitGroupEdit from './edit';

type Props = {
  id: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactView: FC<Props> = ({ id, dataSource, actionRef }) => {
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [contentList, setContentList] = useState<Record<string, React.ReactNode>>({
    unitGroupInformation: <></>,
    modellingAndValidation: <></>,
    administrativeInformation: <></>,
    units: <></>,
  });
  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');

  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index"></FormattedMessage>,
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
      dataIndex: '@dataSetInternalID',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.name" defaultMessage="Name"></FormattedMessage>,
      dataIndex: 'name',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.meanValue" defaultMessage="Mean Value"></FormattedMessage>,
      dataIndex: 'meanValue',
      search: false,
    },
  ];

  const tabList = [
    { key: 'unitGroupInformation', tab: 'UnitGroup Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'units', tab: 'Units' },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const initUnitGroupInformation = (data: any) => {
    let dataSetInformation = data?.dataSetInformation;
    return (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          Name
        </Divider>
        <LangTextItemDescription data={dataSetInformation?.["common:name"]}></LangTextItemDescription>
        <Divider orientationMargin="0" orientation="left" plain>
          Classification
        </Divider>
        <LevelTextItemDescription data={dataSetInformation?.classificationInformation?.['common:classification']?.['common:class']}></LevelTextItemDescription>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Reference To Reference Unit" labelStyle={{ width: '220px' }}>
            {data?.quantitativeReference?.referenceToReferenceUnit ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    );
  };
  const initModellingAndValidation = (data: any) => {
    let referenceToComplianceSystem = data?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem'];
    return (
      <>
        <SourceDescription title='Reference To Compliance System' data={referenceToComplianceSystem}></SourceDescription>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Approval Of Overall Compliance" labelStyle={{ width: '240px' }}>
            {data?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    );
  };
  const initAdministrativeInformation = (data: any) => {
    let referenceToDataSetFormat = data?.dataEntryBy?.['common:referenceToDataSetFormat'];
    return (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="TimeStamp" labelStyle={{ width: '140px' }}>
            {data?.dataEntryBy?.['common:timeStamp'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <SourceDescription title='Reference To DataSet Format' data={referenceToDataSetFormat}></SourceDescription>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="DataSet Version" labelStyle={{ width: '140px' }}>
            {data?.publicationAndOwnership?.['common:dataSetVersion'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    );
  };
  const initUnits = (data: any) => {
    return (
      <>
        <ProTable<UnitTable, ListPagination>
          search={{
            defaultCollapsed: false,
          }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          toolBarRender={() => {
            return [];
          }}
          dataSource={data?.unit}
          columns={unitColumns}
        ></ProTable>
      </>
    );
  };

  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin></Spin>
      </div>,
    );

    getUnitGroupDetail(id).then(async (result: any) => {
      const unitGroupDataSet = result.data?.json?.unitGroupDataSet;
      const unitGroupInformation = initUnitGroupInformation(unitGroupDataSet?.unitGroupInformation);
      const modellingAndValidation = initModellingAndValidation(unitGroupDataSet?.modellingAndValidation);
      const administrativeInformation = initAdministrativeInformation(unitGroupDataSet?.administrativeInformation);
      const units = initUnits(unitGroupDataSet?.units);
      setContentList({
        unitGroupInformation: unitGroupInformation,
        modellingAndValidation: modellingAndValidation,
        administrativeInformation: administrativeInformation,
        units: units,
      });
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            <UnitGroupDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            ></UnitGroupDelete>
            <UnitGroupEdit
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            ></UnitGroupEdit>
          </>,
        );
      } else {
        setFooterButtons(<></>);
      }
    });
  };

  useEffect(() => {
    setViewDescriptions(
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {contentList[activeTabKey]}
      </Card>,
    );
  }, [contentList, activeTabKey]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.view" defaultMessage="View"></FormattedMessage>}>
        <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView}></Button>
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="pages.unitgroup.drawer.title.view" defaultMessage="View"></FormattedMessage>}
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            {footerButtons}
          </Space>
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
      >
        {viewDescriptions}
      </Drawer>
    </>
  );
};

export default ContactView;
