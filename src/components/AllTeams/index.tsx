import { ListPagination } from '@/services/general/data';
import { getLang, getLangText } from '@/services/general/util';
import { getAllTableTeams, getTeamsByKeyword, updateTeamRank } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Tooltip, message } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { DragSortTable } from '@ant-design/pro-components';

const { Search } = Input;


const TableList: FC<{ disabled?: boolean,showDragSort:boolean }> = ({ disabled = false,showDragSort  = false }) => {
  const intl = useIntl();
  const lang = getLang(intl.locale);
  const actionRef = useRef<ActionType>();
  const [keyWord, setKeyWord] = useState<any>('');
  const [tableData, setTableData] = useState<TeamTable[]>([]);

  const teamColumns: ProColumns<TeamTable>[] = [
    {
      title: <FormattedMessage id="component.allTeams.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="component.allTeams.table.name" defaultMessage="Team Name" />,
      dataIndex: 'title',
      sorter: false,
      search: false,
      render: (_, row) => getLangText(row.json.title, lang),
    },
    {
      title: (
        <FormattedMessage id="component.allTeams.table.description" defaultMessage="Description" />
      ),
      dataIndex: 'description',
      sorter: false,
      search: false,
      render: (_, row) => {
        const description = getLangText(row.json.description, lang);
        return (
          <Tooltip placement="topLeft" title={description}>
            {description.length > 20 ? `${description.substring(0, 20)}...` : description}
          </Tooltip>
        );
      },
    },
    {
      title: <FormattedMessage id="component.allTeams.table.contact" defaultMessage="Contact" />,
      dataIndex: 'ownerEmail',
      sorter: false,
      search: false,
    },
  ];

  if (showDragSort) {
    // Manage teams on homepage
    teamColumns.push({
      title: <FormattedMessage id="component.allTeams.table.rank" defaultMessage="Rank" />,
      dataIndex: 'rankColumn',
      search: false,
      render: (_, record) => (
        <span>{record.rank}</span>
      ),
    });
    
  }

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  // 处理拖拽排序后的数据更新
  const handleDragSortEnd = async (
    beforeIndex: number,
    afterIndex: number,
    newDataSource: TeamTable[],
  ) => {
    if(disabled){
      message.error(
        intl.formatMessage({
          id: 'component.allTeams.table.fail.disabled',
          defaultMessage: 'No permission to operate',
        }),
      );
      return
    }
    setTableData(newDataSource);
    
    const draggedTeam = newDataSource[afterIndex];
    const resultRank = afterIndex === 0 ? 0: newDataSource[afterIndex-1]?.rank +1;
    try {
      const { error } = await updateTeamRank(draggedTeam.id, resultRank );
      if (error) {
        throw error;
      } else {
        message.success(
          intl.formatMessage({
            id: 'component.allTeams.table.success',
            defaultMessage: 'Sorting modified successfully',
          }),
        );
        actionRef.current?.reload();
      }
    } catch (err) {
      message.error(
        intl.formatMessage({
          id: 'component.allTeams.table.fail',
          defaultMessage: 'Sorting modified failed',
        }),
      );
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
      <Card>
        {showDragSort ? (
          <DragSortTable<TeamTable, ListPagination>
            rowKey="id"
            headerTitle={
              <FormattedMessage id="component.allTeams.table.title" defaultMessage="All Teams" />
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
              const result = await getAllTableTeams(params);
              setTableData(result.data || []);
              return result;
            }}
            columns={teamColumns}
            dragSortKey="rankColumn"
            onDragSortEnd={handleDragSortEnd}
          />
        ) : (
          <ProTable<TeamTable, ListPagination>
            rowKey="id"
            headerTitle={
              <FormattedMessage id="component.allTeams.table.title" defaultMessage="All Teams" />
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
              return getAllTableTeams(params);
            }}
            columns={teamColumns}
          />
        )}
      </Card>
    </>
  );
};

export default TableList;
