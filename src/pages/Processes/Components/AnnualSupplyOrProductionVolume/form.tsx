import { langOptions } from '@/services/general/data';
import { getLangText, getUnitData } from '@/services/general/util';
import {
  ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN,
  buildAnnualSupplyVolumeUnitLookupRows,
  deriveAnnualSupplyVolumeSuffix,
  formatAnnualSupplyVolumeText,
  mergeAnnualSupplyVolumeUnitRows,
  normalizeAnnualSupplyVolumeMultiLang,
  parseAnnualSupplyVolumeText,
  sanitizeAnnualSupplyVolumeNumericInput,
} from '@/services/processes/annualSupplyOrProductionVolume';
import type { ProcessExchangeData } from '@/services/processes/data';
import { CloseOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-components';
import { Button, Col, Form, InputNumber, Row, Select, message } from 'antd';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  exchangeDataSource: ProcessExchangeData[];
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  label: ReactNode | string;
  lang: string;
  name: Array<string | number>;
  onData: () => void;
  rules?: any[];
  setRuleErrorState?: (showError: boolean) => void;
};

const normalizeTextValue = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const AnnualSupplyOrProductionVolumeForm: FC<Props> = ({
  exchangeDataSource,
  formRef,
  label,
  lang,
  name,
  onData,
  rules = [],
  setRuleErrorState,
}) => {
  const intl = useIntl();
  const initialRenderRef = useRef(true);
  const [exchangeDataSourceWithUnits, setExchangeDataSourceWithUnits] =
    useState(exchangeDataSource);
  const form = formRef?.current;
  const formValues = typeof form?.getFieldValue === 'function' ? form.getFieldValue(name) : [];
  const formValueList = Array.isArray(formValues) ? formValues : formValues ? [formValues] : [];
  const isRequired = rules?.some((rule) => rule.required);
  const requiredRule = rules?.find((rule) => rule.required);
  const selectedLangValues = formValueList
    .filter((item: any) => item && item['@xml:lang'])
    .map((item: any) => item['@xml:lang']);
  const suffixByLang = useMemo(() => {
    return langOptions.reduce<Record<string, string>>((accumulator, option) => {
      accumulator[option.value] = deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: exchangeDataSourceWithUnits,
        getLangText,
        lang: option.value,
      });
      return accumulator;
    }, {});
  }, [exchangeDataSourceWithUnits]);

  const getSuffixForLang = useCallback(
    (value?: string) => suffixByLang[value || lang] ?? suffixByLang.en,
    [lang, suffixByLang],
  );

  useEffect(() => {
    setExchangeDataSourceWithUnits(exchangeDataSource);

    const unitLookupRows = buildAnnualSupplyVolumeUnitLookupRows(exchangeDataSource);
    const hasReferenceFlow = unitLookupRows.some((row) => row.referenceToFlowDataSetId);

    if (!hasReferenceFlow) {
      return;
    }

    getUnitData('flow', unitLookupRows).then(
      (unitRows) => {
        setExchangeDataSourceWithUnits(
          mergeAnnualSupplyVolumeUnitRows(exchangeDataSource, unitRows),
        );
      },
      () => {
        setExchangeDataSourceWithUnits(exchangeDataSource);
      },
    );
  }, [exchangeDataSource]);

  useEffect(() => {
    if (
      !form ||
      typeof form.setFieldValue !== 'function' ||
      !Array.isArray(formValueList) ||
      formValueList.length === 0
    ) {
      return;
    }

    const normalizedValues = normalizeAnnualSupplyVolumeMultiLang(formValueList, (item) =>
      getSuffixForLang(String(item['@xml:lang'] ?? lang)),
    );

    if (JSON.stringify(normalizedValues) !== JSON.stringify(formValueList)) {
      form.setFieldValue(name, normalizedValues);
      onData();
    }
  }, [form, formValueList, getSuffixForLang, lang, name, onData]);

  return (
    <Form.Item>
      <Form.List
        name={name}
        rules={
          isRequired
            ? [
                {
                  validator: async (_, value) => {
                    const normalizedValue = Array.isArray(value) ? value : [];
                    const hasAnyMeaningfulValue = normalizedValue.some((item: any) => {
                      return (
                        !!item &&
                        (!!item['@xml:lang'] || normalizeTextValue(item['#text']).length > 0)
                      );
                    });

                    if (!hasAnyMeaningfulValue) {
                      if (setRuleErrorState) setRuleErrorState(false);
                      return Promise.resolve();
                    }

                    const lists = normalizedValue.filter(
                      (item: any) => item && item.hasOwnProperty('@xml:lang'),
                    );
                    const langs = lists.map((item: any) => item['@xml:lang']);
                    const enIndex = langs.indexOf('en');
                    if (langs && langs.length && enIndex === -1) {
                      if (setRuleErrorState) {
                        setRuleErrorState(true);
                      } else {
                        message.error(
                          intl.formatMessage({
                            id: 'validator.lang.mustBeEnglish',
                            defaultMessage: 'English is a required language!',
                          }),
                        );
                      }
                      return Promise.reject(new Error());
                    }
                    if (setRuleErrorState) setRuleErrorState(false);
                    return Promise.resolve();
                  },
                },
              ]
            : []
        }
      >
        {(subFields, subOpt) => {
          if (isRequired && subFields.length === 0 && initialRenderRef.current) {
            initialRenderRef.current = false;
            requestAnimationFrame(() => {
              subOpt.add();
            });
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => {
                const currentLang = formValues?.[subField.name]?.['@xml:lang'];
                const currentSuffix = getSuffixForLang(currentLang);
                const optionsWithDisabled = langOptions.map((option) => ({
                  ...option,
                  disabled:
                    selectedLangValues.includes(option.value) && option.value !== currentLang,
                }));
                const textRules = isRequired
                  ? [
                      {
                        validator: async (_: unknown, value: unknown) => {
                          const normalizedValue = normalizeTextValue(value);

                          if (normalizedValue.length === 0) {
                            return Promise.reject(
                              new Error(
                                intl.formatMessage({
                                  id: requiredRule?.messageKey ?? 'validator.lang.text.required',
                                  defaultMessage:
                                    requiredRule?.defaultMessage ?? 'Please input this field!',
                                }),
                              ),
                            );
                          }

                          if (!ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN.test(normalizedValue)) {
                            return Promise.reject(
                              new Error(
                                intl.formatMessage({
                                  id: 'pages.process.validator.annualSupplyOrProductionVolume.pattern',
                                  defaultMessage:
                                    'Please enter a number; the reference flow suffix is added automatically.',
                                }),
                              ),
                            );
                          }

                          return Promise.resolve();
                        },
                      },
                    ]
                  : [];

                return (
                  <Row key={subField.key} gutter={[10, 0]} align='top'>
                    <Col flex='180px'>
                      <Form.Item
                        name={[subField.name, '@xml:lang']}
                        rules={
                          isRequired
                            ? [
                                {
                                  validator: async (_, value) => {
                                    if (!value) {
                                      return Promise.reject(
                                        new Error(
                                          intl.formatMessage({
                                            id: 'validator.lang.select',
                                            defaultMessage: 'Please select a language!',
                                          }),
                                        ),
                                      );
                                    }

                                    if (value === 'en' && setRuleErrorState) {
                                      setRuleErrorState(false);
                                    }
                                    return Promise.resolve();
                                  },
                                },
                              ]
                            : []
                        }
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder={
                            <FormattedMessage
                              id='pages.lang.select'
                              defaultMessage='Select a lang'
                            />
                          }
                          optionFilterProp='lang'
                          options={optionsWithDisabled}
                          onChange={() => onData()}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex='auto'>
                      <Form.Item
                        name={[subField.name, '#text']}
                        getValueProps={(value) => ({
                          value: sanitizeAnnualSupplyVolumeNumericInput(
                            parseAnnualSupplyVolumeText(value).numericText,
                          ),
                        })}
                        normalize={(value) => formatAnnualSupplyVolumeText(value, currentSuffix)}
                        rules={textRules}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          controls={false}
                          inputMode='decimal'
                          onChange={() => onData()}
                          stringMode
                          style={{ width: '100%' }}
                          suffix={currentSuffix}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex='20px' style={{ paddingTop: '8px' }}>
                      <CloseOutlined
                        style={{
                          cursor: isRequired && subFields.length === 1 ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => {
                          if (isRequired && subFields.length === 1) {
                            return;
                          }
                          subOpt.remove(subField.name);
                          onData();
                        }}
                      />
                    </Col>
                  </Row>
                );
              })}
              <Button
                type='dashed'
                onClick={() => {
                  subOpt.add();
                  onData();
                }}
                block
                style={{ marginTop: '8px' }}
              >
                + <FormattedMessage id='pages.button.item.add' defaultMessage='Add' /> {label}{' '}
                <FormattedMessage id='pages.button.item.label' defaultMessage='Item' />
              </Button>
            </div>
          );
        }}
      </Form.List>
    </Form.Item>
  );
};

export default AnnualSupplyOrProductionVolumeForm;
