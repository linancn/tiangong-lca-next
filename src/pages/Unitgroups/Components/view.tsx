import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import { ListPagination } from '@/services/general/data';
import { getUnitGroupDetail } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitGroupFromData, genUnitTableData } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseCircleOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitView from './Unit/view';

type Props = {
  id: string;
  dataSource: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  buttonType: string;
};
const ContactView: FC<Props> = ({ id, dataSource, lang, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<any>([]);

  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };


  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index"></FormattedMessage>,
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
      dataIndex: 'dataSetInternalID',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.name" defaultMessage="Name"></FormattedMessage>,
      dataIndex: 'name',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.generalComment" defaultMessage="General Comment"></FormattedMessage>,
      dataIndex: 'generalComment',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.meanValue" defaultMessage="Mean Value"></FormattedMessage>,
      dataIndex: 'meanValue',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="processExchange.quantitativeReference"
          defaultMessage="Quantitative Reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return <CheckCircleTwoTone twoToneColor="#52c41a" />;
        }
        return <CloseCircleOutlined />;
      }
    },
    {
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return <UnitView
          key={0}
          id={row.dataSetInternalID}
          data={unitDataSource}
          buttonType={'icon'}
        />

        // if (dataSource === 'my') {
        //   return [
        // <Space size={'small'} key={0}>
        //   <ProcessExchangeView
        //     id={row.dataSetInternalID}
        //     data={exchangeDataSource}
        //     dataSource={'my'}
        //     buttonType={'icon'}
        //     lang={lang}
        //     actionRef={actionRefExchangeTable}
        //   />
        //   <ProcessEdit
        //     id={row.id}
        //     lang={lang}
        //     buttonType={'icon'}
        //     actionRef={actionRef}
        //     setViewDrawerVisible={() => { }}
        //   />
        //   <ProcessDelete
        //     id={row.id}
        //     buttonType={'icon'}
        //     actionRef={actionRef}
        //     setViewDrawerVisible={() => { }}
        //   />
        // </Space>,
        //   ];
        // }
        // return [
        //   <Space size={'small'} key={0}>
        //     <ProcessExchangeView
        //       id={row.dataSetInternalID}
        //       data={exchangeDataSource}
        //       lang={lang}
        //       dataSource={'tg'}
        //       buttonType={'icon'}
        //       actionRef={actionRefExchangeTable}
        //     />
        //   </Space>,
        // ];
      },
    },
  ];

  const tabList = [
    { key: 'unitGroupInformation', tab: 'UnitGroup Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'units', tab: 'Units' },
  ];

  const contentList: Record<string, React.ReactNode> = {
    unitGroupInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
            {initData.unitGroupInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          Name
        </Divider>
        <LangTextItemDescription data={initData.unitGroupInformation?.dataSetInformation?.["common:name"] ?? {}} />
        <Divider orientationMargin="0" orientation="left" plain>
          Classification
        </Divider>
        <LevelTextItemDescription data={initData.unitGroupInformation?.dataSetInformation?.classificationInformation?.['common:classification']?.['common:class'] ?? {}} />
      </>
    ),
    modellingAndValidation: (
      <>
        <SourceSelectDescription title='Reference To Compliance System' data={initData.modellingAndValidation?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem'] ?? {}} lang={lang} />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Approval Of Overall Compliance" labelStyle={{ width: '240px' }}>
            {initData.modellingAndValidation?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    administrativeInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="TimeStamp" labelStyle={{ width: '140px' }}>
            {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <SourceSelectDescription title='Reference To DataSet Format' data={initData.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat'] ?? {}} lang={lang} />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="DataSet Version" labelStyle={{ width: '140px' }}>
            {initData.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    units: (
      <>
        <ProTable<UnitTable, ListPagination>
          search={{
            defaultCollapsed: false,
          }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10000,
          }}
          toolBarRender={() => {
            return [];
          }}
          dataSource={genUnitTableData(unitDataSource, lang)}
          columns={unitColumns}
        />
      </>
    ),
  }

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getUnitGroupDetail(id).then(async (result: any) => {
      console.log('genUnitGroupFromData', { ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}) })
      setInitData({ ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}) });
      setUnitDataSource([...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ?? []]);
      if (dataSource === 'my') {
        setFooterButtons(
          <>
            {/* <ContactDelete
              id={id}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            />
            <ContactEdit
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
      setSpinning(false);
    });
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.view" defaultMessage="View"></FormattedMessage>}>
        {/* <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView}></Button> */}
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.table.option.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="pages.unitgroup.drawer.title.view" defaultMessage="View Unit Group"></FormattedMessage>}
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
        <Spin spinning={spinning}>
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactView;
