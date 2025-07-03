import { toSuperscript } from '@/components/AlignedNumber';
import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import ContactSelectDescription from '@/pages/Contacts/Components/select/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import UnitGroupDescription from '@/pages/Unitgroups/Components/select/description';
import { ListPagination } from '@/services/general/data';
import { getUnitGroupDetail } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitGroupFromData, genUnitTableData } from '@/services/unitgroups/util';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitView from './Unit/view';
import { complianceOptions } from './optiondata';

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
};

const getComplianceLabel = (value: string) => {
  const option = complianceOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const ContactView: FC<Props> = ({ id, version, lang, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<any>([]);

  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: (
        <FormattedMessage id='pages.table.title.index' defaultMessage='Index'></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    // {
    //   title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
    //   dataIndex: 'dataSetInternalID',
    //   search: false,
    // },
    {
      title: (
        <FormattedMessage id='pages.table.title.name' defaultMessage='Name'></FormattedMessage>
      ),
      dataIndex: 'name',
      search: false,
      render: (_, row) => {
        return [<span key={0}>{toSuperscript(row.name)}</span>];
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.generalComment'
          defaultMessage='Comment'
        ></FormattedMessage>
      ),
      dataIndex: 'generalComment',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.meanValue'
          defaultMessage='Mean value (of unit)'
        ></FormattedMessage>
      ),
      dataIndex: 'meanValue',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        return <QuantitativeReferenceIcon value={row.quantitativeReference} />;
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return (
          <UnitView key={0} id={row.dataSetInternalID} data={unitDataSource} buttonType={'icon'} />
        );

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
    {
      key: 'unitGroupInformation',
      tab: (
        <FormattedMessage
          id='pages.unitgroup.unitGroupInformation'
          defaultMessage='Unit group information'
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id='pages.unitgroup.modellingAndValidation'
          defaultMessage='Modelling and validation'
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id='pages.unitgroup.administrativeInformation'
          defaultMessage='Administrative information'
        />
      ),
    },
    { key: 'units', tab: <FormattedMessage id='pages.unitgroup.units' defaultMessage='Units' /> },
  ];

  const contentList: Record<string, React.ReactNode> = {
    unitGroupInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id='pages.unitgroup.id' defaultMessage='ID' />}
            labelStyle={{ width: '100px' }}
          >
            {initData.unitGroupInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.unitgroup.name' defaultMessage='Name of unit group' />
        </Divider>
        <LangTextItemDescription
          data={initData.unitGroupInformation?.dataSetInformation?.['common:name'] ?? {}}
        />
        <br />
        <LevelTextItemDescription
          data={
            initData.unitGroupInformation?.dataSetInformation?.classificationInformation?.[
              'common:classification'
            ]?.['common:class']?.['value']
          }
          lang={lang}
          categoryType={'UnitGroup'}
        />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage
            id='pages.unitgroup.unitGroupInformation.generalComment'
            defaultMessage='General comment'
          />
        </Divider>
        <LangTextItemDescription
          data={initData.unitGroupInformation?.dataSetInformation?.['common:generalComment']}
        />
      </>
    ),
    modellingAndValidation: (
      <>
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.unitgroup.referenceToComplianceSystem'
              defaultMessage='Compliance system name'
            />
          }
          data={
            initData.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:referenceToComplianceSystem'
            ] ?? {}
          }
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.approvalOfOverallCompliance'
                defaultMessage='Approval of overall compliance'
              />
            }
            labelStyle={{ width: '240px' }}
          >
            {getComplianceLabel(
              initData.modellingAndValidation?.complianceDeclarations?.compliance?.[
                'common:approvalOfOverallCompliance'
              ] ?? '-',
            )}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    administrativeInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.timeStamp'
                defaultMessage='Time stamp (last saved)'
              />
            }
            styles={{ label: { width: '200px' } }}
          >
            {initData.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <SourceSelectDescription
          title={
            <FormattedMessage
              id='pages.unitgroup.referenceToDataSetFormat'
              defaultMessage='Data set format(s)'
            />
          }
          data={
            initData.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat'] ??
            {}
          }
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.dataSetVersion'
                defaultMessage='Data set version'
              />
            }
            labelStyle={{ width: '140px' }}
          >
            <Space>
              {initData.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>
        <br />
        <ContactSelectDescription
          data={
            initData.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToOwnershipOfDataSet'
            ]
          }
          lang={lang}
          title={
            <FormattedMessage
              id='pages.unitgroup.referenceToOwnershipOfDataSet'
              defaultMessage='Owner of data set'
            />
          }
        ></ContactSelectDescription>
        <br />
        <UnitGroupDescription
          lang={lang}
          title={
            <FormattedMessage
              id='pages.unitgroup.referenceToPrecedingDataSetVersion'
              defaultMessage='Preceding data set version'
            />
          }
          data={
            initData.administrativeInformation?.publicationAndOwnership?.[
              'common:referenceToPrecedingDataSetVersion'
            ]
          }
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.unitgroup.permanentDataSetURI'
                defaultMessage='Permanent data set URI'
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {initData.administrativeInformation?.publicationAndOwnership?.[
              'common:permanentDataSetURI'
            ] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </>
    ),
    units: (
      <>
        <ProTable<UnitTable, ListPagination>
          search={false}
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
  };

  const onView = () => {
    console.log('onView', id, version);
    setDrawerVisible(true);
    setSpinning(true);
    getUnitGroupDetail(id, version).then(async (result: any) => {
      setInitData({ ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}) });
      setUnitDataSource([
        ...(genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ?? []),
      ]);
      // if (dataSource === 'my') {
      //   setFooterButtons(
      //     <>
      //       {/* <ContactDelete
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       />
      //       <ContactEdit
      //         id={id}
      //         buttonType={'text'}
      //         actionRef={actionRef}
      //         setViewDrawerVisible={setDrawerVisible}
      //       /> */}
      //     </>,
      //   );
      // } else {
      //   setFooterButtons(<></>);
      // }
      setSpinning(false);
    });
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.view' defaultMessage='View'></FormattedMessage>}
        >
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
            id='pages.unitgroup.drawer.title.view'
            defaultMessage='View Unit group'
          ></FormattedMessage>
        }
        width='90%'
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
        // footer={
        //   <Space size={'middle'} className={styles.footer_right}>
        //     {footerButtons}
        //   </Space>
        // }
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
