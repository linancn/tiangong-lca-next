import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { useUpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { getLocalValueProps } from '@/pages/Utils';
import { jsonToList } from '@/services/general/util';
import { getReferenceUnit, getUnitGroupDetail } from '@/services/unitgroups/api';
import { genUnitGroupFromData } from '@/services/unitgroups/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitgroupsView from '../view';
import UnitgroupsSelectDrawer from './drawer';
// import LangTextItemForm from '@/components/LangTextItem/form';
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
  const { token } = theme.useToken();
  const { referenceValue } = useUpdateReferenceContext() as { referenceValue: number };
  const [ruleErrorState, setRuleErrorState] = useState(false);
  const handletUnitgroupsData = (rowId: string, rowVersion: string) => {
    getUnitGroupDetail(rowId, rowVersion).then(async (result: any) => {
      const selectedData = genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {});

      const unitList = jsonToList(selectedData?.units.unit);
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
          name: refUnit?.name ?? '',
          generalComment: refUnit?.generalComment ?? [],
        },
      });
      setId(rowId);
      setVersion(result.data?.version);
      onData();
    });
  };
  useEffect(() => {
    if (id) {
      handletUnitgroupsData(id, version ?? '');
    }
  }, [referenceValue]);
  useEffect(() => {
    setId(undefined);
    if (formRef.current?.getFieldValue([...name, '@refObjectId'])) {
      setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...name, '@version']));
      getReferenceUnit(
        formRef.current?.getFieldValue([...name, '@refObjectId']),
        formRef.current?.getFieldValue([...name, '@version']),
      ).then((res: any) => {
        formRef.current?.setFieldValue([...name, 'refUnit'], {
          name: res.data?.refUnitName ?? '',
          generalComment: res.data?.refUnitGeneralComment ?? [],
        });
      });
    }
  });
  const requiredRules = rules.filter((rule: any) => rule.required);
  const isRequired = requiredRules && requiredRules.length;
  const notRequiredRules = rules.filter((rule: any) => !rule.required) ?? [];
  return (
    <Card
      size="small"
      title={
        isRequired ? (
          <RequiredSelectFormTitle
            label={label}
            ruleErrorState={ruleErrorState}
            requiredRules={requiredRules}
          />
        ) : (
          label
        )
      }
    >
      <Space direction="horizontal">
        <Form.Item
          label={
            <FormattedMessage id="pages.unitgroup.refObjectId" defaultMessage="Ref object id" />
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
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          {!id && (
            <UnitgroupsSelectDrawer buttonType="text" lang={lang} onData={handletUnitgroupsData} />
          )}

          {id && (
            <UnitgroupsSelectDrawer
              buttonType="text"
              buttonText={<FormattedMessage id="pages.button.reselect" defaultMessage="Reselect" />}
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
                id="pages.button.updateReference"
                defaultMessage="Update reference"
              />
            </Button>
          )}
          {id && <UnitgroupsView lang={lang} id={id} version={version ?? ''} buttonType="text" />}
          {id && (
            <Button
              onClick={() => {
                formRef.current?.setFieldValue([...name], {});
                onData();
              }}
            >
              <FormattedMessage id="pages.button.clear" defaultMessage="Clear" />
            </Button>
          )}
        </Space>
      </Space>
      <Form.Item
        hidden
        label={<FormattedMessage id="pages.FlowProperties.view.type" defaultMessage="Type" />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        hidden
        label={<FormattedMessage id="pages.FlowProperties.view.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>

      <Form.Item
        label={<FormattedMessage id="pages.contact.version" defaultMessage="Version" />}
        name={[...name, '@version']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>

      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage
          id="pages.FlowProperties.view.shortDescription"
          defaultMessage="Short description"
        />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="100px" style={{ marginRight: '10px' }}>
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
                  <Col flex="auto" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea
                        placeholder="text"
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
        size="small"
        title={
          <FormattedMessage
            id="pages.unitgroup.unit.quantitativeReference"
            defaultMessage="Quantitative reference"
          />
        }
      >
        <Form.Item
          label={<FormattedMessage id="pages.unitgroup.edit.name" defaultMessage="Name of unit" />}
          name={[...name, 'refUnit', 'name']}
        >
          <Input disabled={true} style={{ color: token.colorTextDescription }} />
        </Form.Item>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage id="pages.unitgroup.edit.generalComment" defaultMessage="Comment" />
        </Divider>
        <Form.Item>
          <Form.List name={[...name, 'refUnit', 'generalComment']}>
            {(subFields) => (
              <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                {subFields.map((subField) => (
                  <Row key={subField.key}>
                    <Col flex="100px" style={{ marginRight: '10px' }}>
                      <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                        <Input
                          disabled={true}
                          style={{ width: '100px', color: token.colorTextDescription }}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex="auto" style={{ marginRight: '10px' }}>
                      <Form.Item noStyle name={[subField.name, '#text']}>
                        <TextArea
                          placeholder="text"
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
