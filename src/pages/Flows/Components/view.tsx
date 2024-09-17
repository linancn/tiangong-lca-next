import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import SourceSelectDescription from '@/pages/Sources/Components/select/description';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import { getFlowDetail } from '@/services/flows/api';
import { FlowpropertyTabTable } from '@/services/flows/data';
import { genFlowFromData, genFlowPropertyTabTableData } from '@/services/flows/util';
import { ListPagination } from '@/services/general/data';
import { CheckCircleTwoTone, CloseCircleOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import { flowTypeOptions } from './optiondata';
import PropertyView from './Property/view';

type Props = {
  id: string;
  lang: string;
  buttonType: string;
};
const FlowsView: FC<Props> = ({ id, buttonType, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);

  const tabList = [
    {
      key: 'flowInformation',
      tab: (
        <FormattedMessage id="pages.flow.view.flowInformation" defaultMessage="Flow Information" />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.flow.view.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
    {
      key: 'flowProperties',
      tab: <FormattedMessage id="pages.flow.view.flowProperty" defaultMessage="Flow Property" />,
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const propertyColumns: ProColumns<FlowpropertyTabTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.flow.flowProperties.referenceToFlowDataSet" defaultMessage="Reference" />,
      dataIndex: 'referenceToFlowPropertyDataSet',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.flow.view.flowProperties.meanValue" defaultMessage="Mean Value" />
      ),
      dataIndex: 'meanValue',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference Unit Group"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit key={0} id={row.referenceToFlowPropertyDataSetId} idType={'flowproperty'} lang={lang} />,
        ];
      },
    },
    {
      title: (
        <FormattedMessage
          id="pages.process.exchange.quantitativeReference"
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
      },
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
             <PropertyView
              id={row.dataSetInternalID}
              data={propertyDataSource}
              lang={lang}
              buttonType={'icon'}
            />
            {/*<ProcessExchangeEdit
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              lang={lang}
              buttonType={'icon'}
              actionRef={actionRefExchangeTable}
              onData={onExchangeData}
              setViewDrawerVisible={() => { }}
            />
            <ProcessExchangeDelete
              id={row.dataSetInternalID}
              data={exchangeDataSource}
              buttonType={'icon'}
              actionRef={actionRefExchangeTable}
              setViewDrawerVisible={() => { }}
              onData={onPropertyData}
            /> */}
          </Space>,
        ];
      },
    },
  ];
  const contentList: Record<string, React.ReactNode> = {
    flowInformation: (
      <>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={<FormattedMessage id="pages.flow.view.flowInformation.id" defaultMessage="ID" />}
            labelStyle={{ width: '100px' }}
          >
            {initData?.flowInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.flow.view.flowInformation.baseName"
            defaultMessage="Base Name"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowInformation?.dataSetInformation?.['name']?.['baseName']}
        />

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.flow.view.flowInformation.synonyms"
            defaultMessage="Synonyms"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowInformation?.dataSetInformation?.['common:synonyms']}
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.flowInformation.typeAndClassificationOfDataSet"
              defaultMessage="Type and Classification of Data Set"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.flow.view.modellingAndValidation.typeOfDataSet"
                  defaultMessage="Type Of Data Set"
                />
              }
              labelStyle={{ width: '160px' }}
            >
              {flowTypeOptions.find(
                (i) => i.value === initData?.flowInformation?.LCIMethod?.typeOfDataSet,
              )?.label ??
                initData?.flowInformation?.LCIMethod?.typeOfDataSet ??
                '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.flow.view.flowInformation.classification"
              defaultMessage="Classification"
            />
          </Divider>
          <LevelTextItemDescription
            data={
              initData?.flowInformation?.dataSetInformation?.classificationInformation?.[
              'common:elementaryFlowCategorization'
              ]?.['common:category']
            }
            lang={lang}
            categoryType={'Flow'}
            flowType={initData?.flowInformation?.LCIMethod?.typeOfDataSet}
          />
        </Card>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.cASNumber"
                defaultMessage="CAS Number"
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {initData?.flowInformation?.dataSetInformation?.['CASNumber'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.flow.view.flowInformation.generalComment"
            defaultMessage="General Comment"
          />
        </Divider>
        <LangTextItemDescription
          data={initData?.flowInformation?.dataSetInformation?.['common:generalComment']}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.flow.view.flowInformation.eCNumber"
                defaultMessage="EC Number"
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {initData?.flowInformation?.dataSetInformation?.['common:other']?.['ecn:ECNumber'] ??
              '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />

        {/* <Card size="small" title={'Quantitative Reference'}>
                    <Descriptions bordered size={'small'} column={1}>
                        <Descriptions.Item key={0} label="Reference To Reference Flow Property" labelStyle={{ width: '200px' }}>
                            {initData?.flowInformation?.quantitativeReference?.referenceToReferenceFlowProperty ?? '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card> */}
      </>
    ),
    modellingAndValidation: (
      <>
        {/* <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.flow.view.modellingAndValidation.lCIMethod:TypeOfDataSet"
                defaultMessage="LCI Method: Type Of Data Set"
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {initData?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br /> */}
        {/* <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.modellingAndValidation.complianceDeclarations"
              defaultMessage="Compliance Declarations"
            />
          }
        > */}
        <SourceSelectDescription
          data={
            initData?.modellingAndValidation?.complianceDeclarations?.compliance?.[
            'common:referenceToComplianceSystem'
            ]
          }
          title={
            <FormattedMessage
              id="pages.flow.view.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference To Compliance System"
            />
          }
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance"
                defaultMessage="Approval Of Overall Compliance"
              />
            }
            labelStyle={{ width: '240px' }}
          >
            {initData?.modellingAndValidation?.complianceDeclarations?.compliance?.[
              'common:approvalOfOverallCompliance'
            ] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {/* <br />
        </Card> */}
      </>
    ),
    administrativeInformation: (
      <>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.dataEntryBy"
              defaultMessage="Data Entry By"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.flow.view.administrativeInformation.timeStamp"
                  defaultMessage="Time Stamp"
                />
              }
              labelStyle={{ width: '150px' }}
            >
              {initData?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <SourceSelectDescription
            data={
              initData?.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat']
            }
            title={
              <FormattedMessage
                id="pages.flow.view.administrativeInformation.referenceToDataSetFormat"
                defaultMessage="Reference To Data Set Format"
              />
            }
            lang={lang}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.view.administrativeInformation.publicationAndOwnership"
              defaultMessage="Publication And Ownership"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.flow.view.administrativeInformation.dataSetVersion"
                  defaultMessage="Data Set Version"
                />
              }
              labelStyle={{ width: '160px' }}
            >
              {initData?.administrativeInformation?.publicationAndOwnership?.[
                'common:dataSetVersion'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.flow.view.administrativeInformation.permanentDataSetURI"
                  defaultMessage="Permanent Data Set URI"
                />
              }
              labelStyle={{ width: '200px' }}
            >
              {initData?.administrativeInformation?.publicationAndOwnership?.[
                'common:permanentDataSetURI'
              ] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </>
    ),
    flowProperties: (
      <ProTable<FlowpropertyTabTable, ListPagination>
        search={false}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        columns={propertyColumns}
        dataSource={genFlowPropertyTabTableData(propertyDataSource, lang)}
      />
    ),
  };


  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getFlowDetail(id).then(async (result: any) => {
      const fromData = genFlowFromData(result.data?.json?.flowDataSet ?? {});
      setInitData({ ...fromData, id: id });
      setPropertyDataSource(fromData?.flowProperties?.flowProperty ?? []);
      setSpinning(false);
    });
  };

  return (
    <>
      {/* <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} /> */}
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View" />}>
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="pages.button.view" defaultMessage="View" />
        </Button>
      )}

      <Drawer
        title={<FormattedMessage id="pages.flow.drawer.title.view" defaultMessage="View Flow" />}
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

export default FlowsView;
