import { RefCheckContext, RefCheckType } from '@/contexts/refCheckContext';
import {
  checkReferences,
  ConcurrencyController,
  getAllRefObj,
  getRefTableName,
  getRejectedComments,
  refDataType,
  ReffPath,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import { getCommentApi, updateCommentApi } from '@/services/comments/api';
import { getRefData, updateStateCodeApi } from '@/services/general/api';
import { getProcessDetail, updateProcessApi } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { getReviewsDetail, updateReviewApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { getUserId, getUsersByIds } from '@/services/users/api';
import styles from '@/style/custom.less';
import { AuditOutlined, CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, message, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import RejectReview from '../RejectReview';
import { TabsDetail } from './tabsDetail';

type Props = {
  id: string;
  reviewId: string;
  version: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  type: 'edit' | 'view';
  tabType: 'assigned' | 'review' | 'reviewer-rejected' | 'admin-rejected';
  hideButton?: boolean;
};

const ReviewProcessDetail: FC<Props> = ({
  id,
  reviewId,
  version,
  lang,
  actionRef,
  type,
  tabType,
  hideButton = false,
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
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const [rejectedComments, setRejectedComments] = useState<any>([]);

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
        if (item?.json?.modellingAndValidation?.validation?.review) {
          allReviews.push(...item?.json?.modellingAndValidation.validation.review);
        }
      });
      const allCompliance: any[] = [];
      commentData.forEach((item: any) => {
        if (item?.json?.modellingAndValidation?.complianceDeclarations?.compliance) {
          allCompliance.push(
            ...item?.json?.modellingAndValidation.complianceDeclarations.compliance,
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
  const getNewReviewJson = async (action: string) => {
    const userId = await getUserId();
    const user = await getUsersByIds([userId]);
    const reviewDetail = await getReviewsDetail(reviewId);
    const updateJson = {
      ...reviewDetail?.json,
      logs: [
        ...(reviewDetail?.json.logs ?? []),
        {
          action,
          time: new Date(),
          user: {
            id: userId,
            display_name: user?.[0]?.display_name,
          },
        },
      ],
    };
    return updateJson;
  };
  const temporarySave = async () => {
    try {
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
        const newReviewJson = await getNewReviewJson('submit_comments_temporary');
        const result = await updateReviewApi([reviewId], {
          json: newReviewJson,
        });

        if (!result.error) {
          message.success(
            intl.formatMessage({
              id: 'pages.review.temporarySaveSuccess',
              defaultMessage: 'Temporary save successfully',
            }),
          );
          setDrawerVisible(false);
          actionRef?.current?.reload();
        } else {
          throw new Error('暂存失败');
        }
      }
      setSpinning(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSpinning(false);
    }
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

    const newReviewJson = await getNewReviewJson('approved');
    const { error: error2 } = await updateReviewApi([reviewId], {
      state_code: 2,
      json: newReviewJson,
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
  const isReviewComplete = (data: any) => {
    return data
      .filter((item: any) => item.state_code >= 0)
      .every((item: any) => item.state_code === 1);
  };
  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const { data, error } = await getCommentApi(reviewId, tabType);
      if (!error && data && data.length) {
        const allReviews: any[] = [];
        const isSaveReview = isReviewComplete(data);
        const allCompliance: any[] = [];
        data.forEach((item: any) => {
          if (item?.json?.modellingAndValidation?.validation?.review) {
            allReviews.push(...item?.json?.modellingAndValidation.validation.review);
          }
          // No review data has been saved yet.
          if (!item.json && tabType === 'review' && type === 'edit') {
            allCompliance.push(
              ...[
                {
                  'common:referenceToComplianceSystem': {
                    '@refObjectId': '1ea48531-e397-4ca7-ac08-056e4fa11826',
                    '@type': 'source data set',
                    '@uri': '../sources/1ea48531-e397-4ca7-ac08-056e4fa11826.xml',
                    '@version': '20.20.002',
                    'common:shortDescription': [
                      {
                        '@xml:lang': 'en',
                        '#text':
                          'ISO 14040 Environmental Management – Life Cycle Assessment – Principles and Framework, 2006',
                      },
                    ],
                  },
                  'common:approvalOfOverallCompliance': 'Fully compliant',
                  'common:nomenclatureCompliance': 'Not defined',
                  'common:methodologicalCompliance': 'Fully compliant',
                  'common:reviewCompliance': 'Fully compliant',
                  'common:documentationCompliance': 'Not defined',
                  'common:qualityCompliance': 'Not defined',
                },
                {
                  'common:approvalOfOverallCompliance': 'Fully compliant',
                  'common:nomenclatureCompliance': 'Not defined',
                  'common:methodologicalCompliance': 'Fully compliant',
                  'common:reviewCompliance': 'Not defined',
                  'common:documentationCompliance': 'Fully compliant',
                  'common:qualityCompliance': 'Not defined',
                  'common:referenceToComplianceSystem': {
                    '@refObjectId': '1adb438d-4a8b-4919-885e-0a66da3c0f2a',
                    '@type': 'source data set',
                    '@uri': '../sources/1adb438d-4a8b-4919-885e-0a66da3c0f2a.xml',
                    '@version': '20.20.002',
                    'common:shortDescription': [
                      {
                        '@xml:lang': 'en',
                        '#text':
                          'ISO 14044:2006. Environmental Management – Life Cycle Assessment – Requirements and guidelines.',
                      },
                    ],
                  },
                },
                {
                  'common:approvalOfOverallCompliance': 'Fully compliant',
                  'common:nomenclatureCompliance': 'Fully compliant',
                  'common:methodologicalCompliance': 'Fully compliant',
                  'common:reviewCompliance': 'Fully compliant',
                  'common:documentationCompliance': 'Fully compliant',
                  'common:qualityCompliance': 'Not defined',
                  'common:referenceToComplianceSystem': {
                    '@refObjectId': 'd92a1a12-2545-49e2-a585-55c259997756',
                    '@type': 'source data set',
                    '@uri': '../sources/d92a1a12-2545-49e2-a585-55c259997756.xml',
                    '@version': '20.20.002',
                    'common:shortDescription': [
                      {
                        '@xml:lang': 'en',
                        '#text': 'ILCD Data Network - Entry-level',
                      },
                    ],
                  },
                },
                {
                  'common:approvalOfOverallCompliance': 'Fully compliant',
                  'common:nomenclatureCompliance': 'Fully compliant',
                  'common:methodologicalCompliance': 'Not defined',
                  'common:reviewCompliance': 'Not defined',
                  'common:documentationCompliance': 'Not defined',
                  'common:qualityCompliance': 'Not defined',
                  'common:referenceToComplianceSystem': {
                    '@refObjectId': 'c84c4185-d1b0-44fc-823e-d2ec630c7906',
                    '@type': 'source data set',
                    '@uri': '../sources/c84c4185-d1b0-44fc-823e-d2ec630c7906.xml',
                    '@version': '00.00.001',
                    'common:shortDescription': [
                      {
                        '@xml:lang': 'en',
                        '#text': 'Environmental Footprint (EF) 3.1',
                      },
                    ],
                  },
                },
                {
                  'common:approvalOfOverallCompliance': 'Fully compliant',
                  'common:nomenclatureCompliance': 'Fully compliant',
                  'common:methodologicalCompliance': 'Fully compliant',
                  'common:reviewCompliance': 'Fully compliant',
                  'common:documentationCompliance': 'Fully compliant',
                  'common:qualityCompliance': 'Fully compliant',
                  'common:referenceToComplianceSystem': {
                    '@refObjectId': '779fb9ea-de54-4707-b7fc-6154661552b5',
                    '@type': 'source data set',
                    '@uri': '../sources/779fb9ea-de54-4707-b7fc-6154661552b5.xml',
                    '@version': '01.00.000',
                    'common:shortDescription': [
                      {
                        '@xml:lang': 'en',
                        '#text':
                          'Commission Recommendation (EU) 2021/2279. (Annex I. Product Environmental Footprint Method)',
                      },
                    ],
                  },
                },
              ],
            );
          }
          if (item?.json?.modellingAndValidation?.complianceDeclarations?.compliance) {
            allCompliance.push(
              ...item?.json?.modellingAndValidation.complianceDeclarations.compliance,
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
                tabType === 'review' || tabType === 'reviewer-rejected'
                  ? [...(allCompliance.length ? allCompliance : [{}])]
                  : Array.isArray(_compliance)
                    ? [..._compliance, ...allCompliance]
                    : _compliance
                      ? [_compliance, ...allCompliance]
                      : [...allCompliance],
            },
            validation: {
              review:
                tabType === 'review' || tabType === 'reviewer-rejected'
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

      // Get the rejected comments
      if (result?.data?.stateCode < 100) {
        const rejectedCommentsRes = await getRejectedComments(id, version);
        setRejectedComments(rejectedCommentsRes);
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

  const updateCommentJsonRefsToUnderReview = async (data: any) => {
    const refObjs = getAllRefObj(data);
    const unReview: refDataType[] = []; //stateCode < 20
    const underReview: refDataType[] = []; //stateCode >= 20 && stateCode < 100
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const userTeamId = await getUserTeamId();
    const path = await checkReferences(
      refObjs,
      new Map<string, any>(),
      userTeamId,
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      new ReffPath(
        {
          '@refObjectId': '',
          '@version': '',
          '@type': '',
        },
        true,
        false,
      ),
    );
    const problemNodes = path?.findProblemNodes() ?? [];
    const refCheckDataValue: RefCheckType[] = [];

    if (underReview.length > 0) {
      refCheckDataValue.push(
        ...underReview.map((item: any) => {
          return {
            id: item['@refObjectId'],
            version: item['@version'],
            ruleVerification: true,
            nonExistent: false,
            stateCode: 20,
          };
        }),
      );
    } else if (problemNodes && problemNodes.length > 0) {
      let result = problemNodes.map((item: any) => {
        return {
          id: item['@refObjectId'],
          version: item['@version'],
          ruleVerification: item.ruleVerification,
          nonExistent: item.nonExistent,
        };
      });
      refCheckDataValue.push(...result);
    }

    if (refCheckDataValue.length) {
      setRefCheckData(refCheckDataValue);
      setSpinning(false);
      return false;
    } else {
      await updateUnReviewToUnderReview(unReview, reviewId);
      setRefCheckData([]);
      return true;
    }
  };

  const handleReject = async (reason:string) => {
    try {
      setSpinning(true);
      const { data: commentData } = await getCommentApi(reviewId, tabType);
      const comment = commentData?commentData[0]:null;
      if (commentData) {
        const updateJson = {
          ...comment.json,
          comment: {
            message: reason,
          },
        };
        const { error } = await updateCommentApi(
          comment.review_id,
          {
            json: updateJson,
            state_code: -3,
          },
          tabType,
        );
        if (!error) {
          message.success(
            intl.formatMessage({
              id: 'component.rejectReview.success',
              defaultMessage: 'Rejected successfully!',
            }),
          );
          setDrawerVisible(false);
          actionRef?.current?.reload();
        }
      }
    } catch (error) {
      message.error(
        intl.formatMessage({
          id: 'component.rejectReview.error',
          defaultMessage: 'Failed to reject, please try again!',
        }),
      );
    } finally {
      setSpinning(false);
    }
  }

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
          tabType === 'assigned' && !hideButton ? (
            <Space className={styles.footer_right}>
              <Button disabled={approveReviewDisabled} type='primary' onClick={approveReview}>
                <FormattedMessage
                  id='pages.review.ReviewProcessDetail.assigned.save'
                  defaultMessage='Approve Review'
                />
              </Button>
              <RejectReview
                buttonType='text'
                isModel={false}
                dataId={id}
                dataVersion={version}
                reviewId={reviewId}
                key={0}
                actionRef={actionRef}
              />
            </Space>
          ) : tabType === 'review' && !hideButton ? (
            <Space className={styles.footer_right}>
              <RejectReview
                buttonType='text'
                isModel={false}
                dataId={id}
                dataVersion={version}
                reviewId={reviewId}
                key={1}
                actionRef={actionRef}
                onOk={handleReject}
              />
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
          <RefCheckContext.Provider value={{ refCheckData: refCheckData }}>
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
                try {
                  setSpinning(true);
                  const fieldsValue = formRefEdit.current?.getFieldsValue();
                  const submitData = {
                    modellingAndValidation: {
                      complianceDeclarations:
                        fieldsValue?.modellingAndValidation?.complianceDeclarations,
                      validation: fieldsValue?.modellingAndValidation?.validation,
                    },
                  };
                  const isRefCheck = await updateCommentJsonRefsToUnderReview(submitData);
                  if (!isRefCheck) {
                    setSpinning(false);
                    return false;
                  }

                  const { error } = await updateCommentApi(
                    reviewId,
                    { json: submitData, state_code: 1 },
                    tabType,
                  );
                  if (!error) {
                    const newReviewJson = await getNewReviewJson('submit_comments');
                    const result = await updateReviewApi([reviewId], {
                      json: newReviewJson,
                    });

                    if (!result.error) {
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
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSpinning(false);
                }
              }}
            >
              <TabsDetail
                rejectedComments={rejectedComments}
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
          </RefCheckContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default ReviewProcessDetail;
