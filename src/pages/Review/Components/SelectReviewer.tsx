import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import { getReviewerIdsByReviewId } from '@/services/comments/api';
import {
  assignReviewersApi,
  getReviewerIdsApi,
  getReviewsDetail,
  saveReviewAssignmentDraftApi,
} from '@/services/reviews/api';
import { getReviewMembersApi } from '@/services/roles/api';
import { TeamMemberTable } from '@/services/teams/data';
import styles from '@/style/custom.less';
import { CloseOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, DatePicker, Drawer, message, Space, Spin, theme, Tooltip } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useRef, useState } from 'react';

type SelectReviewerProps = {
  reviewIds: React.Key[];
  actionRef: any;
  tabType: 'unassigned' | 'assigned';
};

export default function SelectReviewer({ reviewIds, actionRef, tabType }: SelectReviewerProps) {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const defaultSelectedRowKeys = useRef<React.Key[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reviewDeadline, setReviewDeadline] = useState<Dayjs | null>(dayjs().add(15, 'day'));
  const { token } = theme.useToken();
  const tableRef = useRef<ActionType>();
  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );
  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  useEffect(() => {
    if (!drawerVisible) {
      setSelectedRowKeys([]);
      defaultSelectedRowKeys.current = [];
      setReviewDeadline(dayjs().add(15, 'day'));
      return;
    }
    const init = async () => {
      setSpinning(true);
      switch (tabType) {
        case 'unassigned': {
          const result = await getReviewerIdsApi(reviewIds);
          setSelectedRowKeys(result);
          tableRef.current?.reload();
          break;
        }
        case 'assigned': {
          const result = await getReviewerIdsByReviewId(reviewIds[0] as string);
          const keys = (result ?? [])
            .filter((item: any) => item.state_code >= 0)
            .map((item: any) => item.reviewer_id);
          const riviewDetail = await getReviewsDetail(reviewIds[0] as string);
          if (riviewDetail?.deadline) {
            setReviewDeadline(dayjs(riviewDetail.deadline));
          }
          defaultSelectedRowKeys.current = keys;
          tableRef.current?.reload();
          break;
        }
      }
      setSpinning(false);
    };
    init();
  }, [drawerVisible, reviewIds, tabType]);

  const columns: ProColumns<TeamMemberTable>[] = [
    {
      title: <FormattedMessage id='pages.review.members.email' defaultMessage='Email' />,
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: <FormattedMessage id='pages.review.members.memberName' defaultMessage='Member Name' />,
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: <FormattedMessage id='pages.review.members.role' defaultMessage='Role' />,
      dataIndex: 'role',
      key: 'role',
      render: (_, record) => (
        <span>
          {record.role === 'review-admin' ? (
            <FormattedMessage id='pages.review.members.role.admin' defaultMessage='Admin' />
          ) : record.role === 'review-member' ? (
            <FormattedMessage id='pages.review.members.role.member' defaultMessage='Member' />
          ) : (
            <></>
          )}
        </span>
      ),
    },
  ];

  const handleTemporarySave = async () => {
    setSpinning(true);
    try {
      const result = await saveReviewAssignmentDraftApi(reviewIds, selectedRowKeys.map(String));

      if (!result.error) {
        message.success(
          intl.formatMessage({
            id: 'pages.review.temporarySaveSuccess',
            defaultMessage: 'Temporary save success',
          }),
        );
        setDrawerVisible(false);
        actionRef.current?.reload();
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('临时保存失败:', error);
      message.error(
        intl.formatMessage({
          id: 'pages.review.temporarySaveError',
          defaultMessage: 'Temporary save failed',
        }),
      );
    } finally {
      setSpinning(false);
    }
  };

  const handleSave = async () => {
    setSpinning(true);
    try {
      const reviewerIds = Array.from(
        new Set(
          (tabType === 'unassigned'
            ? selectedRowKeys
            : [...defaultSelectedRowKeys.current, ...selectedRowKeys]
          ).map(String),
        ),
      );

      const result = await assignReviewersApi(
        reviewIds,
        reviewerIds,
        reviewDeadline?.toISOString() ?? null,
      );

      if (!result.error) {
        message.success(
          intl.formatMessage({
            id: 'pages.review.saveSuccess',
            defaultMessage: 'Save success',
          }),
        );
        setDrawerVisible(false);
        actionRef.current?.reload();
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error(
        intl.formatMessage({
          id: 'pages.review.saveError',
          defaultMessage: 'Save failed',
        }),
      );
    } finally {
      setSpinning(false);
    }
  };

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id='pages.review.selectReviewer.button'
            defaultMessage='Select Reviewer'
          />
        }
      >
        <Button
          style={{ width: 'inherit' }}
          onClick={() => setDrawerVisible(true)}
          type='text'
          icon={<UsergroupAddOutlined />}
          size='large'
        />
      </Tooltip>
      <Drawer
        destroyOnHidden
        styles={{ body: { paddingTop: 0 } }}
        getContainer={() => document.body}
        title={<FormattedMessage id='pages.review.drawer.title' defaultMessage='Select Reviewer' />}
        width='90%'
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
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {tabType === 'unassigned' && (
              <Button onClick={handleTemporarySave} disabled={selectedRowKeys.length === 0}>
                <FormattedMessage id='pages.button.temporarySave' defaultMessage='Temporary Save' />
              </Button>
            )}
            <Button
              onClick={handleSave}
              type='primary'
              disabled={tabType === 'unassigned' ? selectedRowKeys.length === 0 : false}
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProTable<TeamMemberTable>
            rowKey='user_id'
            search={false}
            manualRequest={true}
            actionRef={tableRef}
            options={{ fullScreen: true, reload: true }}
            toolbar={{
              title: (
                <Space align='center'>
                  <span style={{ fontSize: token.fontSize }}>
                    <FormattedMessage
                      id='pages.review.deadline'
                      defaultMessage='Review Deadline:'
                    />
                  </span>
                  <DatePicker
                    value={reviewDeadline}
                    onChange={(date) => setReviewDeadline(date)}
                    showTime
                    format='YYYY-MM-DD HH:mm:ss'
                    placeholder={intl.formatMessage({
                      id: 'pages.review.deadline.placeholder',
                      defaultMessage: 'Select review deadline',
                    })}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    size='middle'
                    allowClear
                  />
                </Space>
              ),
            }}
            tableAlertOptionRender={tableAlertOptionRender}
            rowSelection={{
              selectedRowKeys,
              onChange: handleRowSelectionChange,
            }}
            request={async (params, sort) => {
              const result = await getReviewMembersApi(params, sort, 'review-member');
              const data = result.data.filter(
                (item: any) => !defaultSelectedRowKeys.current.includes(item.user_id),
              );
              return {
                data,
                success: result.success,
                total: result.total,
              };
            }}
            columns={columns}
          />
        </Spin>
      </Drawer>
    </>
  );
}
