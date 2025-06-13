import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import UnitGroupFromMini from '@/pages/Unitgroups/Components/select/formMini';
import { getLocalValueProps, validateRefObjectId } from '@/pages/Utils';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { getRefData } from '@/services/general/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowsEdit from '../edit';
import FlowsView from '../view';
import FlowsSelectDrawer from './drawer';
const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  drawerVisible: boolean;
  asInput?: boolean;
  onData: () => void;
  rules?: any[];
};

const FlowsSelectForm: FC<Props> = ({
  name,
  label,
  lang,
  formRef,
  drawerVisible,
  asInput,
  onData,
  rules = [],
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const [refData, setRefData] = useState<any>(null);
  const [errRef, setErrRef] = useState<RefCheckType | null>(null);
  const refCheckContext = useRefCheckContext();

  useEffect(() => {
    if (id && version) {
      getRefData(id, version, 'flows', '').then((result: any) => {
        setRefData({ ...result.data });
      });
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
    }
  }, [id, version, refCheckContext]);

  const handletFlowsData = (rowId: string, rowVersion: string) => {
    getFlowDetail(rowId, rowVersion).then(async (result: any) => {
      const selectedData = genFlowFromData(result.data?.json?.flowDataSet ?? {});
      await formRef.current?.setFieldValue(name, {
        '@refObjectId': rowId,
        '@type': 'flow data set',
        '@uri': `../flows/${rowId}.xml`,
        '@version': result.data?.version ?? '',
        'common:shortDescription': genFlowNameJson(
          selectedData?.flowInformation?.dataSetInformation?.name,
        ),
      });
      setId(rowId);
      setVersion(result.data?.version);
      validateRefObjectId(formRef, name);
      onData();
    });
  };

  useEffect(() => {
    setId(undefined);
    if (drawerVisible) {
      if (formRef.current?.getFieldValue([...name, '@refObjectId'])) {
        setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
        setVersion(formRef.current?.getFieldValue([...name, '@version']));
      }
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
              id='pages.process.view.exchange.refObjectId'
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
            <FlowsSelectDrawer
              buttonType='text'
              lang={lang}
              asInput={asInput}
              onData={handletFlowsData}
            />
          )}
          {id && (
            <FlowsSelectDrawer
              buttonType='text'
              buttonText={<FormattedMessage id='pages.button.reselect' defaultMessage='Reselect' />}
              lang={lang}
              asInput={asInput}
              onData={handletFlowsData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletFlowsData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update reference'
              />
            </Button>
          )}
          {id && <FlowsView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && refData?.userId === sessionStorage.getItem('userId') && (
            <FlowsEdit lang={lang} id={id} version={version ?? ''} buttonType='' />
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
        label={<FormattedMessage id='pages.process.view.exchange.type' defaultMessage='Type' />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.process.view.exchange.uri' defaultMessage='URI' />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={
          <FormattedMessage id='pages.process.veiw.exchange.version' defaultMessage='Version' />
        }
        name={[...name, '@version']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Divider orientationMargin='0' orientation='left' plain>
        <FormattedMessage
          id='pages.process.view.exchange.shortDescription'
          defaultMessage='Short description'
        />
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

      <UnitGroupFromMini
        id={id}
        version={version}
        idType={'flow'}
        name={name}
        formRef={formRef}
        drawerVisible={drawerVisible}
      />
    </Card>
  );
};

export default FlowsSelectForm;
