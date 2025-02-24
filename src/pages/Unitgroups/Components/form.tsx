import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import { StringMultiLang_r, dataSetVersion } from '@/components/Validator/index';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { ListPagination } from '@/services/general/data';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitTableData } from '@/services/unitgroups/util';
import { CheckCircleOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProFormInstance, ProTable } from '@ant-design/pro-components';
import { Card, Form, Input, Select, Space, theme } from 'antd';
import { FC, useRef } from 'react';
import { FormattedMessage } from 'umi';
import UnitCreate from './Unit/create';
import UnitDelete from './Unit/delete';
import UnitEdit from './Unit/edit';
import UnitView from './Unit/view';
import { complianceOptions } from './optiondata';

type Props = {
  lang: string;
  activeTabKey: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  onUnitData: (data: any) => void;
  onUnitDataCreate: (data: any) => void;
  onTabChange: (key: string) => void;
  unitDataSource: UnitTable[];
};

export const UnitGroupForm: FC<Props> = ({
  lang,
  activeTabKey,
  formRef,
  onData,
  onUnitData,
  onUnitDataCreate,
  onTabChange,
  unitDataSource,
}) => {
  const { token } = theme.useToken();
  const actionRefUnitTable = useRef<ActionType>();
  const tabList = [
    {
      key: 'unitGroupInformation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.edit.unitGroupInformation"
          defaultMessage="Unit group information"
        />
      ),
    },
    {
      key: 'modellingAndValidation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.edit.modellingAndValidation"
          defaultMessage="Modelling and validation"
        />
      ),
    },
    {
      key: 'administrativeInformation',
      tab: (
        <FormattedMessage
          id="pages.unitgroup.edit.administrativeInformation"
          defaultMessage="Administrative information"
        />
      ),
    },
    {
      key: 'units',
      tab: <FormattedMessage id="pages.unitgroup.edit.units" defaultMessage="Units" />,
    },
  ];
  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: (
        <FormattedMessage id="pages.table.title.index" defaultMessage="Index"></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    // {
    //     title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
    //     dataIndex: 'dataSetInternalID',
    //     search: false,
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
          defaultMessage="Comment"
        ></FormattedMessage>
      ),
      dataIndex: 'generalComment',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.meanValue"
          defaultMessage="Mean value (of unit)"
        ></FormattedMessage>
      ),
      dataIndex: 'meanValue',
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.quantitativeReference"
          defaultMessage="Quantitative reference"
        />
      ),
      dataIndex: 'quantitativeReference',
      sorter: false,
      search: false,
      render: (_, row) => {
        if (row.quantitativeReference) {
          return <CheckCircleOutlined />;
        }
        // return <CloseCircleOutlined />;
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
              onData={onUnitData}
              setViewDrawerVisible={() => {}}
            />
            <UnitDelete
              id={row.dataSetInternalID}
              data={unitDataSource}
              buttonType={'icon'}
              actionRef={actionRefUnitTable}
              setViewDrawerVisible={() => {}}
              onData={onUnitData}
            />
          </Space>,
        ];
      },
    },
  ];
  const tabContent: { [key: string]: JSX.Element } = {
    unitGroupInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.unitgroup.edit.unitGroupInformation.name"
              defaultMessage="Name of unit group"
            />
          }
        >
          <LangTextItemForm
            name={['unitGroupInformation', 'dataSetInformation', 'common:name']}
            label={
              <FormattedMessage
                id="pages.unitgroup.edit.unitGroupInformation.name"
                defaultMessage="Name of unit group"
              />
            }
            rules={StringMultiLang_r}
          ></LangTextItemForm>
        </Card>
        <br />
        <LevelTextItemForm
          name={[
            'unitGroupInformation',
            'dataSetInformation',
            'classificationInformation',
            'common:classification',
            'common:class',
          ]}
          lang={lang}
          formRef={formRef}
          dataType={'UnitGroup'}
          onData={onData}
        />
        <Form.Item
          label="ID"
          name={['unitGroupInformation', 'dataSetInformation', 'common:UUID']}
          hidden
        >
          <Input></Input>
        </Form.Item>
      </Space>
    ),
    modellingAndValidation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <SourceSelectForm
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:referenceToComplianceSystem',
          ]}
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.modellingAndValidation.referenceToComplianceSystem"
              defaultMessage="Compliance system name"
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.modellingAndValidation.approvalOfOverallCompliance"
              defaultMessage="Approval of overall compliance"
            />
          }
          name={[
            'modellingAndValidation',
            'complianceDeclarations',
            'compliance',
            'common:approvalOfOverallCompliance',
          ]}
        >
          <Select options={complianceOptions} />
        </Form.Item>
      </Space>
    ),
    administrativeInformation: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.administrativeInformation.timeStamp"
              defaultMessage="Time stamp (last saved)"
            />
          }
          name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
        >
          <Input disabled={true} style={{ color: token.colorTextDescription }} />
        </Form.Item>
        <SourceSelectForm
          name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.administrativeInformation.referenceToDataSetFormat"
              defaultMessage="Data set format(s)"
            />
          }
          lang={lang}
          formRef={formRef}
          onData={onData}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.administrativeInformation.dataSetVersion"
              defaultMessage="Data set version"
            />
          }
          name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          rules={dataSetVersion}
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
          return [<UnitCreate key={0} onData={onUnitDataCreate}></UnitCreate>];
        }}
        dataSource={genUnitTableData(unitDataSource, lang)}
        columns={unitColumns}
      ></ProTable>
    ),
  };

  return (
    <>
      <Card
        style={{ width: '100%' }}
        tabList={tabList}
        activeTabKey={activeTabKey}
        onTabChange={onTabChange}
      >
        {tabContent[activeTabKey]}
      </Card>
    </>
  );
};
