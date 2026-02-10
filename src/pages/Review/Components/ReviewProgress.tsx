import { ConcurrencyController, getAllRefObj, getRefTableName } from '@/pages/Utils/review';
import {
  getCommentApi,
  updateCommentApi,
  updateCommentByreviewerApi,
} from '@/services/comments/api';
import { getRefData, updateStateCodeApi } from '@/services/general/api';
import {
  getLifeCycleModelDetail,
  updateLifeCycleModelJsonApi,
} from '@/services/lifeCycleModels/api';
import {
  getProcessDetail,
  getProcessDetailByIdAndVersion,
  updateProcessApi,
} from '@/services/processes/api';
import { updateReviewApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { getUsersByIds } from '@/services/users/api';
import styles from '@/style/custom.less';
import { CloseOutlined, DeleteOutlined, FileSyncOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Modal, Space, Spin, Tag, Tooltip, message, theme } from 'antd';
import { useRef, useState } from 'react';
import RejectReview from './RejectReview';
import { getNewReviewJson } from './reviewProcess';
import SelectReviewer from './SelectReviewer';

type ReviewProgressProps = {
  reviewId: string;
  dataId: string;
  dataVersion: string;
  actionType: 'process' | 'model'; // to identify the type of data being reviewed
  tabType: 'assigned' | 'review' | 'reviewer-rejected' | 'admin-rejected';
  actionRef: any;
};

type ReviewerData = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  state_code: number;
  updated_at: string;
  comment?: string;
  json: any;
};

