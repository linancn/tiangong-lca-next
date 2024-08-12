import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { ListPagination } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { createUnitGroup } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitTableData } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Input,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitCreate from './Unit/create';
import UnitDelete from './Unit/delete';
import UnitEdit from './Unit/edit';
import UnitView from './Unit/view';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const UnitGroupCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<any>([]);

  const actionRefUnitTable = useRef<ActionType>();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const handletUnitDataCreate = (data: any) => {
    setUnitDataSource([
      ...unitDataSource,
      { ...data, '@dataSetInternalID': unitDataSource.length.toString() },
    ]);
  };

  const handletUnitData = (data: any) => {
    setUnitDataSource([...data]);
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: (
        <FormattedMessage id="pages.table.title.index" defaultMessage="Index"></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    // {
    //   title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
    //   dataIndex: 'dataSetInternalID',
    //   search: false,
    // },
    {
      title: (
        <FormattedMessage id="pages.table.title.name" defaultMessage="Name"></FormattedMessage>
      ),
      dataIndex: 'name',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.generalComment"
          defaultMessage="General Comment"
        ></FormattedMessage>
      ),
      dataIndex: 'generalComment',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.meanValue"
          defaultMessage="Mean Value"
        ></FormattedMessage>
      ),
      dataIndex: 'meanValue',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.quantitativeReference"
          defaultMessage="Quantitative Reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return <CheckCircleTwoTone twoToneColor="#52c41a" />;
        }
        return <CloseCircleOutlined />;
      },
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.option" defaultMessage="Option"></FormattedMessage>
      ),
      valueType: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <UnitView id={row.dataSetInternalID} data={unitDataSource} buttonType={'icon'} />
            <UnitEdit
              id={row.dataSetInternalID}
              data={unitDataSource}
              buttonType={'icon'}
              actionRef={actionRefUnitTable}
              onData={handletUnitData}
              setViewDrawerVisible={() => {}}
            />
            <UnitDelete
              id={row.dataSetInternalID}
              data={unitDataSource}
              buttonType={'icon'}
              actionRef={actionRefUnitTable}
              setViewDrawerVisible={() => {}}
              onData={handletUnitData}
            />
          </Space>,
        ];
      },
    },
  ];

  const tabList = [
    {
      key: 'unitGroupInformation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.creat.unitGroupInformation"
          defaultMessage="UnitGroup Information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.creat.modellingAndValidation"
          defaultMessage="Modelling And Validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.creat.administrativeInformation"
          defaultMessage="Administrative Information"
        />
      ),
    },
    {
      key: 'units',
      tab: <FormattedMessage id="pages.unitgroup.creat.units" defaultMessage="Units" />,
    },
  ];

  const contentList: Record<string, React.ReactNode> = {
    unitGroupInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.unitgroup.creat.unitGroupInformation.name"
              defaultMessage="Name"
            />
          }
        >
          <LangTextItemFrom
            name={['unitGroupInformation', 'dataSetInformation', 'common:name']}
            label={
              <FormattedMessage
                id="pages.unitgroup.creat.unitGroupInformation.name"
                defaultMessage="Name"
              />
            }
          />
        </Card>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.unitgroup.creat.unitGroupInformation.classification"
              defaultMessage="Classification"
            />
          }
        >
          <LevelTextItemFrom
            name={[
              'unitGroupInformation',
              'dataSetInformation',
              'classificationInformation',
              'common:classification',
              'common:class',
            ]}
            dataType={'UnitGroup'}
            formRef={formRefCreate}
            onData={handletFromData}
          />
        </Card>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <SourceSelectFrom
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:referenceToComplianceSystem',
          ]}
          label={
            <FormattedMessage
              id="pages.unitgroup.creat.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Reference To Compliance System"
            />
          }
          lang={lang}
          formRef={formRefCreate}
          onData={handletFromData}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.creat.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval Of Overall Compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Input />
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.creat.administrativeInformation.timeStamp"
              defaultMessage="Time Stamp"
            />
          }
          name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
        >
          <Input disabled={true} style={{ color: '#000' }} />
        </Form.Item>
        <SourceSelectFrom
          name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
          label={
            <FormattedMessage
              id="pages.unitgroup.creat.administrativeInformation.referenceToDataSetFormat"
              defaultMessage="Reference To DataSet Format"
            />
          }
          lang={lang}
          formRef={formRefCreate}
          onData={handletFromData}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.creat.administrativeInformation.dataSetVersion"
              defaultMessage="DataSet Version"
            />
          }
          name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
        >
          <Input />
        </Form.Item>
      </Space>
    ),
    units: (
      <ProTable<UnitTable, ListPagination>
        actionRef={actionRefUnitTable}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          return [<UnitCreate key={0} onData={handletUnitDataCreate}></UnitCreate>];
        }}
        dataSource={genUnitTableData(unitDataSource, lang)}
        columns={unitColumns}
      />
    ),
  };

  useEffect(() => {
    if (drawerVisible === false) return;
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
      },
    };
    setInitData(newData);
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData(newData);
    setUnitDataSource([]);
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({ ...fromData, units: { unit: unitDataSource } });
  }, [unitDataSource]);

  // useEffect(() => {
  //   if (activeTabKey === 'units') return;
  //   setFromData({
  //     ...fromData,
  //     [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
  //   });
  // }, [formRefCreate.current?.getFieldsValue()]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage id="pages.button.create" defaultMessage="Create"></FormattedMessage>
        }
      >
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
        title={
          <FormattedMessage
            id="pages.unitgroup.drawer.title.create"
            defaultMessage="Create"
          ></FormattedMessage>
        }
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
            <Button
              onClick={() => {
                setDrawerVisible(false);
              }}
            >
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel"></FormattedMessage>
            </Button>
            <Button
              onClick={() => {
                formRefCreate.current?.submit();
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit"></FormattedMessage>
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
        </ProForm>
        <Collapse
          items={[
            {
              key: '1',
              label: 'JSON Data',
              children: (
                <Typography>
                  <pre>{JSON.stringify(fromData, null, 2)}</pre>
                </Typography>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  );
};

export default UnitGroupCreate;
