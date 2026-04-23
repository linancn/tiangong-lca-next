import LangTextItemForm from '@/components/LangTextItem/form';
import UnitConvert from '@/components/UnitConvert';
import { UnitsContext } from '@/contexts/unitContext';
import FlowsSelectForm from '@/pages/Flows/Components/select/form';
import SourceSelectForm from '@/pages/Sources/Components/select/form';
import { getRules } from '@/pages/Utils';
import type { ValidationIssueSdkDetail } from '@/pages/Utils/review';
import { ProcessExchangeData } from '@/services/processes/data';
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
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import schema from '../../processes_schema.json';
import { getSdkSuggestedFixMessage, resolveRequiredValidationMessage } from '../../sdkValidationUi';
import {
  DataDerivationTypeStatusOptions,
  dataSourceTypeOptions,
  functionTypeOptions,
} from '../optiondata';

type SdkFieldMessageEntry = {
  text: string;
  validationCode?: string;
};

type Props = {
  id: string;
  data: ProcessExchangeData[];
  lang: string;
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: ProcessExchangeData[]) => void;
  showRules: boolean;
  disabled?: boolean;
  sdkHighlights?: ValidationIssueSdkDetail[];
  autoOpen?: boolean;
};

const normalizeExchangeAmountValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === 'undefined') {
    return undefined;
  }

  return value;
};

const normalizeExchangeFormData = (exchangeData: ProcessExchangeData): ProcessExchangeData => ({
  ...exchangeData,
  meanAmount: normalizeExchangeAmountValue(exchangeData?.meanAmount),
  resultingAmount: normalizeExchangeAmountValue(exchangeData?.resultingAmount),
});

const normalizeQuantitativeReferenceSelection = (
  exchangeData: ProcessExchangeData[],
  selectedExchangeInternalId: string,
) => {
  const selectedExchange = exchangeData.find(
    (item) => item['@dataSetInternalID'] === selectedExchangeInternalId,
  );

  if (selectedExchange?.quantitativeReference !== true) {
    return exchangeData;
  }

  return exchangeData.map((item) => ({
    ...item,
    quantitativeReference: item['@dataSetInternalID'] === selectedExchangeInternalId,
  }));
};

