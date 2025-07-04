import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import { useUpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { validateRefObjectId } from '@/pages/Utils';
import { getContactDetail } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import { getRefData } from '@/services/general/api';
import { jsonToList } from '@/services/general/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactEdit from '../edit';
import ContactView from '../view';
import ContactSelectDrawer from './drawer';
const { TextArea } = Input;

type Props = {
  parentName?: any;
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  rules?: any;
};

const ContactSelectForm: FC<Props> = ({
  parentName,
  name,
  label,
  lang,
  formRef,
  onData,
  rules = [],
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [dataUserId, setDataUserId] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();
  const { referenceValue } = useUpdateReferenceContext() as { referenceValue: number };
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const [refData, setRefData] = useState<any>(null);
  const [errRef, setErrRef] = useState<RefCheckType | null>(null);
  const refCheckContext = useRefCheckContext();
  const updateErrRefByDetail = (data: any) => {
    if (
      data?.ruleVerification === false &&
      data?.stateCode !== 100 &&
      data?.stateCode !== 200 &&
      rules?.length
    ) {
      setErrRef({
        id: data?.id,
        version: data?.version,
        ruleVerification: data?.ruleVerification,
        nonExistent: false,
      });
    } else {
      setErrRef(null);
    }
  };

  useEffect(() => {
    if (id && version && !refData) {
      getRefData(id, version, 'contacts', '').then((result: any) => {
        setRefData({ ...result.data });
        setDataUserId(result?.data?.userId);
        updateErrRefByDetail(result?.data);
      });
    }
  }, [id, version]);

  useEffect(() => {
    if (refCheckContext?.refCheckData?.length) {
      const ref = refCheckContext?.refCheckData?.find(
        (item: any) => item.id === id && item.version === version,
      );
      if (ref) {
        setErrRef(ref);
      } else {
        setErrRef(null);
      }
    } else {
      setErrRef(null);
    }
  }, [refCheckContext]);

  const handletContactData = (rowId: string, rowVersion: string) => {
    getContactDetail(rowId, rowVersion).then(async (result: any) => {
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
    if (id) {
      handletContactData(id, version ?? '');
    }
  }, [referenceValue]);

  useEffect(() => {
    if (parentName) {
      setId(formRef.current?.getFieldValue([...parentName, ...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...parentName, ...name, '@version']));
    } else {
      setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...name, '@version']));
    }
  });

  const requiredRules = rules.filter((rule: any) => rule.required);
  const isRequired = requiredRules && requiredRules.length;
  const notRequiredRules = rules.filter((rule: any) => !rule.required) ?? [];

  return (
    <Card
      size='small'
      style={errRef ? { border: `1px solid ${token.colorError}` } : {}}
      title={
        isRequired ? (
          <RequiredSelectFormTitle
            label={label}
            ruleErrorState={ruleErrorState}
            requiredRules={requiredRules}
            errRef={errRef}
          />
        ) : (
          <>
            {label}{' '}
            {errRef && (
              <span style={{ color: token.colorError, marginLeft: '5px', fontWeight: 'normal' }}>
                {errRef?.ruleVerification === false ? (
                  <FormattedMessage
                    id='pages.select.unRuleVerification'
                    defaultMessage='Data is incomplete'
                  />
                ) : errRef?.nonExistent === true ? (
                  <FormattedMessage
                    id='pages.select.nonExistentRef'
                    defaultMessage='Data does not exist'
                  />
                ) : (
                  ''
                )}
              </span>
            )}
          </>
        )
      }
    >
      <Space direction='horizontal'>
        <Form.Item
          label={
            <FormattedMessage
              id='pages.contact.refObjectId'
              defaultMessage='Reference contact data set identifier'
            />
          }
          name={[...name, '@refObjectId']}
          rules={[
            ...notRequiredRules,
            isRequired && {
              validator: (rule, value) => {
                if (!value) {
                  setRuleErrorState(true);
                  console.log('form rules check error');
                  return Promise.reject(new Error());
                }
                setRuleErrorState(false);
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input disabled={true} style={{ width: '350px', color: token.colorTextDescription }} />
        </Form.Item>
        <Space direction='horizontal' style={{ marginTop: '6px' }}>
          {!id && <ContactSelectDrawer buttonType='text' lang={lang} onData={handletContactData} />}
          {id && (
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
                defaultMessage='Update reference'
              />
            </Button>
          )}
          {id && <ContactView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && dataUserId === sessionStorage.getItem('userId') && (
            <ContactEdit
              lang={lang}
              id={id}
              version={version ?? ''}
              buttonType=''
              setViewDrawerVisible={() => {}}
              updateErrRef={(data: any) => setErrRef(data)}
            />
          )}
          {id && (
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
