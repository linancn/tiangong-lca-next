import LangTextItemDescription from '@/components/LangTextItem/description';
import FlowsSelectDescription from '@/pages/Flows/Components/select/description';
import styles from '@/style/custom.less';
import { CheckCircleTwoTone, CloseCircleOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: any;
  lang: string;
  dataSource: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessExchangeView: FC<Props> = ({ id, data, lang, dataSource, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [viewData, setViewData] = useState<any>({});
  // const [spinning, setSpinning] = useState(false);

  const onView = () => {
    setDrawerVisible(true);
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setViewData(filteredData);
    // setSpinning(true);
    if (dataSource === 'my') {
      setFooterButtons(
        <>
          {/* <ProcessExchangeDelete
              id={id}
              data={[]}
              buttonType={'text'}
              actionRef={actionRef}
              setViewDrawerVisible={setDrawerVisible}
            /> */}
          {/* <ContactEdit
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
    // setSpinning(false);
  };

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.table.option.view" defaultMessage="View Exchange" />}
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
          <FormattedMessage id="pages.contact.drawer.title.view" defaultMessage="View Exchange" />
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
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            {footerButtons}
          </Space>
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {/* <Spin spinning={spinning}> */}
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Exchange Direction" labelStyle={{ width: '220px' }}>
            {viewData.exchangeDirection ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <FlowsSelectDescription
          title="Reference To Flow Data Set"
          data={viewData.referenceToFlowDataSet ?? {}}
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Mean Amount" labelStyle={{ width: '220px' }}>
            {viewData.meanAmount ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item key={0} label="Resulting Amount" labelStyle={{ width: '220px' }}>
            {viewData.resultingAmount ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label="Data Derivation Type Status"
            labelStyle={{ width: '220px' }}
          >
            {viewData.dataDerivationTypeStatus ?? '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          General Comment
        </Divider>
        <LangTextItemDescription data={viewData.generalComment} />
        <br />
        <Card size="small" title={'Quantitative Reference'}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label="Reference To Reference Flow"
              labelStyle={{ width: '220px' }}
            >
              {viewData.quantitativeReference ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleOutlined />}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            Functional Unit Or Other
          </Divider>
          <LangTextItemDescription
            data={viewData.functionalUnitOrOther}
          />
        </Card>
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default ProcessExchangeView;
