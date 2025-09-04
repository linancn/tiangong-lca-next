import { addCommentApi } from '@/services/comments/api';
import {
  getReviewerIdsApi,
  getReviewsDetailByReviewIds,
  updateReviewApi,
} from '@/services/reviews/api';
import { getReviewMembersApi } from '@/services/roles/api';
import { TeamMemberTable } from '@/services/teams/data';
import { getUserId, getUsersByIds } from '@/services/users/api';
import styles from '@/style/custom.less';
import { CloseOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, message, Space, Spin, Tooltip } from 'antd';
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

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  useEffect(() => {
    if (!drawerVisible) {
      setSelectedRowKeys([]);
      defaultSelectedRowKeys.current = [];
      return;
    }
    const getReviewerIds = async () => {
      const result = await getReviewerIdsApi(reviewIds);
      switch (tabType) {
        case 'unassigned':
          setSelectedRowKeys(result);
          break;
        case 'assigned':
          defaultSelectedRowKeys.current = result;
          break;
      }
    };
    getReviewerIds();
  }, [drawerVisible]);

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
    const { error } = await addCommentApi(data);
    if (!error) {
      setDrawerVisible(false);
      actionRef.current?.reload();
    }
  };

  const handleTemporarySave = async () => {
    setSpinning(true);
    try {
      const reviews = await getReviewsDetailByReviewIds(reviewIds);

      if (!reviews || reviews.length === 0) {
        console.error('未找到对应的review数据');
        return;
      }
      const userId = await getUserId();
      const user = await getUsersByIds([userId]);
      const updatePromises = reviews.map(async (review: any) => {
        if (review && review.id) {
          const updatedJson = {
            ...review.json,
            logs: [
              ...(review.json.logs ?? []),
              {
                action: 'assign_reviewers_temporary',
                time: new Date(),
                user: {
                  id: userId,
                  display_name: user?.[0]?.display_name,
                },
              },
            ],
          };

          const { error } = await updateReviewApi([review.id], {
            reviewer_id: selectedRowKeys,
            json: updatedJson,
          });

          if (error) {
            console.error(`更新review ${review.id} 失败:`, error);
            throw error;
          }

          return { id: review.id, success: true };
        }
        return { id: review?.id, success: false };
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result.success).length;

      if (successCount === reviews.length) {
        message.success(
          intl.formatMessage({
            id: 'pages.review.temporarySaveSuccess',
            defaultMessage: 'Temporary save success',
          }),
        );
        setDrawerVisible(false);
        actionRef.current?.reload();
      } else {
        throw new Error('部分保存成功，成功保存 ${successCount}/${reviews.length} 条记录');
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
      const reviews = await getReviewsDetailByReviewIds(reviewIds);

      if (!reviews || reviews.length === 0) {
        console.error('未找到对应的review数据');
        return;
      }
      const userId = await getUserId();
      const user = await getUsersByIds([userId]);
      const commentData: any[] = [];

      const updatePromises = reviews.map(async (review: any) => {
        if (review && review.id) {
          const updatedJson = {
            ...review.json,
            logs: [
              ...(review.json.logs ?? []),
              {
                action: 'assign_reviewers',
                time: new Date(),
                user: {
                  id: userId,
                  display_name: user?.[0]?.display_name,
                },
              },
            ],
          };

          const { error, data } = await updateReviewApi([review.id], {
            reviewer_id:
              tabType === 'unassigned'
                ? selectedRowKeys
                : [...defaultSelectedRowKeys.current, ...selectedRowKeys],
            state_code: 1,
            json: updatedJson,
          });

          selectedRowKeys.forEach((userId) => {
            commentData.push({
              review_id: review.id,
              reviewer_id: userId,
              state_code: 0,
            });
          });

          if (error) {
            console.error(`更新review ${review.id} 失败:`, error);
            throw error;
          }

          return { id: review.id, success: true, data };
        }
        return { id: review?.id, success: false };
      });

      const results = await Promise.all(updatePromises);
      const successResults = results.filter((result) => result.success);
      const successCount = successResults.length;

      if (successCount === reviews.length) {
        message.success(
          intl.formatMessage({
            id: 'pages.review.saveSuccess',
            defaultMessage: 'Save success',
          }),
        );

        await addComment(commentData);
        setDrawerVisible(false);
        actionRef.current?.reload();
      } else {
        throw new Error(`部分保存成功，成功保存 ${successCount}/${reviews.length} 条记录`);
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
              {tabType === 'unassigned' && (
                <Button onClick={handleTemporarySave} disabled={selectedRowKeys.length === 0}>
                  <FormattedMessage
                    id='pages.button.temporarySave'
                    defaultMessage='Temporary Save'
                  />
                </Button>
              )}
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
              const data = result.data.filter(
                (item: any) => !defaultSelectedRowKeys.current.includes(item.user_id),
              );
              return {
                data: data || [],
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
