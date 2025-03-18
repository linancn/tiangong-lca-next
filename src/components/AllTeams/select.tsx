import { getLang, getLangText } from '@/services/general/util';
import { getUnrankedTeams, updateSort } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, message, Space, Tooltip } from 'antd';
import { FC, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

interface SelectTeamsProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  buttonType?: 'default' | 'icon';
}

const SelectTeams: FC<SelectTeamsProps> = ({
  actionRef: parentActionRef,
  buttonType = 'default',
}) => {
  const intl = useIntl();
  const lang = getLang(intl.locale);
  const [visible, setVisible] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
    setSelectedRowKeys([]);
  };

  const handleAddTeams = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(
        intl.formatMessage({
          id: 'component.allTeams.select.noSelection',
          defaultMessage: 'Please select at least one team',
        }),
      );
      return;
    }

    setLoading(true);
    try {
      const updates = selectedRowKeys.map((id) => ({ id, rank: 1 }));
      const { error } = await updateSort(updates);
      if (error) {
        message.error(
          intl.formatMessage({
            id: 'component.allTeams.select.fail',
            defaultMessage: 'Failed to add team',
          }),
        );
      } else {
        message.success(
          intl.formatMessage({
            id: 'component.allTeams.select.success',
            defaultMessage: 'Team added successfully',
          }),
        );
        if (parentActionRef && parentActionRef.current) {
          parentActionRef.current.reload();
        }
        if (actionRef.current) {
          actionRef.current.reload();
        }
        onClose();
      }
    } catch (error) {
      console.error(error);
      message.error(
        intl.formatMessage({
          id: 'component.allTeams.select.error',
          defaultMessage: 'An error occurred during operation',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <>
      {buttonType === 'default' ? (
        <Button type="primary" onClick={showDrawer}>
          <FormattedMessage id="component.allTeams.select.button" defaultMessage="Select Team" />
        </Button>
      ) : (
        <Tooltip
          title={
            <FormattedMessage
              id="component.allTeams.table.select.tooltip"
              defaultMessage="Select Team"
            />
          }
        >
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<PlusOutlined />}
            onClick={showDrawer}
          />
        </Tooltip>
      )}

      <Drawer
        bodyStyle={{ paddingTop: 0 }}
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setVisible(false)}
          />
        }
        title={
          <FormattedMessage id="component.allTeams.select.title" defaultMessage="Select Team" />
        }
        width={1000}
        onClose={onClose}
        open={visible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>
                <FormattedMessage id="component.allTeams.select.calcel" defaultMessage="Cancel" />
              </Button>
              <Button type="primary" onClick={handleAddTeams} loading={loading}>
                <FormattedMessage id="component.allTeams.select.confirm" defaultMessage="Confirm" />
              </Button>
            </Space>
          </div>
        }
      >
        <ProTable<TeamTable>
          rowKey="id"
          headerTitle={
            <FormattedMessage
              id="component.allTeams.select.tableTitle"
              defaultMessage="Unshown Teams"
            />
          }
          actionRef={actionRef}
          search={false}
          options={{ fullScreen: true, reload: true }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          request={async (params) => {
            const result = await getUnrankedTeams(params);
            return {
              data: result.data || [],
              success: result.success,
              total: result.total,
            };
          }}
          columns={teamColumns}
        />
      </Drawer>
    </>
  );
};

export default SelectTeams;
