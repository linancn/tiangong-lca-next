import LangTextItemForm from '@/components/LangTextItem/form';
import UnitConvert from '@/components/UnitConvert';
import { UnitsContext } from '@/contexts/unitContext';
import FlowsSelectForm from '@/pages/Flows/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import styles from '@/style/custom.less';
import { CaretRightOutlined, CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../../processes_schema.json';
import {
  DataDerivationTypeStatusOptions,
  dataSourceTypeOptions,
  functionTypeOptions,
} from '../optiondata';

type Props = {
  id: string;
  data: any;
  lang: string;
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
  showRules: boolean;
  disabled?: boolean;
};
const ProcessExchangeEdit: FC<Props> = ({
  id,
  data,
  lang,
  buttonType,
  // actionRef,
  setViewDrawerVisible,
  onData,
  showRules = false,
  disabled = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [asInput, setAsInput] = useState(false);
  const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitConvertVisible, setUnitConvertVisible] = useState(false);
  const [unitConvertName, setUnitConvertName] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  useEffect(() => {
    if (!unitConvertVisible) {
      setUnitConvertName('');
    }
  }, [unitConvertVisible]);

  const handletFromData = () => {
    setFromData(formRefEdit.current?.getFieldsValue() ?? {});
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    // setSpinning(true);
    formRefEdit.current?.resetFields();
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setInitData(filteredData);
    formRefEdit.current?.setFieldsValue(filteredData);
    setFromData(filteredData);
    setFunctionalUnitOrOther(filteredData?.quantitativeReference ?? false);
    // setSpinning(false);
    setAsInput(filteredData?.exchangeDirection?.toLowerCase() === 'input');
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
        {buttonType === 'icon' ? (
          <Button
            disabled={disabled}
            shape='circle'
            icon={<FormOutlined />}
            size='small'
            onClick={onEdit}
          />
        ) : (
          <Button disabled={disabled} onClick={onEdit}>
            <FormattedMessage id='pages.button.edit' defaultMessage='Edit' />
          </Button>
        )}
      </Tooltip>
      <UnitConvert
        visible={unitConvertVisible}
        onCancel={() => setUnitConvertVisible(false)}
        onOk={(result) => {
          formRefEdit.current?.setFieldValue(unitConvertName, result);
          setFromData({ ...fromData, [unitConvertName]: result });
        }}
        units={units}
        value={undefined}
        targetUnit={targetUnit}
      />
      <Drawer
        getContainer={() => document.body}
        destroyOnClose={true}
        title={
          <FormattedMessage
            id='pages.process.exchange.drawer.title.edit'
            defaultMessage='Edit exchange'
          />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefEdit}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
            setFunctionalUnitOrOther(allValues?.quantitativeReference ?? false);
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData(
              data.map((item: any) => {
                if (item['@dataSetInternalID'] === id) {
                  return fromData;
                }
                return item;
              }),
            );
            formRefEdit.current?.resetFields();
            setDrawerVisible(false);
            // actionRef.current?.reload();
            return true;
          }}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
            <Form.Item name={'@dataSetInternalID'} hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.exchangeDirection'
                  defaultMessage='Exchange direction'
                />
              }
              name={'exchangeDirection'}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['exchanges']['exchange'][0]['exchangeDirection'][
                        'rules'
                      ],
                    )
                  : []
              }
            >
              <Select
                placeholder={
                  <FormattedMessage
                    id='pages.process.view.exchange.selectadirection'
                    defaultMessage='Select a direction'
                  />
                }
                optionFilterProp='direction'
                options={[
                  { value: 'input', label: 'Input' },
                  { value: 'output', label: 'Output' },
                ]}
                onChange={(value) => {
                  setAsInput(value === 'input');
                }}
              />
            </Form.Item>
            <UnitsContext.Provider value={{ units, setUnits, setTargetUnit }}>
              <FlowsSelectForm
                name={['referenceToFlowDataSet']}
                label={
                  <FormattedMessage
                    id='pages.process.view.exchange.referenceToFlowDataSet'
                    defaultMessage='Flow'
                  />
                }
                lang={lang}
                formRef={formRefEdit}
                drawerVisible={drawerVisible}
                asInput={asInput}
                onData={handletFromData}
                rules={
                  showRules
                    ? getRules(
                        schema['processDataSet']['exchanges']['exchange'][0][
                          'referenceToFlowDataSet'
                        ]['@refObjectId']['rules'],
                      )
                    : []
                }
              />
            </UnitsContext.Provider>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.location'
                  defaultMessage='Location'
                />
              }
              name={'location'}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.functionType'
                  defaultMessage='Function type'
                />
              }
              name={'functionType'}
            >
              <Select options={functionTypeOptions} />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.referenceToVariable'
                  defaultMessage='Variable'
                />
              }
              name={'referenceToVariable'}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.meanAmount'
                  defaultMessage='Mean amount'
                />
              }
              name={'meanAmount'}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['exchanges']['exchange'][0]['meanAmount']['rules'],
                    )
                  : []
              }
            >
              <Input
                onClick={() => {
                  setUnitConvertVisible(true);
                  setUnitConvertName('meanAmount');
                }}
              />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.resultingAmount'
                  defaultMessage='Resulting amount'
                />
              }
              name={'resultingAmount'}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['exchanges']['exchange'][0]['resultingAmount'][
                        'rules'
                      ],
                    )
                  : []
              }
            >
              <Input
                onClick={() => {
                  setUnitConvertVisible(true);
                  setUnitConvertName('resultingAmount');
                }}
              />
            </Form.Item>

            <Form.Item
              label={
                <FormattedMessage
                  id='processExchange.uncertaintyDistributionType'
                  defaultMessage='Uncertainty distribution type'
                />
              }
              name={'uncertaintyDistributionType'}
            >
              <Select
                options={[
                  { value: 'undefined', label: 'Undefined' },
                  { value: 'log-normal', label: 'Lognormal' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'triangular', label: 'Triangular' },
                  { value: 'uniform', label: 'Uniform' },
                ]}
              />
            </Form.Item>
            {formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'triangular' ||
            formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'uniform' ? (
              <>
                <Form.Item
                  label={
                    <FormattedMessage
                      id='processExchange.minimumAmount'
                      defaultMessage='Minimum amount'
                    />
                  }
                  name={'minimumAmount'}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label={
                    <FormattedMessage
                      id='processExchange.maximumAmount'
                      defaultMessage='Maximum amount'
                    />
                  }
                  name={'maximumAmount'}
                >
                  <Input />
                </Form.Item>
              </>
            ) : (
              <></>
            )}

            {formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'log-normal' ||
            formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'log-normal' ? (
              <>
                <Form.Item
                  label={
                    <FormattedMessage
                      id='processExchange.relativeStandardDeviation95In'
                      defaultMessage='Relative standard deviation 95 in'
                    />
                  }
                  name={'relativeStandardDeviation95In'}
                >
                  <Input />
                </Form.Item>
              </>
            ) : (
              <></>
            )}
            <Card
              size='small'
              title={
                <FormattedMessage
                  id='pages.process.view.exchange.allocation'
                  defaultMessage='Allocation'
                />
              }
            >
              <Form.Item
                label={
                  <FormattedMessage
                    id='pages.process.view.exchange.internalReferenceToCoProduct'
                    defaultMessage='Internal reference to co-product'
                  />
                }
                name={['allocations', 'allocation', '@internalReferenceToCoProduct']}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={
                  <FormattedMessage
                    id='pages.process.view.exchange.allocatedFraction'
                    defaultMessage='Allocated fraction'
                  />
                }
                name={['allocations', 'allocation', '@allocatedFraction']}
              >
                <InputNumber min={0} max={100} suffix='%' style={{ width: '100%' }} />
              </Form.Item>
            </Card>
            <br />
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.dataSourceType'
                  defaultMessage='Data source type'
                />
              }
              name={'dataSourceType'}
            >
              <Select options={dataSourceTypeOptions} />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.dataDerivationTypeStatus'
                  defaultMessage='Data derivation type / status'
                />
              }
              name={'dataDerivationTypeStatus'}
              rules={
                showRules
                  ? getRules(
                      schema['processDataSet']['exchanges']['exchange'][0][
                        'dataDerivationTypeStatus'
                      ]['rules'],
                    )
                  : []
              }
            >
              <Select options={DataDerivationTypeStatusOptions} />
            </Form.Item>
            <Collapse
              defaultActiveKey={['data-sources']}
              expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: 'data-sources',
                  label: (
                    <FormattedMessage
                      id='pages.process.view.exchange.referenceToDataSource'
                      defaultMessage='Data source(s)'
                    />
                  ),
                  children: (
                    <Form.List
                      name={['referencesToDataSource', 'referenceToDataSource']}
                      initialValue={[{}]}
                    >
                      {(fields, { add, remove }) => (
                        <Space direction='vertical' style={{ width: '100%' }}>
                          {fields.map((field, index) => (
                            <div key={field.key} style={{ position: 'relative' }}>
                              <SourceSelectForm
                                parentName={['referencesToDataSource', 'referenceToDataSource']}
                                name={[field.name]}
                                label={
                                  <Space>
                                    <FormattedMessage
                                      id='pages.process.view.exchange.referenceToDataSource'
                                      defaultMessage='Data source(s)'
                                    />
                                    {index + 1}
                                  </Space>
                                }
                                lang={lang}
                                formRef={formRefEdit}
                                onData={handletFromData}
                              />
                              {fields.length > 1 && (
                                <CloseOutlined
                                  onClick={() => {
                                    remove(field.name);
                                    handletFromData();
                                  }}
                                  style={{ position: 'absolute', right: 8, top: 8 }}
                                />
                              )}
                            </div>
                          ))}
                          <Button
                            type='dashed'
                            block
                            onClick={() => {
                              add({});
                              handletFromData();
                            }}
                            style={{ marginTop: 8 }}
                          >
                            + <FormattedMessage id='pages.button.add' defaultMessage='Add' />{' '}
                            <FormattedMessage
                              id='pages.process.view.exchange.referenceToDataSource'
                              defaultMessage='Data source(s)'
                            />{' '}
                            <FormattedMessage id='pages.button.item.label' defaultMessage='Item' />
                          </Button>
                        </Space>
                      )}
                    </Form.List>
                  ),
                },
              ]}
            />
            <Divider orientationMargin='0' orientation='left' plain>
              <FormattedMessage
                id='pages.process.view.exchange.generalComment'
                defaultMessage='Comment'
              />
            </Divider>
            <LangTextItemForm
              name='generalComment'
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.generalComment'
                  defaultMessage='Comment'
                />
              }
            />
            <Card
              size='small'
              title={
                <FormattedMessage
                  id='pages.process.view.exchange.quantitativeReference'
                  defaultMessage='Quantitative reference'
                />
              }
            >
              <Form.Item
                label={
                  <FormattedMessage
                    id='pages.process.view.exchange.referenceToReferenceFlow'
                    defaultMessage='Reference flow(s)'
                  />
                }
                name={'quantitativeReference'}
              >
                <Switch />
              </Form.Item>
              {functionalUnitOrOther ? (
                <>
                  <Divider orientationMargin='0' orientation='left' plain>
                    <FormattedMessage
                      id='pages.process.view.exchange.functionalUnitOrOther'
                      defaultMessage='Functional unit, Production period, or Other parameter'
                    />
                  </Divider>
                  <LangTextItemForm
                    name='functionalUnitOrOther'
                    label={
                      <FormattedMessage
                        id='pages.process.view.exchange.functionalUnitOrOther'
                        defaultMessage='Functional unit, Production period, or Other parameter'
                      />
                    }
                  />
                </>
              ) : (
                <></>
              )}
            </Card>
          </Space>
        </ProForm>
      </Drawer>
    </>
  );
};

export default ProcessExchangeEdit;
