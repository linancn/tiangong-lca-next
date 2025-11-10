import { toSuperscript } from '@/components/AlignedNumber';
import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import { getLocalValueProps, validateRefObjectId } from '@/pages/Utils';
import { getRefData } from '@/services/general/api';
import { jsonToList } from '@/services/general/util';
import { getReferenceUnit, getUnitGroupDetail } from '@/services/unitgroups/api';
import { genUnitGroupFromData } from '@/services/unitgroups/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, useModel } from 'umi';
import UnitgroupsEdit from '../edit';
import UnitgroupsView from '../view';
import UnitgroupsSelectDrawer from './drawer';

const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
  rules?: any[];
};

const UnitgroupsSelectFrom: FC<Props> = ({ name, label, lang, formRef, onData, rules = [] }) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [dataUserId, setDataUserId] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const [refData, setRefData] = useState<any>(null);
  const [errRef, setErrRef] = useState<RefCheckType | null>(null);
  const refCheckContext = useRefCheckContext();
  const { initialState } = useModel('@@initialState');
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
      getRefData(id, version, 'unitgroups', '').then((result: any) => {
        setRefData({ ...result.data });
        setDataUserId(result?.data?.userId);
        updateErrRefByDetail(result?.data);
      });
    }
  }, [id, version]);

  useEffect(() => {
    if (refCheckContext?.refCheckData?.length) {
      const ref = refCheckContext?.refCheckData?.find(
        (item: any) =>
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

  const handletUnitgroupsData = (rowId: string, rowVersion: string) => {
    getUnitGroupDetail(rowId, rowVersion).then(async (result: any) => {
      setDataUserId(result?.data?.userId);
      updateErrRefByDetail(result?.data);
      const selectedData = genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {});

      const unitList = jsonToList(selectedData?.units?.unit);
      const refUnit = unitList.find(
        (item) =>
          item?.['@dataSetInternalID'] ===
          selectedData?.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit,
      );

      await formRef.current?.setFieldValue(name, {
        '@refObjectId': rowId,
        '@type': 'unit group data set',
        '@uri': `../unitgroups/${rowId}.xml`,
        '@version': result.data?.version,
        'common:shortDescription':
          selectedData?.unitGroupInformation?.dataSetInformation?.['common:name'] ?? [],
        refUnit: {
          name: toSuperscript(refUnit?.name ?? ''),
          generalComment: refUnit?.generalComment ?? [],
        },
      });
      setId(rowId);
      setVersion(result.data?.version);
      onData();
      validateRefObjectId(formRef, name);
    });
  };

  useEffect(() => {
    // setId(undefined);
    const refObjectId = formRef.current?.getFieldValue([...name, '@refObjectId']);
    if (refObjectId && refObjectId !== id) {
      setId(refObjectId);
      setVersion(formRef.current?.getFieldValue([...name, '@version']));
      getReferenceUnit(
        formRef.current?.getFieldValue([...name, '@refObjectId']),
        formRef.current?.getFieldValue([...name, '@version']),
      ).then((res: any) => {
        formRef.current?.setFieldValue([...name, 'refUnit'], {
          name: toSuperscript(res?.data?.refUnitName ?? ''),
          generalComment: res?.data?.refUnitGeneralComment ?? [],
        });
      });
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
            <FormattedMessage id='pages.unitgroup.refObjectId' defaultMessage='Ref object id' />
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
            <UnitgroupsSelectDrawer buttonType='text' lang={lang} onData={handletUnitgroupsData} />
          )}

          {id && (
            <UnitgroupsSelectDrawer
              buttonType='text'
              buttonText={<FormattedMessage id='pages.button.reselect' defaultMessage='Reselect' />}
              lang={lang}
              onData={handletUnitgroupsData}
            />
          )}
          {id && (
            <Button
              onClick={() => {
                handletUnitgroupsData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update Reference'
              />
            </Button>
          )}
          {id && <UnitgroupsView lang={lang} id={id} version={version ?? ''} buttonType='text' />}
          {id && dataUserId === initialState?.currentUser?.userid && (
            <UnitgroupsEdit
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
                onData();
                validateRefObjectId(formRef, name);
              }}
            >
              <FormattedMessage id='pages.button.clear' defaultMessage='Clear' />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.FlowProperties.view.type' defaultMessage='Type' />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden
        label={<FormattedMessage id='pages.FlowProperties.view.uri' defaultMessage='URI' />}
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
        <FormattedMessage
          id='pages.FlowProperties.view.shortDescription'
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
      <Card
        size='small'
        title={
          <FormattedMessage
            id='pages.unitgroup.unit.quantitativeReference'
            defaultMessage='Quantitative reference'
          />
        }
      >
        <Form.Item
          label={<FormattedMessage id='pages.unitgroup.edit.name' defaultMessage='Name of unit' />}
          name={[...name, 'refUnit', 'name']}
        >
          <Input disabled={true} style={{ color: token.colorTextDescription }} />
        </Form.Item>
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.unitgroup.edit.generalComment' defaultMessage='Comment' />
        </Divider>
        <Form.Item>
          <Form.List name={[...name, 'refUnit', 'generalComment']}>
            {(subFields) => (
              <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                {subFields.map((subField) => (
                  <Row key={subField.key}>
                    <Col flex='100px' style={{ marginRight: '10px' }}>
                      <Form.Item noStyle name={[subField.name, '@xml:lang']}>
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
    </Card>
  );
};

export default UnitgroupsSelectFrom;
