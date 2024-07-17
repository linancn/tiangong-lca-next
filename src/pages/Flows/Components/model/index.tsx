import { FlowModelTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import { CloseOutlined, PartitionOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ModelFlowEdit from './edit';

type Props = {
    flowId: string;
    lang: string;
    buttonType: string;
};
const FlowModel: FC<Props> = ({ buttonType }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    // const [spinning, setSpinning] = useState(false);

    const actionRef = useRef<ActionType>();
    const flowsColumns: ProColumns<FlowModelTable>[] = [
        {
            title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
            dataIndex: 'index',
            valueType: 'index',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
            dataIndex: 'name',
            sorter: false,
        },
        {
            title: <FormattedMessage id="pages.table.title.description" defaultMessage="Description" />,
            dataIndex: 'description',
            sorter: false,
            search: false,
        },
        {
            title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
            dataIndex: 'created_at',
            valueType: 'dateTime',
            sorter: true,
            search: false,
        },
        {
            title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
            dataIndex: 'option',
            search: false,
            render: (_, row) => {
                return [
                    <Space size={'small'} key={0}>
                        <ModelFlowEdit id={row.id} buttonType={'icon'} lang={''} actionRef={actionRef} />
                    </Space>
                ];
                //   if (dataSource === 'my') {
                //     return [
                //       <Space size={'small'} key={0}>
                //         <FlowModel
                //           buttonType={'icon'}
                //           flowId={row.id}
                //           lang={lang}
                //         />
                //         <FlowsView
                //           buttonType={'icon'}
                //           id={row.id}
                //           lang={lang}
                //         />
                //         <FlowsEdit
                //           id={row.id}
                //           lang={lang}
                //           buttonType={'icon'}
                //           actionRef={actionRef}
                //         />
                //         <FlowsDelete
                //           id={row.id}
                //           buttonType={'icon'}
                //           actionRef={actionRef}
                //           setViewDrawerVisible={() => { }}
                //         />
                //       </Space>,
                //     ];
                //   }
                //   return [
                //     <Space size={'small'} key={0}>
                //       <FlowsView
                //         buttonType={'icon'}
                //         id={row.id}
                //         lang={lang}
                //       />
                //     </Space>,
                //   ];
            },
        },
    ];

    const onView = () => {
        setDrawerVisible(true);
        // setSpinning(true);
    };

    return (
        <>
            {buttonType === 'icon' ? (
                <Tooltip title={<FormattedMessage id="pages.button.model" defaultMessage="Model" />}><Button shape="circle" icon={<PartitionOutlined />} size="small" onClick={onView} />
                </Tooltip>
            ) : (
                <Button onClick={onView}>
                    <FormattedMessage id="pages.button.model" defaultMessage="Model" />
                </Button>
            )}

            <Drawer
                title={<FormattedMessage id="pages.flow.model.drawer.title.list" defaultMessage="Model List" />}
                width="90%"
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
            >
                <ProTable<FlowModelTable, ListPagination>
                    actionRef={actionRef}

                    search={{
                        defaultCollapsed: false,
                    }}
                    pagination={{
                        showSizeChanger: false,
                        pageSize: 10,
                    }}
                    toolBarRender={() => {
                        // if (dataSource === 'my') {
                        //     return [<FlowsCreate key={0} lang={lang} actionRef={actionRef} />];
                        // }
                        return [];
                    }}
                    // request={async (
                    //     params: {
                    //         pageSize: number;
                    //         current: number;
                    //     },
                    //     sort,
                    // ) => {
                    //     return getFlowTable(params, sort, lang, dataSource);
                    // }}
                    columns={flowsColumns}
                    dataSource={[
                        {
                            id: '1',
                            name: 'Model 1',
                            description: 'Model 1 Description',
                            created_at: new Date(),
                        },
                        {
                            id: '2',
                            name: 'Model 2',
                            description: 'Model 2 Description',
                            created_at: new Date(),
                        }
                    ]}
                />
            </Drawer>
        </>
    );
};

export default FlowModel;
