import type { refDataType } from '@/pages/Utils/review';
import {
  ConcurrencyController,
  dealModel,
  dealProcress,
  getAllRefObj,
  getRefTableName,
} from '@/pages/Utils/review';
import { getRefData, updateDateToReviewState } from '@/services/general/api';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import { getProcessDetail } from '@/services/processes/api';
import { getReviewsDetail, updateReviewApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { FileExcelOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Form, FormInstance, Input, message, Modal, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface RejectReviewProps {
  reviewId: string;
  dataId: string;
  dataVersion: string;
  isModel: boolean;
  actionRef: any;
}

const RejectReview: React.FC<RejectReviewProps> = ({
  reviewId,
  dataId,
  dataVersion,
  isModel,
  actionRef,
}) => {
  const formRef = useRef<FormInstance>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
      actionRef?.current?.reload();
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const updateUnderReviewToUnReview = async (underReview: refDataType[]) => {
    const controller = new ConcurrencyController(5);
    for (const item of underReview) {
      const updateData = {
        state_code: 0,
      };

      controller.add(async () => {
        return await updateDateToReviewState(
          item['@refObjectId'],
          item['@version'],
          getRefTableName(item['@type']),
          updateData,
        );
      });
    }
    await controller.waitForAll();
  };

  const getUnderReviewReferences = async (
    refs: any[],
    refMaps: Map<string, any>,
    userTeamId: string,
    underReview: refDataType[],
    requestKeysSet?: Set<string>,
  ): Promise<undefined> => {
    const controller = new ConcurrencyController(5);
    const requestKeys = requestKeysSet || new Set<string>();
    const handelSameModelWithProcress = async (ref: refDataType) => {
      if (ref['@type'] === 'process data set') {
        const { data: sameModelWithProcress, success } = await getLifeCycleModelDetail(
          ref['@refObjectId'],
          ref['@version'],
        );
        if (success && sameModelWithProcress) {
          if (
            sameModelWithProcress?.stateCode >= 20 &&
            sameModelWithProcress?.stateCode < 100 &&
            !underReview.find(
              (item) =>
                item['@refObjectId'] === ref['@refObjectId'] &&
                item['@version'] === ref['@version'],
            )
          ) {
            underReview.push({
              '@type': 'lifeCycleModel data set',
              '@refObjectId': sameModelWithProcress?.id,
              '@version': sameModelWithProcress?.version,
            });
          }
          const modelRefs = getAllRefObj(sameModelWithProcress);
          await getUnderReviewReferences(modelRefs, refMaps, userTeamId, underReview, requestKeys);
        }
      }
    };

    const processRef = async (ref: any) => {
      if (refMaps.has(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`)) {
        await handelSameModelWithProcress(ref);
        return;
      }
      const refResult = await getRefData(
        ref['@refObjectId'],
        ref['@version'],
        getRefTableName(ref['@type']),
        userTeamId,
      );
      refMaps.set(`${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`, refResult?.data);

      if (refResult.success && refResult?.data) {
        const refData = refResult?.data;
        if (refData?.stateCode >= 20 && refData?.stateCode < 100) {
          if (
            !underReview.find(
              (item) =>
                item['@refObjectId'] === ref['@refObjectId'] &&
                item['@version'] === ref['@version'],
            )
          ) {
            underReview.push(ref);
            await getUnderReviewReferences(
              getAllRefObj(refData),
              refMaps,
              userTeamId,
              underReview,
              requestKeys,
            );
          }
        }
        await handelSameModelWithProcress(ref);
      }
    };

    for (const ref of refs) {
      const key = `${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`;
      if (!requestKeys.has(key)) {
        requestKeys.add(key);
        controller.add(() => processRef(ref));
      }
    }

    await controller.waitForAll();
  };

  const hendleRejectProcress = async () => {
    const { data: processDetail } = await getProcessDetail(dataId, dataVersion);
    if (!processDetail) {
      return;
    }
    const unReview: any[] = []; // stateCode < 20
    const underReview: any[] = []; // stateCode >= 20 && stateCode < 100
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];

    dealProcress(processDetail, unReview, underReview, unRuleVerification, nonExistentRef);

    const userTeamId = await getUserTeamId();
    const refObjs = getAllRefObj(processDetail);
    await getUnderReviewReferences(refObjs, new Map<string, any>(), userTeamId, underReview);

    await updateUnderReviewToUnReview(underReview);
  };

  const hendleRejectModel = async () => {
    const { data: modelDetail, success } = await getLifeCycleModelDetail(dataId, dataVersion);
    if (!success) {
      return;
    }
    const unReview: any[] = []; // stateCode < 20
    const underReview: any[] = []; // stateCode >= 20 && stateCode < 100
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];
    dealModel(modelDetail, unReview, underReview, unRuleVerification, nonExistentRef);
    const { data: sameProcressWithModel } = await getProcessDetail(
      modelDetail?.id,
      modelDetail?.version,
    );
    dealProcress(sameProcressWithModel, unReview, underReview, unRuleVerification, nonExistentRef);

    const refObjs = getAllRefObj(modelDetail);
    const userTeamId = await getUserTeamId();
    const refsMap = new Map<string, any>();
    await getUnderReviewReferences(refObjs, refsMap, userTeamId, underReview);
    const submodels = modelDetail?.json_tg?.submodels;
    if (submodels) {
      submodels.forEach((item: any) => {
        underReview.push({
          '@refObjectId': item.id,
          '@version': modelDetail?.version,
          '@type': 'process data set',
        });
      });
    }
    await updateUnderReviewToUnReview(underReview);
  };

  const handleOk = async () => {
    try {
      const values = await formRef?.current?.validateFields();
      setLoading(true);
      const oldReviews = await getReviewsDetail(reviewId);
      const { json: oldReviewJson } = oldReviews ?? {};
      const { error } = await updateReviewApi([reviewId], {
        state_code: -1,
        json: {
          ...oldReviewJson,
          comment: {
            message: values.reason,
          },
        },
      });

      if (!error) {
        if (isModel) {
          await hendleRejectModel();
        } else {
          await hendleRejectProcress();
        }
        message.success(
          intl.formatMessage({
            id: 'component.rejectReview.success',
            defaultMessage: 'Rejected successfully!',
          }),
        );
        formRef?.current?.resetFields();
        setOpen(false);
      }
    } catch (error) {
      message.error(
        intl.formatMessage({
          id: 'component.rejectReview.error',
          defaultMessage: 'Failed to reject, please try again!',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip
        title={intl.formatMessage({
          id: 'component.rejectReview.button.tooltip',
          defaultMessage: 'Reject',
        })}
      >
        <Button size='small' shape='circle' icon={<FileExcelOutlined />} onClick={handleOpen} />
      </Tooltip>
      <Modal
        title={
          <FormattedMessage
            id='component.rejectReview.modal.title'
            defaultMessage='Reject Review'
          />
        }
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        confirmLoading={loading}
        okText={
          <FormattedMessage
            id='component.rejectReview.modal.confirm'
            defaultMessage='Confirm Reject'
          />
        }
        cancelText={
          <FormattedMessage id='component.rejectReview.modal.cancel' defaultMessage='Cancel' />
        }
        width={600}
      >
        <Form ref={formRef} layout='vertical'>
          <Form.Item
            name='reason'
            label={
              <FormattedMessage
                id='component.rejectReview.reason.label'
                defaultMessage='Reject Reason'
              />
            }
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id='component.rejectReview.reason.required'
                    defaultMessage='Please enter the reject reason!'
                  />
                ),
              },
              {
                max: 500,
                message: (
                  <FormattedMessage
                    id='component.rejectReview.reason.maxLength'
                    defaultMessage='Reject reason cannot exceed 500 characters!'
                  />
                ),
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={intl.formatMessage({
                id: 'component.rejectReview.reason.placeholder',
                defaultMessage:
                  'Please provide detailed reasons for rejection so that the submitter can understand what needs to be modified...',
              })}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RejectReview;
