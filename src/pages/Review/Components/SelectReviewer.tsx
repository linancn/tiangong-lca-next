import { addCommentApi } from '@/services/comments/api';
import { updateReviewApi } from '@/services/reviews/api';
import { getReviewMembersApi } from '@/services/roles/api';
import { TeamMemberTable } from '@/services/teams/data';
import styles from '@/style/custom.less';
import { AuditOutlined, CloseOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, message, Space, Spin, Tooltip } from 'antd';
import { useState } from 'react';

type SelectReviewerProps = {
  reviewIds: React.Key[];
  actionRef: any;
};

export default function SelectReviewer({ reviewIds, actionRef }: SelectReviewerProps) {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [spinning, setSpinning] = useState(false);

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

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

  const addComment = async (data: any) => {
    const commentData: any[] = [];
    data?.forEach((item: any) => {
      item?.reviewer_id?.forEach((id: string) => {
        commentData.push({
          review_id: item?.id,
          reviewer_id: id,
          state_code: 0,
        });
      });
    });
    const { error } = await addCommentApi(commentData);
    if (!error) {
      setSelectedRowKeys([]);
      setDrawerVisible(false);
      actionRef.current?.reload();
    }
  };

  const handleTemporarySave = async () => {
    setSpinning(true);
    const { error, data } = await updateReviewApi(reviewIds, {
      reviewer_id: selectedRowKeys,
    });
    if (!error) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.temporarySaveSuccess',
          defaultMessage: 'Temporary save success',
        }),
      );
      await addComment(data);
    }
    setSpinning(false);
  };

  const handleSave = async () => {
    setSpinning(true);
    const { error, data } = await updateReviewApi(reviewIds, {
      reviewer_id: selectedRowKeys,
      state_code: 1,
    });
    if (!error) {
      message.success(
        intl.formatMessage({
          id: 'pages.review.saveSuccess',
          defaultMessage: 'Save success',
        }),
      );
      await addComment(data);
    }
    setSpinning(false);
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
          onClick={() => setDrawerVisible(true)}
          type='text'
          icon={<AuditOutlined />}
          size='small'
        />
      </Tooltip>
      <Spin spinning={spinning}>
        <Drawer
          destroyOnClose={true}
          styles={{ body: { paddingTop: 0 } }}
          getContainer={() => document.body}
          title={
            <FormattedMessage id='pages.review.drawer.title' defaultMessage='Select Reviewer' />
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
          maskClosable={true}
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          footer={
            <Space size={'middle'} className={styles.footer_right}>
              <Button onClick={() => setDrawerVisible(false)}>
                <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
              </Button>
              <Button onClick={handleTemporarySave} disabled={selectedRowKeys.length === 0}>
                <FormattedMessage id='pages.button.temporarySave' defaultMessage='Temporary Save' />
              </Button>
              <Button onClick={handleSave} type='primary' disabled={selectedRowKeys.length === 0}>
                <FormattedMessage id='pages.button.save' defaultMessage='Save' />
              </Button>
            </Space>
          }
        >
          <ProTable<TeamMemberTable>
            rowKey='user_id'
            search={false}
            options={{ fullScreen: true, reload: true }}
            rowSelection={{
              selectedRowKeys,
              onChange: handleRowSelectionChange,
            }}
            request={async (params, sort) => {
              const result = await getReviewMembersApi(params, sort, 'review-member');
              return {
                data: result.data || [],
                success: result.success,
                total: result.total,
              };
            }}
            columns={columns}
          />
        </Drawer>
      </Spin>
    </>
  );
}
