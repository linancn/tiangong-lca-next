import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { ListPagination } from '@/services/general/data';
import { createUnitGroup } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import ProTable from '@ant-design/pro-table';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitCreate from './Unit/create';
import UnitEdit from './Unit/edit';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const UnitGroupCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
  const [fromData, setFromData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<any>([]);

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const createUnitData = (data: any) => {
    setUnitDataSource([...unitDataSource, data]);
  };

  const editUnitData = (data: any) => {
    const newUnitDataSource = unitDataSource.map((item: UnitTable) => {
      if (item.id === data.id) {
        return data;
      }
      return item;
    });
    setUnitDataSource(newUnitDataSource);
  };

  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index"></FormattedMessage>,
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
      dataIndex: '@dataSetInternalID',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.name" defaultMessage="Name"></FormattedMessage>,
      dataIndex: 'name',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.meanValue" defaultMessage="Mean Value"></FormattedMessage>,
      dataIndex: 'meanValue',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.unit.selected" defaultMessage="Selected"></FormattedMessage>,
      dataIndex: 'selected',
      valueType: 'switch',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.option" defaultMessage="Option"></FormattedMessage>,
      valueType: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>}>
              <UnitEdit buttonType={'icon'} editData={row} onData={editUnitData}></UnitEdit>
            </Tooltip>
            <Tooltip title={<FormattedMessage id="pages.table.option.delete" defaultMessage="Delete"></FormattedMessage>}>
              <Popconfirm title={<FormattedMessage id="pages.table.option.delete.confirm" defaultMessage="Delete"></FormattedMessage>}
                onConfirm={() => {
                  const newUnitDataSource = unitDataSource.filter((item: UnitTable) => item.id !== row.id);
                  setUnitDataSource(newUnitDataSource);
                }}>
                <Button size={'small'} shape="circle" icon={<DeleteOutlined />}></Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        ];
      }
    },
  ];

  const tabList = [
    { key: 'unitGroupInformation', tab: 'UnitGroup Information' },
    { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
    { key: 'units', tab: 'Units' },
  ];

  const contentList: Record<string, React.ReactNode> = {
    unitGroupInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={'Name'}>
          <LangTextItemFrom name={['dataSetInformation', 'common:name']} label="Name"></LangTextItemFrom>
        </Card>
        <Card size="small" title={'Classification'}>
          <LevelTextItemFrom name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class']}></LevelTextItemFrom>
        </Card>
        <Form.Item label="Reference To Reference Unit" name={['quantitativeReference', 'referenceToReferenceUnit']}>
          <Input></Input>
        </Form.Item>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title={'Reference To Compliance System'}>
          <Form.Item label="Ref Object Id" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@refObjectId']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="Type" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@type']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="URI" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@uri']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="Version" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@version']}>
            <Input></Input>
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom label="Name" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', 'common:shortDescription']}></LangTextItemFrom>
        </Card>
        <Form.Item label="Approval Of Overall Compliance" name={['complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
          <Input></Input>
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form.Item label="TimeStamp" name={['dataEntryBy', 'common:timeStamp']}>
          <DatePicker showTime></DatePicker>
        </Form.Item>
        <Card size="small" title={'Reference To DataSet Format'}>
          <Form.Item label="Ref Object Id" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@refObjectId']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="Type" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@type']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="URI" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@uri']}>
            <Input></Input>
          </Form.Item>
          <Form.Item label="Version" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@version']}>
            <Input></Input>
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            Short Description
          </Divider>
          <LangTextItemFrom label="Name" name={['dataEntryBy', 'common:referenceToDataSetFormat', 'common:shortDescription']}></LangTextItemFrom>
        </Card>
        <Form.Item label="DataSet Version" name={['publicationAndOwnership', 'common:dataSetVersion']}>
          <Input></Input>
        </Form.Item>
      </Space>
    ),
    units: (
      <ProTable<UnitTable, ListPagination>
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<UnitCreate key={0} onData={createUnitData}></UnitCreate>];
        }}
        dataSource={unitDataSource}
        columns={unitColumns}
      ></ProTable>
    ),
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  useEffect(() => {
    setFromData({ ...fromData, units: { unit: unitDataSource } });
  }, [unitDataSource]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.create" defaultMessage="Create"></FormattedMessage>}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        ></Button>
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="pages.unitgroup.drawer.title.create" defaultMessage="Create"></FormattedMessage>}
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => {
              setDrawerVisible(false);
            }}>
              <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel"></FormattedMessage>
            </Button>
            <Button onClick={() => {
              formRefCreate.current?.submit();
            }} type="primary">
              <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit"></FormattedMessage>
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          onValuesChange={(changedValues, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues ?? {} });
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            const result = await createUnitGroup({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                ></FormattedMessage>,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <Card
            style={{ width: '100%' }}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          >
            {contentList[activeTabKey]}
          </Card>
          <Form.Item noStyle shouldUpdate>
            {() => (
              <Typography>
                <pre>{JSON.stringify(fromData, null, 2)}</pre>
              </Typography>
            )}
          </Form.Item>
        </ProForm>
      </Drawer>
    </>
  );
};

export default UnitGroupCreate;
