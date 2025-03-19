import LangTextItemForm from '@/components/LangTextItem/form';
import LevelTextItemForm from '@/components/LevelTextItem/form';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { ListPagination } from '@/services/general/data';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitTableData } from '@/services/unitgroups/util';
import { ActionType, ProColumns, ProFormInstance, ProTable } from '@ant-design/pro-components';
import { Card, Form, Input, Select, Space, theme } from 'antd';
import { FC, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitCreate from './Unit/create';
import UnitDelete from './Unit/delete';
import UnitEdit from './Unit/edit';
import UnitView from './Unit/view';
import { complianceOptions } from './optiondata';
import schema from '../unitgroups_schema.json';
import { getRules } from '@/pages/Utils';
import RequiredMark from '@/components/RequiredMark';
import ContactSelectForm from '@/pages/Contacts/Components/select/form';

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
  const [showNameError, setShowNameError] = useState(false);
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
        return <QuantitativeReferenceIcon value={row.quantitativeReference} />;
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
              setViewDrawerVisible={() => { }}
            />
            <UnitDelete
              id={row.dataSetInternalID}
              data={unitDataSource}
              buttonType={'icon'}
              actionRef={actionRefUnitTable}
              setViewDrawerVisible={() => { }}
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
            <RequiredMark
              showError={showNameError}
              label={
                <FormattedMessage
                  id="pages.unitgroup.edit.unitGroupInformation.name"
                  defaultMessage="Name of unit group"
                />
              }
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
            setRuleErrorState={setShowNameError}
            rules={getRules(schema['unitGroupDataSet']['unitGroupInformation']['dataSetInformation']['common:name']['rules'] ?? [])}
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
          rules={getRules(schema['unitGroupDataSet']['unitGroupInformation']['dataSetInformation']['classificationInformation']['common:classification']['common:class']['rules'] ?? [])}
        />
        <Card
            size="small"
            title={
              <FormattedMessage
                id="pages.unitgroup.edit.unitGroupInformation.generalComment"
                defaultMessage="General comment"
              />
            }
          >
        <LangTextItemForm
            name={['unitGroupInformation', 'dataSetInformation', 'common:generalComment']}
            label={
              <FormattedMessage
                id="pages.unitgroup.edit.unitGroupInformation.generalComment"
                defaultMessage="General comment"
              />
            }
          />
        </Card>
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
          rules={getRules(schema['unitGroupDataSet']['modellingAndValidation']['complianceDeclarations']['compliance']['common:referenceToComplianceSystem']['rules'] ?? [])}
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
          rules={getRules(schema['unitGroupDataSet']['modellingAndValidation']['complianceDeclarations']['compliance']['common:approvalOfOverallCompliance']['rules'] ?? [])}
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
          rules={getRules(schema['unitGroupDataSet']['administrativeInformation']['dataEntryBy']['common:timeStamp']['rules'] ?? [])}
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
          rules={getRules(schema['unitGroupDataSet']['administrativeInformation']['dataEntryBy']['common:referenceToDataSetFormat']['rules'] ?? [])}
        />
        <Form.Item
          label={
            <FormattedMessage
              id="pages.unitgroup.edit.administrativeInformation.dataSetVersion"
              defaultMessage="Data set version"
            />
          }
          name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}
          rules={getRules(schema['unitGroupDataSet']['administrativeInformation']['publicationAndOwnership']['common:dataSetVersion']['rules'] ?? [])}
        >
          <Input />
        </Form.Item>
        <ContactSelectForm
            lang={lang}
            formRef={formRef}
            label={
              <FormattedMessage
                id="pages.unitgroup.edit.administrativeInformation.referenceToOwnershipOfDataSet"
                defaultMessage="Owner of data set"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:referenceToOwnershipOfDataSet',
            ]}
            onData={onData}
            rules={getRules(schema['unitGroupDataSet']['administrativeInformation']['publicationAndOwnership']['common:referenceToOwnershipOfDataSet']['rules'] ?? [])}
          />
                  <Form.Item
            label={
              <FormattedMessage
                id="pages.unitgroup.edit.administrativeInformation.permanentDataSetURI"
                defaultMessage="Permanent data set URI"
              />
            }
            name={[
              'administrativeInformation',
              'publicationAndOwnership',
              'common:permanentDataSetURI',
            ]}
          >
            <Input />
          </Form.Item>
      </Space>
    ),
    units: (
      <ProTable<UnitTable, ListPagination>
        rowKey={(record) => `${record.dataSetInternalID}`}
        actionRef={actionRefUnitTable}
        search={false}
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
        {Object.keys(tabContent).map((key) => (
          <div key={key} style={{ display: key === activeTabKey ? 'block' : 'none' }}>
            {tabContent[key]}
          </div>
        ))}
      </Card>
    </>
  );
};
