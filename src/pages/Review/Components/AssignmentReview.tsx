import AccountView from '@/pages/Account/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import { ListPagination } from '@/services/general/data';
import {
  getLifeCycleModelSubTableDataBatch,
  getReviewsTableDataOfReviewAdmin,
  getReviewsTableDataOfReviewMember,
} from '@/services/reviews/api';
import { ReviewsTable } from '@/services/reviews/data';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Card, Col, Input, Row, Space, Spin, Table, theme } from 'antd';
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

const ExpandIconStyle = () => {
  const { token } = theme.useToken();
  return (
    <style>{`
      .review-table-with-expand-icon .ant-table-row-expand-icon:hover,
      .review-table-with-expand-icon .ant-table-row-expand-icon-expanded,
      .review-table-with-expand-icon .ant-table-row-expand-icon-expanded:hover,
      .review-table-with-expand-icon .ant-table-row-expand-icon:focus,
      .review-table-with-expand-icon .ant-table-row-expand-icon-expanded:focus {
        color: ${token.colorPrimary} !important;
      }
    `}</style>
  );
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

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [subTableData, setSubTableData] = useState<Record<string, any[]>>({});
  const [subTableLoading, setSubTableLoading] = useState<Record<string, boolean>>({});
  const [preloadedSubTableData, setPreloadedSubTableData] = useState<Record<string, any[]>>({});

  const onSearch: SearchProps['onSearch'] = () => {
    // setKeyWord(value);
    // actionRef.current?.setPageInfo?.({ current: 1 });
    // actionRef.current?.reload();
  };

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  const preloadSubTableData = async (reviewsData: ReviewsTable[]) => {
    const modelDatas = reviewsData
      .filter((r) => r.isFromLifeCycle && r.modelData)
      .map((r) => ({
        reviewId: r.id,
        modelData: r.modelData!,
      }));

    if (modelDatas.length === 0) {
      return;
    }

    try {
      const result = await getLifeCycleModelSubTableDataBatch(modelDatas, lang);
      if (result.success) {
        setPreloadedSubTableData(result.data);
      }
    } catch (error) {
      console.error('Failed to preload sub table data:', error);
    }
  };

  const loadSubTableData = async (record: ReviewsTable) => {
    const rowKey = record.id;

    if (preloadedSubTableData[rowKey]) {
      setSubTableData((prev) => ({ ...prev, [rowKey]: preloadedSubTableData[rowKey] }));
      return;
    }

    if (subTableData[rowKey]) {
      return;
    }

    setSubTableLoading((prev) => ({ ...prev, [rowKey]: true }));
  };

  const handleExpand = async (expanded: boolean, record: ReviewsTable) => {
    if (expanded && record.isFromLifeCycle) {
      await loadSubTableData(record);
    }
    const newExpandedKeys = expanded
      ? [...expandedRowKeys, record.id]
      : expandedRowKeys.filter((key) => key !== record.id);
    setExpandedRowKeys(newExpandedKeys);
  };

  const subColumns = [
    {
      title: (
        <FormattedMessage
          id='pages.review.table.column.processName'
          defaultMessage='Process Name'
        />
      ),
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: any) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ProcessView
              id={record.id}
              version={record.version}
              lang={lang}
              buttonType='icon'
              disabled={false}
              buttonTypeProp='text'
            />
            <span style={{ marginLeft: 8 }}>{record.name}</span>
          </div>
        );
      },
    },
    {
      title: <FormattedMessage id='pages.review.table.column.type' defaultMessage='Type' />,
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_: any, record: any) => {
        if (record.sourceType === 'processInstance') {
          return (
            <FormattedMessage id='pages.review.table.type.modelNode' defaultMessage='Model Node' />
          );
        }
        // submodel
        if (record.submodelType === 'primary') {
          return (
            <FormattedMessage
              id='pages.review.table.type.primaryProduct'
              defaultMessage='Primary Product'
            />
          );
        }
        return (
          <FormattedMessage
            id='pages.review.table.type.secondaryProduct'
            defaultMessage='Secondary Product'
          />
        );
      },
    },
  ];

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
                <ReviewProgress
                  actionRef={actionRef}
                  tabType={tableType}
                  reviewId={record.id}
                  dataId={record.json?.data?.id}
                  dataVersion={record.json?.data?.version}
                  actionType={record.isFromLifeCycle ? 'model' : 'process'}
                />
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
        return <FormattedMessage id='pages.review.tabs.rejected' defaultMessage='Rejected' />;
      case 'admin-rejected':
        return <FormattedMessage id='pages.review.tabs.rejectedTask' defaultMessage='Rejected' />;
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
        className='review-table-with-expand-icon'
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        expandable={{
          expandedRowKeys,
          onExpand: handleExpand,
          rowExpandable: (record) => record.isFromLifeCycle === true,
          expandedRowRender: (record) => {
            if (subTableLoading[record.id]) {
              return (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin />
                </div>
              );
            }
            const data = subTableData[record.id] || [];
            return (
              <Table
                columns={subColumns}
                dataSource={data}
                pagination={false}
                rowKey='id'
                size='small'
                style={{ margin: '0 48px' }}
              />
            );
          },
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
            setPreloadedSubTableData({});
            const result = await getReviewsTableData(params, sort);
            if (result.data && result.data.length > 0) {
              preloadSubTableData(result.data);
            }
            return result;
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
      <ExpandIconStyle />
    </>
  );
};

export default AssignmentReview;
