import { ListPagination } from '@/services/general/data';
import { getLang, getLangText } from '@/services/general/util';
import { getAllTableTeams, getTeamsByKeyword, updateTeamRank } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Modal, Tooltip, message } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

const { Search } = Input;

const TableList: FC = () => {
  const intl = useIntl();
  const lang = getLang(intl.locale);
  const actionRef = useRef<ActionType>();
  const [keyWord, setKeyWord] = useState<any>('');
  const { pathname } = useLocation();

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

  if (pathname === '/manageWelcomeTeams') {
    // Manage teams on homepage
    teamColumns.push({
      title: <FormattedMessage id="component.allTeams.table.rank" defaultMessage="Rank" />,
      dataIndex: 'rank',
      sorter: true,
      search: false,
      render: (_, record) => (
        <Input
          type="number"
          defaultValue={record.rank}
          min={0}
          onPressEnter={(e: any) => {
            const value = parseInt(e.target.value);
            Modal.confirm({
              okButtonProps: {
                type: 'primary',
                style: { backgroundColor: '#5C246A' }
              },
              cancelButtonProps: {
                style: { borderColor: '#5C246A', color: '#5C246A' }
              },
              title: intl.formatMessage({
                id: 'component.allTeams.table.confirm',
                defaultMessage: 'Confirm to modify the rank?',
              }),
              onOk: async () => {
                try {
                  const { error } = await updateTeamRank(record.id, value);
                  if (error) {
                    throw error;
                  } else {
                    message.success(
                      intl.formatMessage({
                        id: 'component.allTeams.table.success',
                        defaultMessage: 'Sorting modified successfully',
                      }),
                    );
                  }
                } catch (err) {
                  message.success(
                    intl.formatMessage({
                      id: 'component.allTeams.table.fail',
                      defaultMessage: 'Sorting modified failed',
                    }),
                  );
                  console.error(err);
                }
              },
            });
          }}
        />
      ),
    });
  }

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
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
          request={async (params: { pageSize: number; current: number }, sort) => {
            if (keyWord.length > 0) {
              return getTeamsByKeyword(keyWord);
            }
            return getAllTableTeams(params, sort);
          }}
          columns={teamColumns}
        />
      </Card>
    </>
  );
};

export default TableList;
