import RequiredSelectFormTitle, { ErrRefTipMessage } from '@/components/RequiredSelectFormTitle';
import { RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import { getLocalValueProps, validateRefObjectId } from '@/pages/Utils';
import { getRefData } from '@/services/general/api';
import { getSourceDetail } from '@/services/sources/api';
import { SourceDetailData, SourceDetailResponse } from '@/services/sources/data';
import { genSourceFromData } from '@/services/sources/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage, useModel } from '@umijs/max';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import type { Rule } from 'antd/lib/form';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import SourceEdit from '../edit';
import SourceView from '../view';
import SourceSelectDrawer from './drawer';
const { TextArea } = Input;

type Props = {
  parentName?: Array<string | number>;
  name: Array<string | number>;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  rules?: Rule[];
  defaultSourceName?: string;
  type?: 'reviewReport';
  showRequiredLabel?: boolean;
};

type RefDataResponse = {
  data?: SourceDetailData | null;
  success?: boolean;
};

const SourceSelectForm: FC<Props> = ({
  parentName,
  name,
  label,
  lang,
  formRef,
  onData,
  rules = [],
  defaultSourceName,
  type,
  showRequiredLabel = false,
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [dataUserId, setDataUserId] = useState<string | undefined>(undefined);
  const [errRef, setErrRef] = useState<RefCheckType | null>(null);
  const refCheckContext = useRefCheckContext();
  const [refData, setRefData] = useState<SourceDetailData | null>(null);
  const { initialState } = useModel('@@initialState');
  const updateErrRefByDetail = (data: SourceDetailData | null | undefined) => {
    const resolvedId = data?.id;
    const resolvedVersion = data?.version;
    if (
      data?.ruleVerification === false &&
      data?.stateCode !== 100 &&
      data?.stateCode !== 200 &&
      rules?.length &&
      resolvedId &&
      resolvedVersion
    ) {
      setErrRef({
        id: resolvedId,
        version: resolvedVersion,
        ruleVerification: data?.ruleVerification,
        nonExistent: false,
      });
    } else {
      setErrRef(null);
    }
  };
  useEffect(() => {
    if (id && version && !refData) {
      getRefData(id, version, 'sources', '').then((result: RefDataResponse) => {
        setRefData(result.data ? { ...result.data } : null);
        setDataUserId(result?.data?.userId);
        updateErrRefByDetail(result?.data);
      });
    }
  }, [id, version]);
  useEffect(() => {
    if (refCheckContext?.refCheckData?.length) {
      const ref = refCheckContext?.refCheckData?.find(
        (item) =>
          (item.id === id && item.version === version) ||
          (item.id === refData?.id && item.version === refData?.version),
      );
      if (ref) {
        setErrRef(ref);
      } else if (refData && refData?.id !== errRef?.id) {
        setErrRef(null);
      }
    } else {
      setErrRef(null);
    }
  }, [refCheckContext, refData]);

  const { token } = theme.useToken();
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const handletSourceData = (rowId: string, rowVersion: string) => {
    getSourceDetail(rowId, rowVersion).then(async (result: SourceDetailResponse) => {
      const selectedData = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      setDataUserId(result?.data?.userId);
      updateErrRefByDetail(result?.data);
      if (parentName) {
        await formRef.current?.setFieldValue([...parentName, ...name], {
          '@refObjectId': rowId,
          '@type': 'source data set',
          '@uri': `../sources/${rowId}.xml`,
          '@version': result.data?.version,
          'common:shortDescription':
            selectedData?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? [],
        });
      } else {
        await formRef.current?.setFieldValue(name, {
          '@refObjectId': rowId,
          '@type': 'source data set',
          '@uri': `../sources/${rowId}.xml`,
          '@version': result.data?.version,
          'common:shortDescription':
            selectedData?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? [],
        });
      }
      setId(rowId);
      setVersion(result.data?.version);
      validateRefObjectId(formRef, name, parentName);
      onData();
    });
  };

  // const id = formRef.current?.getFieldValue([...name, '@refObjectId']);

  const getDefaultValue = () => {
    let referenceToDataSetFormatId = null;
    if (defaultSourceName === 'ILCD format') {
      referenceToDataSetFormatId = 'a97a0155-0234-4b87-b4ce-a45da52f2a40';
    }
    if (defaultSourceName === 'ILCD Data Network - compliance (non-Process)') {
      referenceToDataSetFormatId = '9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a';
    }
    if (defaultSourceName === 'ILCD Data Network - Entry-level') {
      referenceToDataSetFormatId = 'd92a1a12-2545-49e2-a585-55c259997756';
    }
    if (!referenceToDataSetFormatId) return;
    getSourceDetail(referenceToDataSetFormatId, '').then(async (result2: SourceDetailResponse) => {
      if (!result2?.success || !result2?.data) return;
      const referenceToDataSetFormatData = genSourceFromData(
        result2.data?.json?.sourceDataSet ?? {},
      );
      const referenceToDataSetFormat = {
        '@refObjectId': referenceToDataSetFormatId,
        '@type': 'source data set',
        '@uri': `../sources/${referenceToDataSetFormatId}.xml`,
        '@version': result2.data?.version,
        'common:shortDescription':
          referenceToDataSetFormatData?.sourceInformation?.dataSetInformation?.[
            'common:shortName'
          ] ?? [],
      };
      if (parentName) {
        formRef.current?.setFieldValue([...parentName, ...name], referenceToDataSetFormat);
      } else {
        formRef.current?.setFieldValue(name, referenceToDataSetFormat);
      }
    });
  };

  useEffect(() => {
    if (defaultSourceName) {
      getDefaultValue();
    }
  }, [defaultSourceName]);

  useEffect(() => {
    // setId(undefined);
    if (parentName) {
      setId(formRef.current?.getFieldValue([...parentName, ...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...parentName, ...name, '@version']));
    } else {
      setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...name, '@version']));
    }
  });

  const isRequiredRule = (rule: Rule): rule is Rule & { required: true } => {
    return (
      typeof rule === 'object' &&
      rule !== null &&
      'required' in rule &&
      Boolean((rule as { required?: boolean }).required)
    );
  };

  const requiredRules = rules.filter(isRequiredRule);
  const isRequired = requiredRules.length > 0;
  const notRequiredRules = rules.filter((rule) => !isRequiredRule(rule)) ?? [];

  return (
    <Card
      size='small'
      style={errRef ? { border: `1px solid ${token.colorError}` } : {}}
      title={
        isRequired || showRequiredLabel ? (
          <RequiredSelectFormTitle
            label={label}
            ruleErrorState={isRequired ? ruleErrorState : false}
            requiredRules={isRequired ? requiredRules : []}
            errRef={isRequired ? errRef : null}
          />
        ) : (
          <>
            {label}{' '}
            {errRef && (
              <span style={{ color: token.colorError, marginLeft: '5px', fontWeight: 'normal' }}>
                <ErrRefTipMessage errRef={errRef} />
              </span>
            )}
          </>
        )
      }
    >
      <Space direction='horizontal'>
        <Form.Item
          label={<FormattedMessage id='pages.source.refObjectId' defaultMessage='Ref object id' />}
          name={[...name, '@refObjectId']}
          required={false}
          rules={[
            ...notRequiredRules,
            ...(isRequired
              ? [
                  {
                    validator: (_: Rule, value: unknown) => {
                      if (!value) {
                        setRuleErrorState(true);
                        console.log('form rules check error');
                        return Promise.reject(new Error());
                      }
                      setRuleErrorState(false);
                      return Promise.resolve();
                    },
                  },
                ]
              : []),
          ]}
        >
          <Input disabled={true} style={{ width: '350px', color: token.colorTextDescription }} />
        </Form.Item>
        <Space direction='horizontal' style={{ marginTop: '6px' }}>
          {!id && (
            <SourceSelectDrawer
              type={type}
              buttonType='text'
              lang={lang}
              onData={handletSourceData}
            />
          )}
          {id && (
            <SourceSelectDrawer
              type={type}
              buttonType='text'
              buttonText={<FormattedMessage id='pages.button.reselect' defaultMessage='Reselect' />}
              lang={lang}
              onData={handletSourceData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletSourceData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update Reference'
              />
            </Button>
          )}
          {id && <SourceView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && dataUserId === initialState?.currentUser?.userid && (
            <SourceEdit
              lang={lang}
              id={id}
              version={version ?? ''}
              buttonType=''
              setViewDrawerVisible={() => {}}
              updateErrRef={(data) => setErrRef(data)}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                formRef.current?.setFieldValue([...name], {});
                onData();
                validateRefObjectId(formRef, name, parentName);
              }}
            >
              <FormattedMessage id='pages.button.clear' defaultMessage='Clear' />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.contact.type' defaultMessage='Type' />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.contact.uri' defaultMessage='URI' />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id='pages.contact.version' defaultMessage='Version' />}
        name={[...name, '@version']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Divider orientationMargin='0' orientation='left' plain>
        <FormattedMessage id='pages.contact.shortDescription' defaultMessage='Short description' />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex='100px' style={{ marginRight: '10px' }}>
                    <Form.Item
                      getValueProps={(value) => getLocalValueProps(value)}
                      noStyle
                      name={[subField.name, '@xml:lang']}
                    >
                      <Input
                        disabled={true}
                        style={{ width: '100px', color: token.colorTextDescription }}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex='auto' style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea
                        placeholder='text'
                        rows={1}
                        disabled={true}
                        style={{ color: token.colorTextDescription }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ))}
              {subFields.length < 1 && <Input disabled={true} />}
            </div>
          )}
        </Form.List>
      </Form.Item>
    </Card>
  );
};

export default SourceSelectForm;
