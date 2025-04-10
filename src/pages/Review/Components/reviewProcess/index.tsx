import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';

import { getCommentApi, updateCommentApi } from '@/services/comments/api';
import { getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { updateReviewApi } from '@/services/reviews/api';
import styles from '@/style/custom.less';
import { AuditOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { TabsDetail } from './tabsDetail';

type Props = {
  id: string;
  reviewId: string;
  version: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  type: 'edit' | 'view';
  tabType: 'assigned' | 'review';
};
const ReviewProcessDetail: FC<Props> = ({
  id,
  reviewId,
  version,
  lang,
  actionRef,
  type,
  tabType,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);
  const [approveReviewDisabled, setApproveReviewDisabled] = useState(false);

  const handletFromData = () => {
    if (fromData?.id) {
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
    }
  };

  const handletExchangeData = (data: any) => {
    if (fromData?.id) setExchangeDataSource([...data]);
  };

  const updateReference = async () => {
    const newExchangeDataSource = await Promise.all(
      exchangeDataSource.map(async (item: any) => {
        const refObjectId = item?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
        const version = item?.referenceToFlowDataSet?.['@version'] ?? '';

        const result = await getFlowDetail(refObjectId, version);

        if (!result?.data) {
          return item;
        }

        const refData = genFlowFromData(result.data?.json?.flowDataSet ?? {});

        return {
          ...item,
          referenceToFlowDataSet: {
            ...item?.referenceToFlowDataSet,
            '@version': result.data?.version ?? '',
            'common:shortDescription': genFlowNameJson(
              refData?.flowInformation?.dataSetInformation?.name,
            ),
          },
        };
      }),
    );

    setExchangeDataSource(newExchangeDataSource);
    setReferenceValue(referenceValue + 1);
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = () => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
  };
  const approveReview = async () => {
    const { error } = await updateCommentApi(
      reviewId,
      {
        state_code: 2,
      },
      tabType,
    );

    const { error: error2 } = await updateReviewApi([reviewId], {
      state_code: 2,
    });

    if (!error && !error2) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.ReviewProcessDetail.assigned.success',
          defaultMessage: 'Review approved successfully',
        }),
      );
      setDrawerVisible(false);
      actionRef?.current?.reload();
    }
  };

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const { data, error } = await getCommentApi(reviewId, tabType);
      if (!error && data && data.length) {
        const allReviews: any[] = [];
        data.forEach((item: any) => {
          if (item?.json?.modellingAndValidation.validation.review[0]) {
            allReviews.push(item?.json?.modellingAndValidation.validation.review[0]);
          }
        });
        const allCompliance: any[] = [];
        data.forEach((item: any) => {
          if (item?.json?.modellingAndValidation.complianceDeclarations.compliance[0]) {
            allCompliance.push(
              item?.json?.modellingAndValidation.complianceDeclarations.compliance[0],
            );
          }
        });
        setApproveReviewDisabled(allReviews.length === 0 || allCompliance.length === 0);
        if (result?.data?.json?.processDataSet) {
          result.data.json.processDataSet.modellingAndValidation = {
            ...result.data.json.processDataSet.modellingAndValidation,
            complianceDeclarations: {
              compliance: type === 'edit' ? [{}] : allCompliance,
            },
            validation: {
              review:
                type === 'edit'
                  ? [
                      {
                        'common:scope': [{}],
                      },
                    ]
                  : allReviews,
            },
          };
        }
      }

      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      setInitData({ ...dataSet, id: id });
      setFromData({ ...dataSet, id: id });
      setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...dataSet,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({
      ...fromData,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
    });
  }, [exchangeDataSource]);

  const temporarySave = async () => {
    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const submitData = {
      modellingAndValidation: {
        complianceDeclarations: fieldsValue?.modellingAndValidation?.complianceDeclarations,
        validation: fieldsValue?.modellingAndValidation?.validation,
      },
    };

    setSpinning(true);
    const { error } = await updateCommentApi(reviewId, { json: submitData }, tabType);
    if (!error) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.temporarySaveSuccess',
          defaultMessage: 'Temporary save successfully',
        }),
      );
      setDrawerVisible(false);
      actionRef?.current?.reload();
    }
    setSpinning(false);
  };

  return (
    <>
      {type === 'edit' ? (
        <Tooltip
          title={<FormattedMessage id={'pages.review.actions.review'} defaultMessage={'Review'} />}
        >
          <Button shape='circle' icon={<AuditOutlined />} size='small' onClick={onEdit} />
        </Tooltip>
      ) : (
        <Tooltip
          title={<FormattedMessage id={'pages.review.actions.view'} defaultMessage={'View'} />}
        >
          <Button shape='circle' icon={<ProfileOutlined />} size='small' onClick={onEdit} />
        </Tooltip>
      )}
      <Drawer
        getContainer={() => document.body}
        title={
          type === 'edit' ? (
            <FormattedMessage
              id={'pages.review.ReviewProcessDetail.edit.title'}
              defaultMessage={'Review process'}
            />
          ) : (
            <FormattedMessage
              id={'pages.review.ReviewProcessDetail.view.title'}
              defaultMessage={'View review'}
            />
          )
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
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          type === 'edit' ? (
            <Space size={'middle'} className={styles.footer_right}>
              <>
                <Button
                  onClick={() => {
                    updateReference();
                  }}
                >
                  <FormattedMessage
                    id='pages.button.updateReference'
                    defaultMessage='Update reference'
                  />
                </Button>
              </>
              <Button onClick={() => setDrawerVisible(false)}>
                <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
              </Button>
              <Button onClick={temporarySave}>
                <FormattedMessage id='pages.button.temporarySave' />
              </Button>
              <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
                <FormattedMessage id='pages.button.save' defaultMessage='Save' />
              </Button>
            </Space>
          ) : tabType === 'assigned' ? (
            <Space className={styles.footer_right}>
              <Button disabled={approveReviewDisabled} type='primary' onClick={approveReview}>
                <FormattedMessage
                  id='pages.review.ReviewProcessDetail.assigned.save'
                  defaultMessage='Approve Review'
                />
              </Button>
            </Space>
          ) : (
            <></>
          )
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
            <ProForm
              formRef={formRefEdit}
              initialValues={initData}
              onValuesChange={(_, allValues) => {
                setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                const fieldsValue = formRefEdit.current?.getFieldsValue();
                const submitData = {
                  modellingAndValidation: {
                    complianceDeclarations:
                      fieldsValue?.modellingAndValidation?.complianceDeclarations,
                    validation: fieldsValue?.modellingAndValidation?.validation,
                  },
                };

                setSpinning(true);
                const { error } = await updateCommentApi(
                  reviewId,
                  { json: submitData, state_code: 1 },
                  tabType,
                );
                if (!error) {
                  message.success(
                    intl.formatMessage({
                      id: 'pages.review.ReviewProcessDetail.edit.success',
                      defaultMessage: 'Review submitted successfully',
                    }),
                  );
                  setDrawerVisible(false);
                  actionRef?.current?.reload();
                }
                setSpinning(false);
                return true;
              }}
            >
              <TabsDetail
                initData={initData}
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onExchangeData={handletExchangeData}
                onTabChange={onTabChange}
                exchangeDataSource={exchangeDataSource}
                type={type}
              />
              <Form.Item name='id' hidden>
                <Input />
              </Form.Item>
            </ProForm>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default ReviewProcessDetail;
