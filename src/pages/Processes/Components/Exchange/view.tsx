import LangTextItemDescription from '@/components/LangTextItem/description';
import FlowsSelectDescription from '@/pages/Flows/Components/select/description';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
import { DataDerivationTypeStatusOptions } from '../optiondata';
import { convertUnit } from '@/utils/index';

type Props = {
  id: string;
  data: any;
  lang: string;
  // dataSource: string;
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  getRefUnit?: () => string | undefined // 获取参考单位值
};

const getDataDerivationTypeStatusOptions = (value: string) => {
  const option = DataDerivationTypeStatusOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const ProcessExchangeView: FC<Props> = ({ id, data, lang, buttonType, getRefUnit }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [footerButtons, setFooterButtons] = useState<JSX.Element>();
  const [viewData, setViewData] = useState<any>({});
  // const [spinning, setSpinning] = useState(false);
  const [isConverted, setIsConverted] = useState(false);//只需要在第一次展示的时候转换一次

  const onView = () => {
    setDrawerVisible(true);
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    if (!isConverted && getRefUnit) {
      const resMeanAmount = convertUnit(filteredData?.meanAmount, getRefUnit(), filteredData?.meanAmountUnit,);
      if (resMeanAmount.status === 'success') {
        filteredData.meanAmount = resMeanAmount.value
      } else {
        return false
      };
      const resResoultingAmount = convertUnit(filteredData?.resultingAmount, getRefUnit(), filteredData?.resultingAmountUnit);
      if (resResoultingAmount.status === 'success') {
        filteredData.resultingAmount = resResoultingAmount.value
      } else {
        return false
      };
      setIsConverted(true)

    };
    setViewData(filteredData);
    // setSpinning(true);
    // if (dataSource === 'my') {
    //   setFooterButtons(
    //     <>
    //       <ProcessExchangeDelete
    //           id={id}
    //           data={[]}
    //           buttonType={'text'}
    //           actionRef={actionRef}
    //           setViewDrawerVisible={setDrawerVisible}
    //         />
    //       <ContactEdit
    //           id={id}
    //           buttonType={'text'}
    //           actionRef={actionRef}
    //           setViewDrawerVisible={setDrawerVisible}
    //         />
    //     </>,
    //   );
    // } else {
    //   setFooterButtons(<></>);
    // }
    // setSpinning(false);
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View exchange" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.button.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.process.exchange.drawer.title.view"
            defaultMessage="View exchange"
          />
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
          false
          // <Space size={'middle'} className={styles.footer_right}>
          //   {footerButtons}
          // </Space>
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
              <FormattedMessage
                id="pages.process.view.exchange.exchangeDirection"
                defaultMessage="Exchange direction"
              />
            }
            labelStyle={{ width: '180px' }}
          >
            {viewData.exchangeDirection ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <FlowsSelectDescription
          title={
            <FormattedMessage
              id="pages.process.view.exchange.referenceToFlowDataSet"
              defaultMessage="Flow"
            />
          }
          data={viewData.referenceToFlowDataSet ?? {}}
          lang={lang}
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="processExchange.meanAmount" defaultMessage="Mean amount" />
            }
            labelStyle={{ width: '220px' }}
          >
            {viewData.meanAmount ?? '-'}{viewData.meanAmountUnit ?? ''}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="processExchange.resultingAmount"
                defaultMessage="Resulting amount"
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {viewData.resultingAmount ?? '-'}{viewData.resultingAmountUnit ?? ''}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="processExchange.uncertaintyDistributionType"
                defaultMessage="Uncertainty distribution type"
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {viewData.uncertaintyDistributionType ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {viewData.uncertaintyDistributionType === 'triangular' ||
          viewData.uncertaintyDistributionType === 'uniform' ? (
          <>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id="processExchange.minimumAmount"
                    defaultMessage="Minimum amount"
                  />
                }
                labelStyle={{ width: '220px' }}
              >
                {viewData.minimumAmount ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id="processExchange.maximumAmount"
                    defaultMessage="Maximum amount"
                  />
                }
                labelStyle={{ width: '220px' }}
              >
                {viewData.maximumAmount ?? '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <></>
        )}
        {viewData.uncertaintyDistributionType === 'normal' ||
          viewData.uncertaintyDistributionType === 'log-normal' ? (
          <>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id="processExchange.relativeStandardDeviation95In"
                    defaultMessage="Relative standard deviation 95 in"
                  />
                }
                labelStyle={{ width: '220px' }}
              >
                {viewData.relativeStandardDeviation95In ?? '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <></>
        )}
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.process.view.exchange.dataDerivationTypeStatus"
                defaultMessage="'Data derivation type / status"
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {getDataDerivationTypeStatusOptions(viewData.dataDerivationTypeStatus)}
          </Descriptions.Item>
        </Descriptions>

        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.process.view.exchange.generalComment"
            defaultMessage="Comment"
          />
        </Divider>
        <LangTextItemDescription data={viewData.generalComment} />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.process.view.exchange.quantitativeReference"
              defaultMessage="Quantitative reference"
            />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.referenceToReferenceFlow"
                  defaultMessage="Reference flow(s)"
                />
              }
              labelStyle={{ width: '220px' }}
            >
              {viewData.quantitativeReference ? (
                <CheckCircleTwoTone twoToneColor="#52c41a" />
              ) : (
                <CloseCircleOutlined />
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.exchange.functionalUnitOrOther"
              defaultMessage="Functional unit, Production period, or Other parameter"
            />
          </Divider>
          <LangTextItemDescription data={viewData.functionalUnitOrOther} />
        </Card>
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default ProcessExchangeView;
