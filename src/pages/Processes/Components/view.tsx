import LangTextItemDescription from '@/components/LangTextItem/description';
import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { getProcessDetail } from '@/services/processes/api';
import styles from '@/style/custom.less';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
// import ContactDelete from './delete';
// import ContactEdit from './edit';

type Props = {
  id: string;
  dataSource: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessView: FC<Props> = ({ id, dataSource }) => {
  const [contentList, setContentList] = useState<Record<string, React.ReactNode>>({
    processInformation: <></>,
    modellingAndValidation: <></>,
    administrativeInformation: <></>,
    exchanges: <></>,
  });
  const [viewDescriptions, setViewDescriptions] = useState<JSX.Element>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');

  const tabList = [
    { key: 'processInformation', tab: 'Process Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'exchanges', tab: 'Exchanges' },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onView = () => {
    setDrawerVisible(true);
    setViewDescriptions(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );

    getProcessDetail(id).then(async (result: any) => {
      setContentList({
        processInformation: (
          <>
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item key={0} label="ID" labelStyle={{ width: '100px' }}>
                {result.data.json.processDataSet.processInformation.dataSetInformation[
                  'common:UUID'
                ] ?? '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientationMargin="0" orientation="left" plain>
              Base Name
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json.processDataSet.processInformation.dataSetInformation.name.baseName
              }
            />

            <Divider orientationMargin="0" orientation="left" plain>
              General Comment
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json.processDataSet.processInformation.dataSetInformation[
                  'common:generalComment'
                ]
              }
            />

            <Divider orientationMargin="0" orientation="left" plain>
              Classification
            </Divider>
            <LevelTextItemDescription
              data={
                result.data.json.processDataSet.processInformation.dataSetInformation
                  .classificationInformation['common:classification']['common:class']
              }
            />
            <br />
            <Card size="small" title={'Quantitative Reference'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                  {result.data.json.processDataSet.processInformation.quantitativeReference[
                    '@type'
                  ] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item
                  key={0}
                  label="Reference To Reference Flow"
                  labelStyle={{ width: '220px' }}
                >
                  {result.data.json.processDataSet.processInformation.quantitativeReference
                    .referenceToReferenceFlow ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Functional Unit Or Other
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json.processDataSet.processInformation.quantitativeReference
                    .functionalUnitOrOther
                }
              />
            </Card>
            <br />
            <Card size="small" title={'Time'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Reference Year" labelStyle={{ width: '140px' }}>
                  {result.data.json.processDataSet.processInformation.time[
                    'common:referenceYear'
                  ] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Time Representativeness Description
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json.processDataSet.processInformation.time[
                    'common:timeRepresentativenessDescription'
                  ]
                }
              />
            </Card>
            <br />
            <Card size="small" title={'Geography: Location Of Operation Supply Or Production'}>
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item key={0} label="Location" labelStyle={{ width: '100px' }}>
                  {result.data.json.processDataSet.processInformation.geography
                    .locationOfOperationSupplyOrProduction['@location'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin="0" orientation="left" plain>
                Description Of Restrictions
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json.processDataSet.processInformation.geography
                    .locationOfOperationSupplyOrProduction.descriptionOfRestrictions
                }
              />
            </Card>
            <br />
            <Card size="small" title={'Technology'}>
              <Divider orientationMargin="0" orientation="left" plain>
                Technology Description And Included Processes
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json.processDataSet.processInformation.technology
                    .technologyDescriptionAndIncludedProcesses
                }
              />
              <Divider orientationMargin="0" orientation="left" plain>
                Technological Applicability
              </Divider>
              <LangTextItemDescription
                data={
                  result.data.json.processDataSet.processInformation.technology
                    .technologicalApplicability
                }
              />
              <br />
              <Card size="small" title={'Reference To Technology Flow Diagramm Or Picture'}>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item key={0} label="Type" labelStyle={{ width: '100px' }}>
                    {result.data.json.processDataSet.processInformation.technology
                      .referenceToTechnologyFlowDiagrammOrPicture['@type'] ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '120px' }}>
                    {result.data.json.processDataSet.processInformation.technology
                      .referenceToTechnologyFlowDiagrammOrPicture['@refObjectId'] ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item key={0} label="URI" labelStyle={{ width: '100px' }}>
                    {result.data.json.processDataSet.processInformation.technology
                      .referenceToTechnologyFlowDiagrammOrPicture['@uri'] ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                  Short Description
                </Divider>
                <LangTextItemDescription
                  data={
                    result.data.json.processDataSet.processInformation.technology
                      .referenceToTechnologyFlowDiagrammOrPicture['common:shortDescription']
                  }
                />
              </Card>
            </Card>
            <Divider orientationMargin="0" orientation="left" plain>
              Mathematical Relations: Model Description
            </Divider>
            <LangTextItemDescription
              data={
                result.data.json.processDataSet.processInformation.mathematicalRelations
                  ?.modelDescription
              }
            />
          </>
        ),
        modellingAndValidation: <></>,
        administrativeInformation: <></>,
        exchanges: <></>,
      });
    });
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
      <Tooltip title={<FormattedMessage id="options.view" defaultMessage="View" />}>
        <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.view" defaultMessage="Process View" />}
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

export default ProcessView;
