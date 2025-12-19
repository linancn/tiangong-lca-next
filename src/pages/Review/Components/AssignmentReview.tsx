import AccountView from '@/pages/Account/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import { ListPagination } from '@/services/general/data';
import {
  getReviewsTableDataOfReviewAdmin,
  getReviewsTableDataOfReviewMember,
} from '@/services/reviews/api';
import { ReviewsTable } from '@/services/reviews/data';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Card, Col, Input, Row, Space } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import { SortOrder } from 'antd/es/table/interface';
import { useState } from 'react';
import RejectReview from './RejectReview';
import ReviewLifeCycleModelsDetail from './reviewLifeCycleModels';
import ReviewProcessDetail from './reviewProcess';
import ReviewProgress from './ReviewProgress';
import SelectReviewer from './SelectReviewer';

const { Search } = Input;

type AssignmentReviewProps = {
  userData: { user_id: string; role: string } | null;
  tableType:
    | 'unassigned'
    | 'assigned'
    | 'reviewed'
    | 'pending'
    | 'reviewer-rejected'
    | 'admin-rejected';
  actionRef: any;
  actionFrom?: 'reviewMember';
  hideReviewButton?: boolean;
};

const AssignmentReview = ({
  userData,
  tableType,
  actionRef,
  actionFrom,
  hideReviewButton = false,
}: AssignmentReviewProps) => {
  // const intl = useIntl();
  const { locale } = useIntl();
  const lang = locale === 'zh-CN' ? 'zh' : 'en';
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const intl = useIntl();

  const onSearch: SearchProps['onSearch'] = () => {
    // setKeyWord(value);
    // actionRef.current?.setPageInfo?.({ current: 1 });
    // actionRef.current?.reload();
  };

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  const columns: ProColumns<ReviewsTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='pages.review.table.column.processName'
          defaultMessage='Process Name'
        />
      ),
      dataIndex: 'processName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <div key={0} style={{ display: 'flex' }}>
            {row.name}
            {row?.isFromLifeCycle ? (
              <LifeCycleModelView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
                buttonTypeProp='text'
              />
            ) : (
              <ProcessView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
                disabled={false}
                buttonTypeProp='text'
              />
            )}
          </div>,
        ];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.review.table.column.userName' defaultMessage='User Name' />
      ),
      dataIndex: 'userName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <span key={0}>
            {row.userName}
            <AccountView userId={row.json?.user?.id} buttonType='icon' buttonTypeProp='text' />
          </span>,
        ];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.review.table.column.createAt' defaultMessage='Create At' />
      ),
      dataIndex: 'createAt',
      sorter: false,
      search: false,
      valueType: 'dateTime',
    },
  ];

  if (tableType === 'unassigned') {
    columns.push({
      title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
      dataIndex: 'actions',
      search: false,
      render: (_, record) => {
        return [
          <RejectReview
            isModel={record.isFromLifeCycle}
            dataId={record.json?.data?.id}
            dataVersion={record.json?.data?.version}
            reviewId={record.id}
            key={0}
            actionRef={actionRef}
          />,
        ];
      },
    });
  }
  if (tableType === 'assigned') {
    columns.push(
      ...[
        {
          title: (
            <FormattedMessage id='pages.review.table.column.deadline' defaultMessage='Deadline' />
          ),
          dataIndex: 'deadline',
          sorter: false,
          search: false,
          valueType: 'dateTime' as const,
        },
        {
          title: (
            <FormattedMessage id='pages.review.progress.button' defaultMessage='Review Progress' />
          ),
          dataIndex: 'progress',
          sorter: false,
          search: false,
          render: (_: any, record: ReviewsTable) => {
            const total = record.comments?.filter((item: any) => item.state_code >= 0).length ?? 0;
            const reviewed =
              record.comments?.filter((item: any) => item.state_code === 1).length ?? 0;
            return [<Space key={0}>{`${reviewed}/${total}`}</Space>];
          },
        },
        {
          title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
          dataIndex: 'actions',
          search: false,
          render: (_: any, record: ReviewsTable) => {
            return [
              <Space key={0}>
                {record.isFromLifeCycle ? (
                  <ReviewLifeCycleModelsDetail
                    tabType='assigned'
                    type='view'
                    actionRef={actionRef}
                    id={record.json?.data?.id}
                    version={record.json?.data?.version}
                    lang={lang}
                    reviewId={record.id}
                  />
                ) : (
                  <ReviewProcessDetail
                    tabType='assigned'
                    type='view'
                    actionRef={actionRef}
                    id={record.json?.data?.id}
                    version={record.json?.data?.version}
                    lang={lang}
                    reviewId={record.id}
                  />
                )}
                <ReviewProgress reviewId={record.id} />
              </Space>,
            ];
          },
        },
      ],
    );
  }

  if (tableType === 'reviewed' || tableType === 'pending') {
    columns.push(
      ...[
        {
          title: (
            <FormattedMessage id='pages.review.table.column.deadline' defaultMessage='Deadline' />
          ),
          dataIndex: 'deadline',
          sorter: false,
          search: false,
          valueType: 'dateTime' as const,
        },
        {
          title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
          dataIndex: 'actions',
          search: false,
          render: (_: any, record: ReviewsTable) => {
            return [
              <Space key={0}>
                {record.isFromLifeCycle ? (
                  <>
                    {!hideReviewButton && (
                      <ReviewLifeCycleModelsDetail
                        type='edit'
                        id={record.json?.data?.id}
                        version={record.json?.data?.version}
                        lang={lang}
                        reviewId={record.id}
                        tabType='review'
                        actionRef={actionRef}
                      />
                    )}

                    <ReviewLifeCycleModelsDetail
                      reviewId={record.id}
                      tabType='review'
                      type='view'
                      id={record.json?.data?.id}
                      version={record.json?.data?.version}
                      lang={lang}
                      actionRef={actionRef}
                    />
                  </>
                ) : (
                  <>
                    {!hideReviewButton && (
                      <ReviewProcessDetail
                        tabType='review'
                        type='edit'
                        actionRef={actionRef}
                        id={record.json?.data?.id}
                        version={record.json?.data?.version}
                        lang={lang}
                        reviewId={record.id}
                      />
                    )}
                    <ReviewProcessDetail
                      hideButton={true}
                      tabType='review'
                      type='view'
                      actionRef={actionRef}
                      id={record.json?.data?.id}
                      version={record.json?.data?.version}
                      lang={lang}
                      reviewId={record.id}
                    />
                  </>
                )}
              </Space>,
            ];
          },
        },
      ],
    );
  }

  if (tableType === 'reviewer-rejected' || tableType === 'admin-rejected') {
    columns.push(
      ...[
        {
          title: (
            <FormattedMessage id='pages.review.table.column.deadline' defaultMessage='Deadline' />
          ),
          dataIndex: 'deadline',
          sorter: false,
          search: false,
          valueType: 'dateTime' as const,
        },
        {
          title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
          dataIndex: 'actions',
          search: false,
          render: (_: any, record: ReviewsTable) => {
            return [
              <Space key={0}>
                {record.isFromLifeCycle ? (
                  <ReviewLifeCycleModelsDetail
                    reviewId={record.id}
                    tabType={tableType}
                    type='view'
                    id={record.json?.data?.id}
                    version={record.json?.data?.version}
                    lang={lang}
                    actionRef={actionRef}
                  />
                ) : (
                  <ReviewProcessDetail
                    hideButton={true}
                    tabType={tableType}
                    type='view'
                    actionRef={actionRef}
                    id={record.json?.data?.id}
                    version={record.json?.data?.version}
                    lang={lang}
                    reviewId={record.id}
                  />
                )}
              </Space>,
            ];
          },
        },
      ],
    );
  }

  const getSubTitle = () => {
    switch (tableType) {
      case 'unassigned':
        return <FormattedMessage id='pages.review.tabs.unassigned' defaultMessage='Unassigned' />;
      case 'assigned':
        return <FormattedMessage id='pages.review.tabs.assigned' defaultMessage='Assigned' />;
      case 'reviewed':
        return <FormattedMessage id='pages.review.tabs.reviewed' defaultMessage='Reviewed' />;
      case 'pending':
        return <FormattedMessage id='pages.review.tabs.pending' defaultMessage='Pending Review' />;
      case 'reviewer-rejected':
      case 'admin-rejected':
        return <FormattedMessage id='pages.review.tabs.rejected' defaultMessage='Rejected' />;
      default:
    }
  };

  const getReviewsTableData = async (
    params: {
      pageSize: number;
      current: number;
    },
    sort: Record<string, SortOrder>,
  ) => {
    if (tableType === 'unassigned' || tableType === 'assigned' || tableType === 'admin-rejected') {
      return getReviewsTableDataOfReviewAdmin(params, sort, tableType, lang);
    }

    if (tableType === 'pending' || tableType === 'reviewed' || tableType === 'reviewer-rejected') {
      return getReviewsTableDataOfReviewMember(
        params,
        sort,
        tableType,
        lang,
        actionFrom === 'reviewMember' ? { user_id: userData?.user_id } : undefined,
      );
    }

    return Promise.resolve({
      success: true,
      data: [],
      total: 0,
    });
  };

  return (
    <>
      {!actionFrom && (
        <Card>
          <Row align={'middle'}>
            <Col flex='auto' style={{ marginRight: '10px' }}>
              <Search
                size={'large'}
                placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                onSearch={onSearch}
                enterButton
              />
            </Col>
          </Row>
        </Card>
      )}
      <ProTable<ReviewsTable, ListPagination>
        loading={tableLoading}
        columns={columns}
        rowKey='id'
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => {
          if (selectedRowKeys && selectedRowKeys?.length > 0 && tableType === 'unassigned') {
            return [
              <SelectReviewer
                tabType='unassigned'
                actionRef={actionRef}
                reviewIds={selectedRowKeys}
                key={0}
              />,
            ];
          }
          return [];
        }}
        headerTitle={
          <>
            {!actionFrom && (
              <>
                <FormattedMessage id='menu.review' defaultMessage='Review Management' /> /{' '}
                {getSubTitle()}
              </>
            )}
          </>
        }
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          try {
            if (!userData?.role) {
              return {
                data: [],
                success: true,
                total: 0,
              };
            }
            setTableLoading(true);
            setSelectedRowKeys([]);
            return await getReviewsTableData(params, sort);
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
        }}
        actionRef={actionRef}
        rowSelection={
          tableType === 'unassigned'
            ? {
                selectedRowKeys,
                onChange: handleRowSelectionChange,
              }
            : undefined
        }
      />
    </>
  );
};

export default AssignmentReview;
