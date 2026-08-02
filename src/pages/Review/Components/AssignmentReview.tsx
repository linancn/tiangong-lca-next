import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import AccountView from '@/pages/Account/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ProcessView from '@/pages/Processes/Components/view';
import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { genProcessName } from '@/services/processes/util';
import {
  getReviewsTableDataOfReviewAdmin,
  getReviewsTableDataOfReviewMember,
  getRootReviewReferenceProgress,
  type ReviewSubmitDatasetTable,
  type RootReviewReferenceProgress,
} from '@/services/reviews/api';
import { ReviewsTable } from '@/services/reviews/data';
import { isCurrentAssignedReviewerCommentState } from '@/services/reviews/util';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, Link, useIntl } from '@umijs/max';
import { Card, Col, Input, Row, Space, Spin, Table, Tag, theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import { SortOrder } from 'antd/es/table/interface';
import { useEffect, useRef, useState } from 'react';
import RejectReview from './RejectReview';
import ReviewLifeCycleModelsDetail from './reviewLifeCycleModels';
import ReviewProcessDetail from './reviewProcess';
import ReviewProgress from './ReviewProgress';
import SelectReviewer from './SelectReviewer';
import SimpleReviewActions from './SimpleReviewActions';

const { Search } = Input;

type AssignmentReviewProps = {
  userData: { user_id: string; role: string } | null;
  tableType:
    'unassigned' | 'assigned' | 'reviewed' | 'pending' | 'reviewer-rejected' | 'admin-rejected';
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
  const lang = getLang(locale);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );
  const intl = useIntl();

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [subTableData, setSubTableData] = useState<Record<string, any[]>>({});
  const [subTableLoading, setSubTableLoading] = useState<Record<string, boolean>>({});
  const previousLangRef = useRef(lang);
  const childActionRef = useRef<{ reload: () => void }>({ reload: () => undefined });

  const isReferenceMatchingCurrentTab = (record: RootReviewReferenceProgress) => {
    switch (tableType) {
      case 'unassigned':
        return record.state_code === 0;
      case 'assigned':
        return record.state_code === 1;
      case 'admin-rejected':
        return record.state_code === -1;
      case 'pending':
        return record.state_code > 0 && record.actor_comment_state_code === 0;
      case 'reviewed':
        return (
          record.state_code > 0 && [1, 2, -3].includes(record.actor_comment_state_code as number)
        );
      case 'reviewer-rejected':
        return record.state_code === -1 && record.actor_comment_state_code === -1;
      default:
        return false;
    }
  };

  const reloadAfterChildAction = () => {
    setSelectedRowKeys([]);
    setExpandedRowKeys([]);
    setSubTableData({});
    setSubTableLoading({});
    actionRef.current?.reload?.();
  };
  childActionRef.current.reload = reloadAfterChildAction;

  useEffect(() => {
    if (previousLangRef.current === lang) {
      return;
    }

    previousLangRef.current = lang;
    setSelectedRowKeys([]);
    setExpandedRowKeys([]);
    setSubTableData({});
    setSubTableLoading({});
    actionRef.current?.reload?.();
  }, [actionRef, lang]);

  const onSearch: SearchProps['onSearch'] = () => {
    // setKeyWord(value);
    // actionRef.current?.setPageInfo?.({ current: 1 });
    // actionRef.current?.reload();
  };

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  const loadSubTableData = async (record: ReviewsTable) => {
    const rowKey = record.id;
    setSubTableLoading((prev) => ({ ...prev, [rowKey]: true }));
    try {
      const result = await getRootReviewReferenceProgress(record.id);
      if (result.error) throw result.error;
      const sortedData = [...result.data].sort(
        (left, right) =>
          Number(isReferenceMatchingCurrentTab(right)) -
          Number(isReferenceMatchingCurrentTab(left)),
      );
      setSubTableData((prev) => ({ ...prev, [rowKey]: sortedData }));
    } catch (error) {
      console.error('Failed to load reference review data:', error);
      setSubTableData((prev) => ({ ...prev, [rowKey]: [] }));
    } finally {
      setSubTableLoading((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const handleExpand = async (expanded: boolean, record: ReviewsTable) => {
    setExpandedRowKeys((currentKeys) =>
      expanded
        ? Array.from(new Set([...currentKeys, record.id]))
        : currentKeys.filter((key) => key !== record.id),
    );
    if (expanded && record.reviewKind === 'root') {
      await loadSubTableData(record);
    }
  };

  const subColumns: any[] = [
    {
      title: (
        <FormattedMessage id='pages.review.table.column.dataName' defaultMessage='Data name' />
      ),
      dataIndex: 'data_name',
      key: 'data_name',
      render: (dataName: any) => genProcessName(dataName ?? {}, lang) || '-',
    },
    {
      title: <FormattedMessage id='pages.review.reference.table' defaultMessage='Data type' />,
      dataIndex: 'target_table',
      key: 'target_table',
    },
    {
      title: <FormattedMessage id='pages.review.reference.version' defaultMessage='Data version' />,
      dataIndex: 'data_version',
      key: 'data_version',
    },
    {
      title: <FormattedMessage id='pages.review.table.status' defaultMessage='Status' />,
      dataIndex: 'state_code',
      key: 'state_code',
      render: (stateCode: number, record: RootReviewReferenceProgress) => {
        const status =
          stateCode === 2
            ? {
                color: 'success',
                text: intl.formatMessage({
                  id: 'pages.review.reference.status.approved',
                  defaultMessage: 'Approved',
                }),
              }
            : stateCode === -1
              ? {
                  color: 'error',
                  text: intl.formatMessage({
                    id: 'pages.review.reference.status.rejected',
                    defaultMessage: 'Rejected',
                  }),
                }
              : stateCode === 1
                ? {
                    color: 'processing',
                    text: intl.formatMessage({
                      id: 'pages.review.reference.status.inReview',
                      defaultMessage: 'In review',
                    }),
                  }
                : {
                    color: 'default',
                    text: intl.formatMessage({
                      id: 'pages.review.reference.status.unassigned',
                      defaultMessage: 'Unassigned',
                    }),
                  };
        return (
          <Space size='small'>
            <Tag color={status.color}>{status.text}</Tag>
            {isReferenceMatchingCurrentTab(record) && (
              <Tag color='blue'>
                <FormattedMessage
                  id='pages.review.reference.matchesCurrentTab'
                  defaultMessage='Current tab'
                />
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: (
        <FormattedMessage id='pages.review.progress.button' defaultMessage='Review Progress' />
      ),
      key: 'progress',
      render: (_: unknown, record: RootReviewReferenceProgress) =>
        `${record.completed_reviewer_count}/${record.reviewer_count}`,
    },
  ];

  if (!hideReviewButton) {
    subColumns.push({
      title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
      key: 'actions',
      render: (_: unknown, record: RootReviewReferenceProgress) => {
        if (!isReferenceMatchingCurrentTab(record)) return [];

        if (tableType === 'unassigned') {
          return [
            <Space key={record.reference_review_id}>
              <SelectReviewer
                tabType='unassigned'
                actionRef={childActionRef}
                reviewIds={[record.reference_review_id]}
              />
              <RejectReview
                reviewId={record.reference_review_id}
                dataId={record.data_id}
                dataVersion={record.data_version}
                isModel={record.target_table === 'lifecyclemodels'}
                targetTable={record.target_table}
                actionRef={childActionRef}
              />
            </Space>,
          ];
        }

        if (tableType === 'assigned') {
          return [
            <Space key={record.reference_review_id}>
              <SelectReviewer
                tabType='assigned'
                actionRef={childActionRef}
                reviewIds={[record.reference_review_id]}
              />
              <SimpleReviewActions
                reviewId={record.reference_review_id}
                targetTable={record.target_table}
                role='admin'
                actionRef={childActionRef}
              />
            </Space>,
          ];
        }

        if (tableType === 'pending') {
          return [
            <SimpleReviewActions
              key={record.reference_review_id}
              reviewId={record.reference_review_id}
              targetTable={record.target_table}
              role='reviewer'
              actionRef={childActionRef}
            />,
          ];
        }

        return [];
      },
    });
  }

  const datasetRoutes: Record<ReviewSubmitDatasetTable, string> = {
    contacts: '/mydata/contacts',
    sources: '/mydata/sources',
    unitgroups: '/mydata/unitgroups',
    flowproperties: '/mydata/flowproperties',
    flows: '/mydata/flows',
    processes: '/mydata/processes',
    lifecyclemodels: '/mydata/models',
  };

  const isSimpleReview = (record: ReviewsTable) =>
    record.reviewKind === 'reference' ||
    (record.reviewKind === 'root' &&
      Boolean(record.targetTable) &&
      !['processes', 'lifecyclemodels'].includes(record.targetTable as string));

  const columns: ProColumns<ReviewsTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.review.table.column.dataName' defaultMessage='Data name' />
      ),
      dataIndex: 'processName',
      sorter: false,
      search: false,
      render: (_, row) => {
        const targetTable = row.targetTable as ReviewSubmitDatasetTable | undefined;
        const dataLink = targetTable
          ? `${datasetRoutes[targetTable]}?id=${encodeURIComponent(
              row.json?.data?.id,
            )}&version=${encodeURIComponent(row.json?.data?.version)}&mode=view`
          : undefined;
        const canOpenRootData = row.rootCanRead !== false;
        return [
          <div key={0} style={{ display: 'flex' }}>
            {row.name}
            {!canOpenRootData ? null : targetTable === 'lifecyclemodels' ? (
              <LifeCycleModelView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
                buttonTypeProp='text'
              />
            ) : targetTable === 'processes' ? (
              <ProcessView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
                disabled={false}
                buttonTypeProp='text'
              />
            ) : dataLink ? (
              <Link to={dataLink} target='_blank' style={{ marginLeft: 8 }}>
                <FormattedMessage id='pages.review.table.view' defaultMessage='View' />
              </Link>
            ) : null}
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
        <FormattedMessage id='pages.review.table.column.createAt' defaultMessage='Submitted at' />
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
        if (record.rootMatchesStatus === false) return [];
        return [
          <RejectReview
            isModel={record.isFromLifeCycle}
            dataId={record.json?.data?.id}
            dataVersion={record.json?.data?.version}
            reviewId={record.id}
            targetTable={record.targetTable as ReviewSubmitDatasetTable | undefined}
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
            const total =
              record.comments?.filter((item: any) =>
                isCurrentAssignedReviewerCommentState(item.state_code),
              ).length ?? 0;
            const reviewed =
              record.comments?.filter((item: any) => [1, -3].includes(item.state_code)).length ?? 0;
            return [<Space key={0}>{`${reviewed}/${total}`}</Space>];
          },
        },
        {
          title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
          dataIndex: 'actions',
          search: false,
          render: (_: any, record: ReviewsTable) => {
            if (record.rootMatchesStatus === false) return [];
            if (isSimpleReview(record) && record.targetTable) {
              return [
                <SimpleReviewActions
                  key={0}
                  reviewId={record.id}
                  targetTable={record.targetTable as ReviewSubmitDatasetTable}
                  role='admin'
                  actionRef={actionRef}
                />,
              ];
            }
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
            if (record.rootMatchesStatus === false) return [];
            if (isSimpleReview(record)) {
              return tableType === 'pending' && record.targetTable
                ? [
                    <SimpleReviewActions
                      key={0}
                      reviewId={record.id}
                      targetTable={record.targetTable as ReviewSubmitDatasetTable}
                      role='reviewer'
                      actionRef={actionRef}
                    />,
                  ]
                : [];
            }
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
            if (record.rootMatchesStatus === false) return [];
            if (isSimpleReview(record)) return [];
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
        return (
          <FormattedMessage id='pages.review.tabs.unassigned' defaultMessage='Unassigned Task' />
        );
      case 'assigned':
        return <FormattedMessage id='pages.review.tabs.assigned' defaultMessage='Assigned Task' />;
      case 'reviewed':
        return <FormattedMessage id='pages.review.tabs.reviewed' defaultMessage='Reviewed' />;
      case 'pending':
        return <FormattedMessage id='pages.review.tabs.pending' defaultMessage='Pending Review' />;
      case 'reviewer-rejected':
        return <FormattedMessage id='pages.review.tabs.rejected' defaultMessage='Rejected' />;
      case 'admin-rejected':
        return (
          <FormattedMessage id='pages.review.tabs.rejectedTask' defaultMessage='Rejected Task' />
        );
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
          rowExpandable: (record) => record.reviewKind === 'root',
          expandedRowRender: (record) => {
            if (subTableLoading[record.id]) {
              return (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin />
                </div>
              );
            }
            const data = subTableData[record.id] ?? [];
            return (
              <Table
                columns={subColumns}
                dataSource={data}
                pagination={false}
                rowKey='reference_review_id'
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
            const result = await getReviewsTableData(params, sort);
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
        tableAlertOptionRender={tableAlertOptionRender}
        rowSelection={
          tableType === 'unassigned'
            ? {
                selectedRowKeys,
                onChange: handleRowSelectionChange,
                getCheckboxProps: (record: ReviewsTable) => ({
                  disabled: record.rootMatchesStatus === false,
                }),
              }
            : undefined
        }
      />
      <ExpandIconStyle />
    </>
  );
};

export default AssignmentReview;
