// import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';

import { ConcurrencyController, getAllRefObj, getRefTableName } from '@/pages/Utils/review';
import { getCommentApi, updateCommentApi } from '@/services/comments/api';
import { getRefData, updateStateCodeApi } from '@/services/general/api';
import { getProcessDetail, updateProcessApi } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { updateReviewApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
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
  const [approveReviewDisabled, setApproveReviewDisabled] = useState(true);

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

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = () => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
  };

  const updateProcessJson = async (process: any) => {
    const { data: commentData, error } = await getCommentApi(reviewId, tabType);
    if (!error && commentData && commentData.length) {
      const allReviews: any[] = [];
      commentData.forEach((item: any) => {
        if (item?.json?.modellingAndValidation?.validation?.review[0]) {
          allReviews.push(item?.json?.modellingAndValidation.validation.review[0]);
        }
      });
      const allCompliance: any[] = [];
      commentData.forEach((item: any) => {
        if (item?.json?.modellingAndValidation?.complianceDeclarations?.compliance[0]) {
          allCompliance.push(
            item?.json?.modellingAndValidation.complianceDeclarations.compliance[0],
          );
        }
      });

      const _review = process?.json?.processDataSet?.modellingAndValidation?.validation?.review;
      const _compliance =
        process?.json?.processDataSet?.modellingAndValidation?.complianceDeclarations?.compliance;
      const json = {
        ...process?.json,
      };
      json.processDataSet.modellingAndValidation = {
        ...process?.json?.processDataSet?.modellingAndValidation,
        validation: {
          ...process?.json?.processDataSet?.modellingAndValidation?.validation,
          review: Array.isArray(_review)
            ? [..._review, ...allReviews]
            : _review
              ? [_review, ...allReviews]
              : [...allReviews],
        },
        complianceDeclarations: {
          ...process?.json?.processDataSet?.modellingAndValidation?.complianceDeclarations,
          compliance: Array.isArray(_compliance)
            ? [..._compliance, ...allCompliance]
            : _compliance
              ? [_compliance, ...allCompliance]
              : [...allCompliance],
        },
      };
      await updateProcessApi(id, version, { json_ordered: json });
    }
  };

  const updateReviewDataToPublic = async (id: string, version: string) => {
    const result = [];
    const controller = new ConcurrencyController(5);
    const { data: process, success } = await getProcessDetail(id, version);
    if (success) {
      await updateProcessJson(process);
      if (process?.stateCode !== 100 && process?.stateCode !== 200) {
        result.push({
          '@refObjectId': process?.id,
          '@version': process?.version,
          '@type': 'process data set',
        });
      }

      const refs = getAllRefObj(process?.json);
      if (refs.length) {
        const teamId = await getUserTeamId();
        const getReferences = (
          refs: any[],
          checkedIds = new Set<string>(),
          requestKeysSet?: Set<string>,
        ) => {
          const requestKeys = requestKeysSet || new Set<string>();
          for (const ref of refs) {
            if (checkedIds.has(ref['@refObjectId'])) continue;
            checkedIds.add(ref['@refObjectId']);

            const key = `${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`;
            if (!requestKeys.has(key)) {
              requestKeys.add(key);
              controller.add(async () => {
                const refResult = await getRefData(
                  ref['@refObjectId'],
                  ref['@version'],
                  getRefTableName(ref['@type']),
                  teamId,
                );

                if (refResult.success) {
                  const refData = refResult?.data;
                  if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
                    result.push(ref);
                  }
                  const json = refData?.json;
                  const subRefs = getAllRefObj(json);
                  if (subRefs.length) {
                    getReferences(subRefs, checkedIds, requestKeys);
                  }
                }
              });
            }
          }
        };
        getReferences(refs);
        await controller.waitForAll();
      }
    }
    for (const item of result) {
      controller.add(async () => {
        await updateStateCodeApi(
          item['@refObjectId'] ?? '',
          item['@version'] ?? '',
          getRefTableName(item['@type'] ?? ''),
          100,
        );
      });
    }
    await controller.waitForAll();
  };

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

  const approveReview = async () => {
    setSpinning(true);
    const { error } = await updateCommentApi(
      reviewId,
      {
        state_code: 2,
      },
      tabType,
    );
    // const oldReviews = await getReviewsDetail(reviewId);
    // const {json:oldReviewJson} = oldReviews??{};
    const { error: error2 } = await updateReviewApi([reviewId], {
      state_code: 2,
      // json:{
      //   ...oldReviewJson,
      //   comment:{
      //     ...oldReviewJson?.comment??{},
      //     result:2,
      //   }
      // }
    });

    await updateReviewDataToPublic(id, version);

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
    setSpinning(false);
  };

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const { data, error } = await getCommentApi(reviewId, tabType);
      if (!error && data && data.length) {
        const allReviews: any[] = [];
        const isSaveReview = data && data.every((item: any) => item.state_code === 1);
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
        setApproveReviewDisabled(
          !isSaveReview || allReviews.length === 0 || allCompliance.length === 0,
        );
        if (result?.data?.json?.processDataSet) {
          const _compliance =
            result.data.json.processDataSet?.modellingAndValidation?.complianceDeclarations
              ?.compliance;
          const _review =
            result.data.json.processDataSet?.modellingAndValidation?.validation?.review;
          result.data.json.processDataSet.modellingAndValidation = {
            ...result.data.json.processDataSet.modellingAndValidation,
            complianceDeclarations: {
              compliance:
                tabType === 'review'
                  ? [...(allCompliance.length ? allCompliance : [{}])]
                  : Array.isArray(_compliance)
                    ? [..._compliance, ...allCompliance]
                    : _compliance
                      ? [_compliance, ...allCompliance]
                      : [...allCompliance],
            },
            validation: {
              review:
                tabType === 'review'
                  ? [
                      ...(allReviews.length
                        ? allReviews
                        : [
                            {
                              'common:scope': [{ '@name': undefined }],
                            },
                          ]),
                    ]
                  : Array.isArray(_review)
                    ? [..._review, ...allReviews]
                    : _review
                      ? [_review, ...allReviews]
                      : [...allReviews],
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
          tabType === 'assigned' ? (
            <Space className={styles.footer_right}>
              <Button disabled={approveReviewDisabled} type='primary' onClick={approveReview}>
                <FormattedMessage
                  id='pages.review.ReviewProcessDetail.assigned.save'
                  defaultMessage='Approve Review'
                />
              </Button>
            </Space>
          ) : tabType === 'review' ? (
            <Space className={styles.footer_right}>
              <Button onClick={temporarySave}>
                <FormattedMessage id='pages.button.temporarySave' defaultMessage='Temporary Save' />
              </Button>
              <Button type='primary' onClick={() => formRefEdit.current?.submit()}>
                <FormattedMessage id='pages.button.save' defaultMessage='Save' />
              </Button>
            </Space>
          ) : null
        }
      >
        <Spin spinning={spinning}>
          {/* <UpdateReferenceContext.Provider> */}
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
              setSpinning(true);
              const fieldsValue = formRefEdit.current?.getFieldsValue();
              const submitData = {
                modellingAndValidation: {
                  complianceDeclarations:
                    fieldsValue?.modellingAndValidation?.complianceDeclarations,
                  validation: fieldsValue?.modellingAndValidation?.validation,
                },
              };

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
          {/* </UpdateReferenceContext.Provider> */}
        </Spin>
      </Drawer>
    </>
  );
};

export default ReviewProcessDetail;
