import RequiredSelectFormTitle, { ErrRefTipMessage } from '@/components/RequiredSelectFormTitle';
import { RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import { validateRefObjectId } from '@/pages/Utils';
import { getContactDetail } from '@/services/contacts/api';
import { ContactDetailData, ContactDetailResponse } from '@/services/contacts/data';
import { genContactFromData } from '@/services/contacts/util';
import { getRefData } from '@/services/general/api';
import { jsonToList } from '@/services/general/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import type { Rule } from 'antd/lib/form';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, useModel } from 'umi';
import ContactEdit from '../edit';
import ContactView from '../view';
import ContactSelectDrawer from './drawer';
const { TextArea } = Input;

type Props = {
  parentName?: Array<string | number>;
  name: Array<string | number>;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  rules?: Rule[];
  showRequiredLabel?: boolean;
  disabled?: boolean;
};

type RefDataResponse = {
  data?: ContactDetailData | null;
  success?: boolean;
};

const ContactSelectForm: FC<Props> = ({
  parentName,
  name,
  label,
  lang,
  formRef,
  onData,
  rules = [],
  showRequiredLabel = false,
  disabled = false,
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [dataUserId, setDataUserId] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const [refData, setRefData] = useState<ContactDetailData | null>(null);
  const [errRef, setErrRef] = useState<RefCheckType | null>(null);
  const refCheckContext = useRefCheckContext();
  const { initialState } = useModel('@@initialState');

  const updateErrRefByDetail = (data: ContactDetailData | null | undefined) => {
    if (
      data?.ruleVerification === false &&
      data?.stateCode !== 100 &&
      data?.stateCode !== 200 &&
      rules?.length &&
      data?.id &&
      data?.version
    ) {
      setErrRef({
        id: data.id,
        version: data.version,
        ruleVerification: data?.ruleVerification,
        nonExistent: false,
      });
    } else {
      setErrRef(null);
    }
  };

  useEffect(() => {
    if (id && version && !refData) {
      getRefData(id, version, 'contacts', '').then((result: RefDataResponse) => {
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

  const handletContactData = (rowId: string, rowVersion: string) => {
    getContactDetail(rowId, rowVersion).then(async (result: ContactDetailResponse) => {
      updateErrRefByDetail(result?.data);
      setDataUserId(result?.data?.userId);
      const selectedData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      if (parentName) {
        await formRef.current?.setFieldValue([...parentName, ...name], {
          '@refObjectId': rowId,
          '@type': 'contact data set',
          '@uri': `../contacts/${rowId}.xml`,
          '@version': result.data?.version,
          'common:shortDescription':
            jsonToList(
              selectedData?.contactInformation?.dataSetInformation?.['common:shortName'],
            ) ?? [],
        });
      } else {
        await formRef.current?.setFieldValue(name, {
          '@refObjectId': rowId,
          '@type': 'contact data set',
          '@uri': `../contacts/${rowId}.xml`,
          '@version': result.data?.version,
          'common:shortDescription':
            jsonToList(
              selectedData?.contactInformation?.dataSetInformation?.['common:shortName'],
            ) ?? [],
        });
      }
      setId(rowId);
      setVersion(result.data?.version);
      validateRefObjectId(formRef, name, parentName);
      onData();
    });
  };

  useEffect(() => {
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
          required={false}
          label={
            <FormattedMessage
              id='pages.contact.refObjectId'
              defaultMessage='Reference contact data set identifier'
            />
          }
          name={[...name, '@refObjectId']}
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
          {!id && !disabled && (
            <ContactSelectDrawer buttonType='text' lang={lang} onData={handletContactData} />
          )}
          {id && !disabled && (
            <ContactSelectDrawer
              buttonType='text'
              buttonText={<FormattedMessage id='pages.button.reselect' defaultMessage='Reselect' />}
              lang={lang}
              onData={handletContactData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletContactData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update Reference'
              />
            </Button>
          )}
          {id && <ContactView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && dataUserId === initialState?.currentUser?.userid && !disabled && (
            <ContactEdit
              lang={lang}
              id={id}
              version={version ?? ''}
              buttonType=''
              setViewDrawerVisible={() => {}}
              updateErrRef={(data) => setErrRef(data)}
            />
          )}
          {id && !disabled && (
            <Button
              onClick={() => {
                formRef.current?.setFieldValue([...name], {});
                validateRefObjectId(formRef, name, parentName);
                onData();
              }}
            >
              <FormattedMessage id='pages.button.clear' defaultMessage='Clear' />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        hidden={true}
        label={<FormattedMessage id='pages.contact.type' defaultMessage='Type' />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden={true}
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
                      noStyle
                      name={[subField.name, '@xml:lang']}
                      getValueProps={(value) => ({
                        value: value === 'en' ? 'English' : value === 'zh' ? '简体中文' : value,
                      })}
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

export default ContactSelectForm;
