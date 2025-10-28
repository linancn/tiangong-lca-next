import ToolBarButton from '@/components/ToolBarButton';
import { ListPagination } from '@/services/general/data';
import { getLang, getLangText } from '@/services/general/util';
import {
  getAllTableTeams,
  getTeamsByKeyword,
  updateSort,
  updateTeamRank,
} from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { EyeInvisibleOutlined, SaveOutlined } from '@ant-design/icons';
import { ActionType, DragSortTable, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Input, message, Modal, Space, theme, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import TeamEdit from './edit';
import SelectTeams from './select';
import TeamView from './view';

const { Search } = Input;

type TableListProps = {
  systemUserRole?: 'admin' | 'owner' | 'member';
  tableType: 'joinTeam' | 'manageSystem';
};

const TableList: FC<TableListProps> = ({ systemUserRole, tableType }) => {
  const intl = useIntl();
  const lang = getLang(intl.locale);
  const actionRef = useRef<ActionType>();
  const [keyWord, setKeyWord] = useState<any>('');
  const [tableData, setTableData] = useState<TeamTable[]>([]);
  const [isDragged, setIsDragged] = useState<boolean>(false);
  const draggedDataRef = useRef<TeamTable[]>([]);
  const { token } = theme.useToken();

  const handleRemoveTeam = (record: TeamTable) => {
    Modal.confirm({
      okButtonProps: {
        type: 'primary',
        style: { backgroundColor: token.colorPrimary },
      },
      cancelButtonProps: {
        style: { borderColor: token.colorPrimary, color: token.colorPrimary },
      },
      title: intl.formatMessage({
        id: 'component.allTeams.table.remove.confirm.title',
        defaultMessage: 'Confirm Remove Team',
      }),
      content: intl.formatMessage({
        id: 'component.allTeams.table.remove.confirm.content',
        defaultMessage:
          'The removal will not be displayed on the homepage, do you want to continue?',
      }),
      okText: intl.formatMessage({
        id: 'component.allTeams.confirm.ok',
        defaultMessage: 'OK',
      }),
      cancelText: intl.formatMessage({
        id: 'component.allTeams.confirm.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => {
        updateTeamRank(record.id, 0).then(({ error }) => {
          if (error) {
            message.error(
              intl.formatMessage({
                id: 'component.allTeams.action.fail',
                defaultMessage: 'Failed to remove team',
              }),
            );
          } else {
            message.success(
              intl.formatMessage({
                id: 'component.allTeams.action.success',
                defaultMessage: 'Team removed successfully',
              }),
            );
            actionRef.current?.reload();
          }
        });
      },
    });
  };

  const teamColumns: ProColumns<TeamTable>[] = [
    {
      title: <FormattedMessage id='component.allTeams.table.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      render: (_) => <span>{_}</span>,
    },
    {
      title: <FormattedMessage id='component.allTeams.table.name' defaultMessage='Team Name' />,
      dataIndex: 'title',
      sorter: false,
      search: false,
      render: (_, row) => getLangText(row.json.title, lang),
    },
    {
      title: (
        <FormattedMessage id='component.allTeams.table.description' defaultMessage='Description' />
      ),
      dataIndex: 'description',
      sorter: false,
      search: false,
      render: (_, row) => {
        const description = getLangText(row.json.description, lang);
        return (
          <Tooltip placement='topLeft' title={description}>
            {description.length > 20 ? `${description.substring(0, 20)}...` : description}
          </Tooltip>
        );
      },
    },
    {
      title: <FormattedMessage id='component.allTeams.table.contact' defaultMessage='Contact' />,
      dataIndex: 'ownerEmail',
      sorter: false,
      search: false,
    },
  ];

  if (tableType === 'manageSystem') {
    // Manage teams on homepage
    teamColumns.push({
      title: <FormattedMessage id='component.allTeams.table.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, record) => (
        <Space size='small'>
          <TeamView id={record.id} buttonType='icon' />
          <TeamEdit
            actionRef={actionRef}
            id={record.id}
            buttonType='icon'
            disabled={systemUserRole !== 'admin' && systemUserRole !== 'owner'}
          />
          <Tooltip
            title={
              <FormattedMessage id='component.allTeams.table.remove' defaultMessage='Remove' />
            }
          >
            <Button
              disabled={systemUserRole !== 'admin' && systemUserRole !== 'owner'}
              shape='circle'
              icon={<EyeInvisibleOutlined />}
              size='small'
              onClick={() => handleRemoveTeam(record)}
            />
          </Tooltip>
        </Space>
      ),
    });
  }

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  // Handle data update after drag sort
  const handleDragSortEnd = async (
    beforeIndex: number,
    afterIndex: number,
    newDataSource: TeamTable[],
  ) => {
    if (systemUserRole !== 'admin' && systemUserRole !== 'owner' && systemUserRole !== 'member') {
      message.error(
        intl.formatMessage({
          id: 'component.allTeams.table.fail.disabled',
          defaultMessage: 'No permission to operate',
        }),
      );
      return;
    }

    draggedDataRef.current = newDataSource;
    setTableData(newDataSource);
    setIsDragged(true);
  };

  const handleSaveRanks = async () => {
    if (systemUserRole !== 'admin' && systemUserRole !== 'owner' && systemUserRole !== 'member') {
      return;
    }
    try {
      const currentPage = actionRef.current?.pageInfo?.current || 1;
      const pageSize = actionRef.current?.pageInfo?.pageSize || 10;

      const startIndex = (currentPage - 1) * pageSize;

      const dataToSave = draggedDataRef.current.length > 0 ? draggedDataRef.current : tableData;
      const updates = dataToSave.map((team, index) => ({
        id: team.id,
        rank: startIndex + index + 1,
      }));
      const { error } = await updateSort(updates);
      if (error) {
        message.error(
          intl.formatMessage({
            id: 'component.allTeams.table.fail',
            defaultMessage: 'Sorting modified failed',
          }),
        );
      } else {
        message.success(
          intl.formatMessage({
            id: 'component.allTeams.table.success',
            defaultMessage: 'Sorting modified successfully',
          }),
        );
        setIsDragged(false);
        draggedDataRef.current = [];
        actionRef.current?.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      {tableType === 'manageSystem' ? (
        <>
          <DragSortTable<TeamTable, ListPagination>
            rowKey='id'
            headerTitle={
              <FormattedMessage id='component.allTeams.table.title' defaultMessage='All Teams' />
            }
            actionRef={actionRef}
            search={false}
            options={{ fullScreen: true }}
            pagination={{
              showSizeChanger: false,
              pageSize: 10,
            }}
            dataSource={tableData}
            request={async (params: { pageSize: number; current: number }) => {
              if (keyWord.length > 0) {
                const result = await getTeamsByKeyword(keyWord);
                setTableData(result.data || []);
                return result;
              }
              const result = await getAllTableTeams(params, tableType);
              setTableData(result.data || []);
              return result;
            }}
            columns={teamColumns}
            dragSortKey='index'
            onDragSortEnd={handleDragSortEnd}
            toolBarRender={() => [
              isDragged && (
                <ToolBarButton
                  disabled={
                    systemUserRole !== 'admin' &&
                    systemUserRole !== 'owner' &&
                    systemUserRole !== 'member'
                  }
                  icon={<SaveOutlined />}
                  tooltip={
                    <FormattedMessage
                      id='component.allTeams.table.saveRanks.tooltip'
                      defaultMessage='Save Ranks'
                    />
                  }
                  onClick={handleSaveRanks}
                />
                // <Tooltip
                //   key='saveRanks'
                //   title={
                //     <FormattedMessage
                //       id='component.allTeams.table.saveRanks.tooltip'
                //       defaultMessage='Save Ranks'
                //     />
                //   }
                // >
                //   <Button
                //     disabled={
                //       systemUserRole !== 'admin' &&
                //       systemUserRole !== 'owner' &&
                //       systemUserRole !== 'member'
                //     }
                //     type='text'
                //     icon={<SaveOutlined />}
                //     shape='circle'
                //     size='small'
                //     onClick={handleSaveRanks}
                //   />
                // </Tooltip>
              ),
              <Tooltip
                key='select'
                title={
                  <FormattedMessage
                    id='component.allTeams.table.select.tooltip'
                    defaultMessage='Select Team'
                  />
                }
              >
                <SelectTeams
                  disabled={systemUserRole !== 'admin' && systemUserRole !== 'owner'}
                  actionRef={actionRef}
                  buttonType='icon'
                />
              </Tooltip>,
            ]}
          />
        </>
      ) : (
        <ProTable<TeamTable, ListPagination>
          rowKey='id'
          headerTitle={
            <FormattedMessage id='component.allTeams.table.desc' defaultMessage='All Teams' />
          }
          actionRef={actionRef}
          search={false}
          options={{ fullScreen: true }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          request={async (params: { pageSize: number; current: number }) => {
            if (keyWord.length > 0) {
              return getTeamsByKeyword(keyWord);
            }
            return getAllTableTeams(params, tableType);
          }}
          columns={teamColumns}
        />
      )}
    </>
  );
};

export default TableList;