export default function ReviewProgress({
  reviewId,
  dataId,
  dataVersion,
  actionType,
  tabType,
  actionRef,
}: ReviewProgressProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [tableData, setTableData] = useState<ReviewerData[]>([]);
  const tableRef = useRef<any>(null);
  const intl = useIntl();
  const { token } = theme.useToken();
  const fetchTableData = async () => {
    setTableLoading(true);
    try {
      const { data: reviewStateResult } = await getCommentApi(reviewId, 'assigned');
      const tableResult: ReviewerData[] = [];
      if (reviewStateResult && reviewStateResult.length) {
        const reviewerIds: string[] = [];
        reviewStateResult.forEach((item: any) => {
          // if (item.state_code >= 0) {
          tableResult.push(item);
          reviewerIds.push(item.reviewer_id);
          // }
        });
        const userResult = await getUsersByIds(reviewerIds);
        tableResult.forEach((item: any) => {
          const user = userResult?.find((user: any) => user.id === item.reviewer_id);
          item.reviewer_name = user?.display_name;
        });
        setTableData(tableResult);
        return {
          data: tableResult,
          success: true,
          total: tableResult.length,
        };
      }
      setTableData([]);
      return {
        data: [],
        success: true,
        total: 0,
      };
    } catch (error) {
      console.error(error);
      return {
        data: [],
        success: true,
        total: 0,
      };
    } finally {
      setTableLoading(false);
    }
  };

  const getStateText = (stateCode: number) => {
    switch (stateCode) {
      case -3:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.rejected',
            defaultMessage: 'Rejected',
          }),
          color: 'red',
        };
      case 0:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.pending',
            defaultMessage: 'Pending Review',
          }),
          color: 'orange',
        };
      case 1:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.reviewed',
            defaultMessage: 'Reviewed',
          }),
          color: 'blue',
        };
      default:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.unknown',
            defaultMessage: 'Unknown Status',
          }),
          color: 'default',
        };
    }
  };

  const handleRemoveReviewer = async (reviewerId: string) => {
    Modal.confirm({
      okButtonProps: {
        type: 'primary',
        style: { backgroundColor: token.colorPrimary },
      },
      cancelButtonProps: {
        style: { borderColor: token.colorPrimary, color: token.colorPrimary },
      },
      title: intl.formatMessage({
        id: 'pages.review.progress.confirm.title',
        defaultMessage: 'Confirm Revocation',
      }),
      content: intl.formatMessage({
        id: 'pages.review.progress.confirm.content',
        defaultMessage: 'Are you sure to revoke this reviewer?',
      }),
      onOk: async () => {
        try {
          setTableLoading(true);
          const result = await updateCommentByreviewerApi(reviewId, reviewerId, { state_code: -2 });
          const reivewerIds: string[] = [];
          tableData.forEach((item: ReviewerData) => {
            if (item.reviewer_id !== reviewerId) {
              reivewerIds.push(item.reviewer_id);
            }
          });
          const { data } = await updateReviewApi([reviewId], { reviewer_id: reivewerIds });
          if (!result.error && data && data.length > 0) {
            message.success(
              intl.formatMessage({
                id: 'pages.review.progress.delete.success',
                defaultMessage: 'Successfully revoked the auditor',
              }),
            );
          } else {
            message.error(
              intl.formatMessage({
                id: 'pages.review.progress.delete.error',
                defaultMessage: 'Failed to revoke the auditor',
              }),
            );
          }
          tableRef.current?.reload();
        } catch (error) {
          console.error('Failed to revoke reviewer:', error);
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const columns: ProColumns<ReviewerData>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      width: 60,
    },
    {
      title: (
        <FormattedMessage id='pages.review.progress.table.reviewerName' defaultMessage='Name' />
      ),
      dataIndex: 'reviewer_name',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.review.progress.table.status' defaultMessage='Review Status' />
      ),
      dataIndex: 'state_code',
      search: false,
      render: (_, record) => {
        const stateInfo = getStateText(record.state_code);
        return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.review.progress.table.reviewComment'
          defaultMessage='审核意见'
        />
      ),
      dataIndex: 'comment',
      search: false,
      width: 300,
      render: (_, record) => {
        if (record.state_code !== -3) return null;
        let msg = '';
        const { comment } = record.json;
        try {
          if (!comment) {
            msg = '';
          } else if (typeof comment === 'string') {
            const parsed = JSON.parse(comment);
            msg = parsed?.message ?? '';
          } else if (typeof comment === 'object') {
            msg = (comment as any)?.message ?? '';
          }
        } catch (e) {
          msg = '';
        }
        if (!msg) return null;
        return (
          <Tooltip title={msg} placement='topLeft'>
            <div
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 300,
              }}
            >
              {msg}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.review.progress.table.updateTime'
          defaultMessage='Update Time'
        />
      ),
      dataIndex: 'modified_at',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: <FormattedMessage id='pages.review.progress.table.actions' defaultMessage='Actions' />,
      dataIndex: 'actions',
      search: false,
      render: (_, record) => [
        <Tooltip
          key='remove'
          title={intl.formatMessage({
            id: 'pages.review.progress.tooltip.revoke',
            defaultMessage: 'Revoke Reviewer',
          })}
        >
          <Button
            disabled={record.state_code !== 0}
            type='text'
            size='small'
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveReviewer(record.reviewer_id)}
          />
        </Tooltip>,
      ],
    },
  ];

  // Helper function: Merge commentReview and commentCompliance into process JSON
  const mergeCommentDataIntoProcessJson = (
    processJson: any,
    commentReview: any[],
    commentCompliance: any[],
  ) => {
    const json = {
      ...processJson,
    };

    // Merge commentReview into review
    const _review = json.processDataSet.modellingAndValidation.validation.review;
    const _compliance =
      json.processDataSet.modellingAndValidation.complianceDeclarations.compliance;
    json.processDataSet.modellingAndValidation = {
      ...json.processDataSet.modellingAndValidation,
      validation: {
        ...json.processDataSet.modellingAndValidation.validation,
        review: Array.isArray(_review)
          ? [..._review, ...commentReview]
          : _review
            ? [_review, ...commentReview]
            : [...commentReview],
      },
      complianceDeclarations: {
        ...json.processDataSet.modellingAndValidation.complianceDeclarations,
        compliance: Array.isArray(_compliance)
          ? [..._compliance, ...commentCompliance]
          : _compliance
            ? [_compliance, ...commentCompliance]
            : [...commentCompliance],
      },
    };

    return json;
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

      const json = mergeCommentDataIntoProcessJson(process.json, allReviews, allCompliance);
      await updateProcessApi(dataId, dataVersion, { json_ordered: json });
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
  const approveProcessReview = async () => {
    setSpinning(true);
    const { error } = await updateCommentApi(
      reviewId,
      {
        state_code: 2,
      },
      tabType,
    );

    const newReviewJson = await getNewReviewJson('approved', reviewId);
    const { error: error2 } = await updateReviewApi([reviewId], {
      state_code: 2,
      json: newReviewJson,
    });

    await updateReviewDataToPublic(dataId, dataVersion);

    if (!error && !error2) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.ReviewProcessDetail.assigned.success',
          defaultMessage: 'Review approved successfully',
        }),
      );
      setDrawerVisible(false);
      actionRef.current?.reload();
    }
    setSpinning(false);
  };

  // model
  const updateLifeCycleModelJson = async (lifeCycleModel: any) => {
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

      const _review =
        lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.validation?.review;
      const _compliance =
        lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.complianceDeclarations
          ?.compliance;
      const json = {
        ...lifeCycleModel?.json,
      };
      json.lifeCycleModelDataSet.modellingAndValidation = {
        ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation,
        validation: {
          ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation?.validation,
          review: Array.isArray(_review)
            ? [..._review, ...allReviews]
            : _review
              ? [_review, ...allReviews]
              : [...allReviews],
        },
        complianceDeclarations: {
          ...lifeCycleModel?.json?.lifeCycleModelDataSet?.modellingAndValidation
            ?.complianceDeclarations,
          compliance: Array.isArray(_compliance)
            ? [..._compliance, ...allCompliance]
            : _compliance
              ? [_compliance, ...allCompliance]
              : [...allCompliance],
        },
      };
      const { data: newLifeCycleModel } = await updateLifeCycleModelJsonApi(
        dataId,
        dataVersion,
        json,
      );
      return { newLifeCycleModel, commentReview: allReviews, commentCompliance: allCompliance };
    }
  };

  // Helper function: Merge commentReview and commentCompliance into process review and compliance fields
  const updateProcessWithCommentData = async (
    processId: string,
    processVersion: string,
    commentReview: any[],
    commentCompliance: any[],
  ) => {
    const { data: process } = await getProcessDetail(processId, processVersion);
    if (!process) return;

    const json = mergeCommentDataIntoProcessJson(process.json, commentReview, commentCompliance);
    await updateProcessApi(processId, processVersion, { json_ordered: json });
  };

  // Helper function: Batch update review and compliance fields for processes
  const updateSubmodelProcessesWithCommentData = async (
    processParams: Array<{ id: string; version: string }>,
    commentReview: any[],
    commentCompliance: any[],
  ) => {
    if (
      processParams.length === 0 ||
      (commentReview.length === 0 && commentCompliance.length === 0)
    ) {
      return;
    }

    // 1. Batch fetch process details
    const { data: processes } = await getProcessDetailByIdAndVersion(processParams);

    // 2. Concurrently update all processes
    const controller = new ConcurrencyController(5);
    for (const process of processes) {
      controller.add(async () => {
        await updateProcessWithCommentData(
          process.id,
          process.version,
          commentReview,
          commentCompliance,
        );
      });
    }
    await controller.waitForAll();
  };

  const updateModelReviewDataToPublic = async (modelId: string, modelVersion: string) => {
    const result: any[] = [];
    const teamId = await getUserTeamId();
    const getReferences = async (refs: any[], checkedKeys = new Set<string>()) => {
      for (const ref of refs) {
        if (checkedKeys.has(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`)) continue;
        checkedKeys.add(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`);

        const refResult = await getRefData(
          ref['@refObjectId'],
          ref['@version'],
          getRefTableName(ref['@type']),
          teamId,
        );

        if (refResult.success && refResult?.data) {
          const refData = refResult?.data;
          if (refData?.stateCode !== 100 && refData?.stateCode !== 200) {
            result.push(ref);
            const json = refData?.json;
            const subRefs = getAllRefObj(json);
            await getReferences(subRefs, checkedKeys);
          }
          if (ref['@type'] === 'process data set') {
            const { data: sameModelWithProcress } = await getLifeCycleModelDetail(
              ref['@refObjectId'],
              ref['@version'],
            );
            if (sameModelWithProcress) {
              const modelRefs = getAllRefObj(sameModelWithProcress);
              await getReferences(modelRefs, checkedKeys);
            }
          }
        }
      }
    };

    const { data: lifeCycleModel, success } = await getLifeCycleModelDetail(modelId, modelVersion);
    if (success) {
      const updateModelRes = await updateLifeCycleModelJson(lifeCycleModel);
      if (!updateModelRes) {
        return;
      }
      const { newLifeCycleModel, commentReview, commentCompliance } = updateModelRes;

      if (lifeCycleModel?.stateCode !== 100 && lifeCycleModel?.stateCode !== 200) {
        result.push({
          '@refObjectId': modelId,
          '@version': modelVersion,
          '@type': 'lifeCycleModel data set',
        });
      }
      const { data: sameProcressWithModel } = await getProcessDetail(modelId, modelVersion);
      if (sameProcressWithModel) {
        if (sameProcressWithModel?.stateCode !== 100 && sameProcressWithModel?.stateCode !== 200) {
          result.push({
            '@refObjectId': sameProcressWithModel?.id,
            '@version': sameProcressWithModel?.version,
            '@type': 'process data set',
          });
        }
      }

      const modelRefs = getAllRefObj(newLifeCycleModel);
      if (modelRefs.length) {
        await getReferences(modelRefs);
        const procressRefs = modelRefs.filter((item) => item['@type'] === 'process data set');
        for (const procress of procressRefs) {
          const { data: sameModeWithProcress, success } = await getLifeCycleModelDetail(
            procress['@refObjectId'],
            procress['@version'],
          );
          if (
            success &&
            sameModeWithProcress?.stateCode !== 100 &&
            sameModeWithProcress?.stateCode !== 200
          ) {
            result.push({
              '@refObjectId': sameModeWithProcress?.id,
              '@version': sameModeWithProcress?.version,
              '@type': 'lifeCycleModel data set',
            });
          }
        }
      }
      const submodels = lifeCycleModel?.json_tg?.submodels;
      if (submodels) {
        submodels.forEach((item: any) => {
          result.push({
            '@refObjectId': item.id,
            '@version': modelVersion,
            '@type': 'process data set',
          });
        });
      }
      // Batch update the review and compliance fields of the process
      const processParams = result
        .filter((item) => item['@type'] === 'process data set')
        .map((item) => ({ id: item['@refObjectId'], version: item['@version'] }));
      await updateSubmodelProcessesWithCommentData(processParams, commentReview, commentCompliance);
    }
    for (const item of result) {
      await updateStateCodeApi(
        item['@refObjectId'],
        item['@version'],
        getRefTableName(item['@type']),
        100,
      );
    }
  };
  const approveModelReview = async () => {
    setSpinning(true);
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
    await updateModelReviewDataToPublic(dataId, dataVersion);
    if (!error && !error2) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.ReviewProcessDetail.assigned.success',
          defaultMessage: 'Review approved successfully',
        }),
      );
      setDrawerVisible(false);
      actionRef.current?.reload();
    }
    setSpinning(false);
  };

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id='pages.review.progress.editReviewer'
            defaultMessage='Edit Reviewer'
          />
        }
      >
        <Button
          shape='circle'
          size='small'
          icon={<FileSyncOutlined />}
          onClick={() => setDrawerVisible(true)}
        />
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        title={
          <FormattedMessage
            id='pages.review.progress.drawer.title'
            defaultMessage='Review Progress'
          />
        }
        width='80%'
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        styles={{ body: { paddingTop: 0 } }}
        footer={
          <Space className={styles.footer_right}>
            <Button
              type='primary'
              onClick={actionType === 'process' ? approveProcessReview : approveModelReview}
            >
              <FormattedMessage
                id='pages.review.ReviewProcessDetail.assigned.save'
                defaultMessage='Approve Review'
              />
            </Button>
            <RejectReview
              buttonType='text'
              isModel={false}
              dataId={dataId}
              dataVersion={dataId}
              reviewId={reviewId}
              key={0}
              actionRef={actionRef}
            />
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProTable<ReviewerData>
            loading={tableLoading}
            columns={columns}
            rowKey='reviewer_id'
            search={false}
            pagination={false}
            toolBarRender={() => [
              <SelectReviewer
                key={0}
                tabType='assigned'
                reviewIds={[reviewId]}
                actionRef={tableRef}
              />,
            ]}
            request={async () => {
              try {
                return await fetchTableData();
              } catch (error) {
                console.error(error);
                return {
                  data: [],
                  success: true,
                  total: 0,
                };
              }
            }}
            actionRef={tableRef}
          />
        </Spin>
      </Drawer>
    </>
  );
}