const parseSdkFieldPathToFormName = (fieldPath?: string) => {
  if (!fieldPath) {
    return undefined;
  }

  const normalizedPath = fieldPath.replace(/^exchange\[#.+?\]\.?/, '');
  const segments = normalizedPath.split('.').filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  return segments.map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
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
  sdkHighlights = [],
  autoOpen = false,
}) => {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<ProcessExchangeData>({});
  const [initData, setInitData] = useState<ProcessExchangeData>({});
  const [asInput, setAsInput] = useState(false);
  const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);
  const [units, setUnits] = useState<{ name: string; meanValue: number }[]>([]);
  const [unitConvertVisible, setUnitConvertVisible] = useState(false);
  const [unitConvertName, setUnitConvertName] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const autoOpenConsumedRef = useRef(false);
  const sdkFieldMessagesRef = useRef<
    Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
  >(new Map());
  useEffect(() => {
    if (!unitConvertVisible) {
      setUnitConvertName('');
    }
  }, [unitConvertVisible]);

  const sdkFieldMessages = sdkHighlights.reduce<
    Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
  >((accumulator, detail) => {
    const formName =
      (Array.isArray(detail.formName) && detail.formName.length > 0
        ? detail.formName
        : parseSdkFieldPathToFormName(detail.fieldPath)) ??
      (detail.fieldKey ? [detail.fieldKey] : undefined);
    const fieldKey = formName ? formName.map(String).join('.') : '';
    const messageText = getSdkSuggestedFixMessage(intl, detail);

    if (!formName || !fieldKey || !messageText) {
      return accumulator;
    }
    const messageEntry: SdkFieldMessageEntry = {
      text: messageText,
      validationCode: detail.validationCode,
    };

    const currentEntry = accumulator.get(fieldKey);
    if (currentEntry) {
      if (
        !currentEntry.entries.some(
          (entry) =>
            entry.text === messageEntry.text &&
            entry.validationCode === messageEntry.validationCode,
        )
      ) {
        currentEntry.entries.push(messageEntry);
      }
      return accumulator;
    }

    accumulator.set(fieldKey, {
      entries: [messageEntry],
      name: formName,
    });
    return accumulator;
  }, new Map());

  const renderSdkHighlightedField = (_fieldKey: string, content: ReactNode) => content;

  useEffect(() => {
    if (!autoOpen) {
      autoOpenConsumedRef.current = false;
      return;
    }

    if (autoOpenConsumedRef.current) {
      return;
    }

    autoOpenConsumedRef.current = true;
    setDrawerVisible(true);
  }, [autoOpen]);

  const handletFromData = () => {
    setFromData(formRefEdit.current?.getFieldsValue() ?? {});
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    // setSpinning(true);
    formRefEdit.current?.resetFields();
    const filteredData = normalizeExchangeFormData(
      data?.find((item) => item['@dataSetInternalID'] === id) ?? {},
    );
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

  useEffect(() => {
    const formInstance = formRefEdit.current;
    if (
      !drawerVisible ||
      !formInstance ||
      typeof formInstance.setFields !== 'function' ||
      typeof formInstance.getFieldError !== 'function'
    ) {
      return;
    }

    const previousEntries = sdkFieldMessagesRef.current;
    const nextEntries = sdkFieldMessages;
    const changedFieldData = new Set<string>();
    const fieldStates: Array<{ errors: string[]; name: Array<string | number> }> = [];
    const appliedEntries = new Map<
      string,
      { entries: SdkFieldMessageEntry[]; name: Array<string | number> }
    >();

    [...previousEntries.keys(), ...nextEntries.keys()].forEach((key) => {
      if (changedFieldData.has(key)) {
        return;
      }

      changedFieldData.add(key);

      const previousEntry = previousEntries.get(key);
      const nextEntry = nextEntries.get(key);
      const fieldName = nextEntry?.name ?? previousEntry?.name;

      if (!fieldName) {
        return;
      }

      const existingErrors = formInstance.getFieldError(fieldName) ?? [];
      const previousSdkMessages = previousEntry?.entries.map((entry) => entry.text) ?? [];
      const retainedErrors = existingErrors.filter(
        (errorMessage: string) => !previousSdkMessages.includes(errorMessage),
      );
      const nextErrors = [...retainedErrors];
      const nextAppliedFieldEntries: SdkFieldMessageEntry[] = [];

      (nextEntry?.entries ?? []).forEach((entry) => {
        const requiredResolution = resolveRequiredValidationMessage({
          context: 'exchange',
          fieldName,
          frontendRulesEnabled: showRules,
          intl,
          retainedErrors,
          schemaRoot: schema,
          validationCode: entry.validationCode,
        });

        if (requiredResolution.suppressSdkMessage) {
          return;
        }

        const resolvedEntry = {
          ...entry,
          text: requiredResolution.replacementMessage ?? entry.text,
        };

        if (!nextErrors.includes(resolvedEntry.text)) {
          nextErrors.push(resolvedEntry.text);
        }

        nextAppliedFieldEntries.push(resolvedEntry);
      });

      if (nextAppliedFieldEntries.length > 0) {
        appliedEntries.set(key, {
          entries: nextAppliedFieldEntries,
          name: fieldName,
        });
      }

      if (
        existingErrors.length === nextErrors.length &&
        existingErrors.every(
          (errorMessage: string, index: number) => errorMessage === nextErrors[index],
        )
      ) {
        return;
      }

      fieldStates.push({
        errors: nextErrors,
        name: fieldName,
      });
    });

    if (fieldStates.length > 0) {
      formInstance.setFields(fieldStates);
    }

    sdkFieldMessagesRef.current = appliedEntries;
  }, [drawerVisible, intl, showRules, sdkFieldMessages]);

  useEffect(() => {
    if (!drawerVisible || sdkHighlights.length === 0) {
      return;
    }

    const highlightedField = sdkHighlights[0];
    const fieldName =
      (Array.isArray(highlightedField?.formName) && highlightedField.formName.length > 0
        ? highlightedField.formName
        : parseSdkFieldPathToFormName(highlightedField?.fieldPath)) ??
      (highlightedField?.fieldKey ? [highlightedField.fieldKey] : undefined);
    const formInstance = formRefEdit.current;

    if (!fieldName || !formInstance || typeof formInstance.scrollToField !== 'function') {
      return;
    }

    const timer = window.setTimeout(() => {
      formInstance.scrollToField(fieldName, { focus: true });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [drawerVisible, fromData, sdkHighlights]);

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
        destroyOnHidden
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
            const nextExchangeData = normalizeQuantitativeReferenceSelection(
              data.map((item) => {
                if (item['@dataSetInternalID'] === id) {
                  return fromData;
                }
                return item;
              }),
              id,
            );
            onData(nextExchangeData);
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
            {renderSdkHighlightedField(
              'exchangeDirection',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'referenceToFlowDataSet',
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
              </UnitsContext.Provider>,
            )}
            {renderSdkHighlightedField(
              'location',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'functionType',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'referenceToVariable',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'meanAmount',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'resultingAmount',
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
              </Form.Item>,
            )}

            {renderSdkHighlightedField(
              'uncertaintyDistributionType',
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
              </Form.Item>,
            )}
            {formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'triangular' ||
            formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'uniform' ? (
              <>
                {renderSdkHighlightedField(
                  'minimumAmount',
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
                  </Form.Item>,
                )}
                {renderSdkHighlightedField(
                  'maximumAmount',
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
                  </Form.Item>,
                )}
              </>
            ) : (
              <></>
            )}

            {formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'log-normal' ||
            formRefEdit.current?.getFieldValue('uncertaintyDistributionType') === 'log-normal' ? (
              <>
                {renderSdkHighlightedField(
                  'relativeStandardDeviation95In',
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
                  </Form.Item>,
                )}
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
            {renderSdkHighlightedField(
              'dataSourceType',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'dataDerivationTypeStatus',
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
              </Form.Item>,
            )}
            {renderSdkHighlightedField(
              'referencesToDataSource',
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
                              <FormattedMessage
                                id='pages.button.item.label'
                                defaultMessage='Item'
                              />
                            </Button>
                          </Space>
                        )}
                      </Form.List>
                    ),
                  },
                ]}
              />,
            )}
            {renderSdkHighlightedField(
              'generalComment',
              <>
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
              </>,
            )}
            <Card
              size='small'
              title={
                <FormattedMessage
                  id='pages.process.view.exchange.quantitativeReference'
                  defaultMessage='Quantitative reference'
                />
              }
            >
              {renderSdkHighlightedField(
                'quantitativeReference',
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
                </Form.Item>,
              )}
              {functionalUnitOrOther ? (
                renderSdkHighlightedField(
                  'functionalUnitOrOther',
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
                  </>,
                )
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
