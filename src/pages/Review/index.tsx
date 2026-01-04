import { getReviewUserRoleApi } from '@/services/roles/api';
import { PageContainer } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Spin, Tabs } from 'antd';
import { useEffect, useRef, useState } from 'react';
import AssignmentReview from './Components/AssignmentReview';
import ReviewMember from './Components/ReviewMember';

const Review = () => {
  const [activeTabKey, setActiveTabKey] = useState('unassigned');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<{ user_id: string; role: string } | null>(null);
  const actionRef = useRef<any>();
  const unassignedTableRef = useRef<any>();
  const assignedTableRef = useRef<any>();
  const reviewedTableRef = useRef<any>();
  const pendingTableRef = useRef<any>();
  const rejectedTableRef = useRef<any>();

  const checkUserAuth = async () => {
    setLoading(true);
    try {
      const userData = await getReviewUserRoleApi();
      setUserData(userData);
      unassignedTableRef.current?.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserAuth();
  }, []);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
    switch (key) {
      case 'unassigned':
        unassignedTableRef?.current?.reload();
        break;
      case 'assigned':
        assignedTableRef?.current?.reload();
        break;
      case 'reviewed':
        reviewedTableRef?.current?.reload();
        break;
      case 'pending':
        pendingTableRef?.current?.reload();
        break;
      case 'rejected':
        rejectedTableRef?.current?.reload();
        break;
      case 'members':
        actionRef?.current?.reload();
        break;
    }
  };

  const tabs =
    userData?.role === 'review-admin'
      ? [
          {
            key: 'unassigned',
            label: <FormattedMessage id='pages.review.tabs.unassigned' />,
            children: (
              <AssignmentReview
                actionRef={unassignedTableRef}
                tableType='unassigned'
                userData={userData}
              />
            ),
          },
          {
            key: 'assigned',
            label: <FormattedMessage id='pages.review.tabs.assigned' />,
            children: (
              <AssignmentReview
                actionRef={assignedTableRef}
                tableType='assigned'
                userData={userData}
              />
            ),
          },
          {
            key: 'rejected',
            label: <FormattedMessage id='pages.review.tabs.rejectedTask' />,
            children: (
              <AssignmentReview
                actionRef={rejectedTableRef}
                tableType='admin-rejected'
                userData={userData}
              />
            ),
          },
          {
            key: 'members',
            label: <FormattedMessage id='pages.review.tabs.members' />,
            children: <ReviewMember userData={userData} />,
          },
        ]
      : [
          {
            key: 'reviewed',
            label: <FormattedMessage id='pages.review.tabs.reviewed' />,
            children: (
              <AssignmentReview
                actionRef={reviewedTableRef}
                tableType='reviewed'
                userData={userData}
              />
            ),
          },
          {
            key: 'pending',
            label: <FormattedMessage id='pages.review.tabs.pending' />,
            children: (
              <AssignmentReview
                actionRef={pendingTableRef}
                tableType='pending'
                userData={userData}
              />
            ),
          },
          {
            key: 'rejected',
            label: <FormattedMessage id='pages.review.tabs.rejected' />,
            children: (
              <AssignmentReview
                actionRef={rejectedTableRef}
                tableType='reviewer-rejected'
                userData={userData}
              />
            ),
          },
        ];

  useEffect(() => {
    if (userData?.role === 'review-member' && activeTabKey !== 'reviewed') {
      setActiveTabKey('reviewed');
      if (reviewedTableRef.current) {
        reviewedTableRef.current.reload();
      }
    }
    if (userData?.role === 'review-admin' && activeTabKey !== 'unassigned') {
      setActiveTabKey('unassigned');
      if (unassignedTableRef.current) {
        unassignedTableRef.current.reload();
      }
    }
  }, [userData]);

  return (
    <PageContainer title={<FormattedMessage id='pages.review.title' />}>
      <Spin spinning={loading}>
        <Tabs activeKey={activeTabKey} onChange={onTabChange} tabPosition='left' items={tabs} />
      </Spin>
    </PageContainer>
  );
};

export default Review;
