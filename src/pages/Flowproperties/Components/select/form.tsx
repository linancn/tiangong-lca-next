import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { useRefCheckContext } from '@/contexts/refCheckContext';
import { useUpdateReferenceContext } from '@/contexts/updateReferenceContext';
import UnitGroupFromMini from '@/pages/Unitgroups/Components/select/formMini';
import { getLocalValueProps, validateRefObjectId } from '@/pages/Utils';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
import { getRefData } from '@/services/general/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowpropertiesEdit from '../edit';
import FlowpropertyView from '../view';
import FlowpropertiesSelectDrawer from './drawer';

// import LangTextItemForm from '@/components/LangTextItem/form';
const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  drawerVisible: boolean;
  onData: () => void;
  rules?: any[];
};

const FlowpropertiesSelectForm: FC<Props> = ({
  name,
  label,
  lang,
  formRef,
  drawerVisible,
  onData,
  rules = [],
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [UnitGroupFromMiniKey, setUnitGroupFromMiniKey] = useState<number>(0);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();
  const { referenceValue } = useUpdateReferenceContext() as { referenceValue: number };
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const [refData, setRefData] = useState<any>(null);
  const [errRef, setErrRef] = useState<{ id: string; version: string; type: number } | null>(null);
  const refCheckData = useRefCheckContext();
  useEffect(() => {
    if (id && version) {
      getRefData(id, version, 'flowproperties', '').then((result: any) => {
        setRefData({ ...result.data });
      });
      if (refCheckData.length) {
        const ref = refCheckData.find((item: any) => item.id === id && item.version === version);
        if (ref) {
          setErrRef(ref);
        }else{
          setErrRef(null);
        }
      }else{
        setErrRef(null);
      }
    }
  }, [id, version, refCheckData]);

  const handletFlowpropertyData = (rowId: string, rowVersion: string) => {
    getFlowpropertyDetail(rowId, rowVersion ?? '').then(async (result: any) => {
      const selectedData = genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': rowId,
        '@type': 'flow property data set',
        '@uri': `../flowproperties/${rowId}.xml`,
        '@version': result.data?.version,
        'common:shortDescription':
          selectedData?.flowPropertiesInformation?.dataSetInformation?.['common:name'] ?? [],
      });
      setId(rowId);
      setVersion(result.data?.version);
      validateRefObjectId(formRef, name);
      setUnitGroupFromMiniKey(UnitGroupFromMiniKey + 1);
      onData();
    });
  };
  useEffect(() => {
    if (id) {
      handletFlowpropertyData(id, version ?? '');
    }
  }, [referenceValue]);

  useEffect(() => {
    setId(undefined);
    if (formRef.current?.getFieldValue(name)) {
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
                {errRef?.type === 1 ? (
                  <FormattedMessage
                    id='pages.select.unRuleVerification'
                    defaultMessage='Data is incomplete'
                  />
                ) : errRef?.type === 2 ? (
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
              id='pages.flow.view.flowProperties.refObjectId'
              defaultMessage='Ref object id'
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
          {!id && (
            <FlowpropertiesSelectDrawer
              buttonType='text'
              lang={lang}
              onData={handletFlowpropertyData}
            />
          )}
          {id && (
            <FlowpropertiesSelectDrawer
              buttonType='text'
              buttonText={<FormattedMessage id='pages.button.reselect' defaultMessage='Reselect' />}
              lang={lang}
              onData={handletFlowpropertyData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletFlowpropertyData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update reference'
              />
            </Button>
          )}
          {id && <FlowpropertyView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && refData?.userId === sessionStorage.getItem('userId') && (
            <FlowpropertiesEdit lang={lang} id={id} version={version ?? ''} buttonType='' />
          )}

          {id && (
            <Button
              onClick={() => {
                formRef.current?.setFieldValue([...name], {});
                validateRefObjectId(formRef, name);
                onData();
              }}
            >
              <FormattedMessage id='pages.button.clear' defaultMessage='Clear' />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.flow.view.flowProperties.type' defaultMessage='Type' />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.flow.view.flowProperties.uri' defaultMessage='URI' />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={
          <FormattedMessage id='pages.flow.view.flowProperties.version' defaultMessage='Version' />
        }
        name={[...name, '@version']}
      >
        <Input disabled={true} />
      </Form.Item>
      <Divider orientationMargin='0' orientation='left' plain>
        <FormattedMessage
          id='pages.flow.view.flowProperties.shortDescription'
          defaultMessage='Short description'
        />
      </Divider>
      {/* <LangTextItemForm
        name={[...name, 'common:shortDescription']}
        label="Short Description"
      /> */}
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

      <UnitGroupFromMini
        id={id}
        version={version}
        idType={'flowproperty'}
        name={name}
        formRef={formRef}
        drawerVisible={drawerVisible}
        key={UnitGroupFromMiniKey}
      />
    </Card>
  );
};

export default FlowpropertiesSelectForm;
