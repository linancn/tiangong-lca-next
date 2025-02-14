import { getReferenceUnitGroup } from '@/services/flowproperties/api';
import { getReferenceProperty } from '@/services/flows/api';
import { jsonToList } from '@/services/general/util';
import { getReferenceUnit } from '@/services/unitgroups/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Col, Divider, Form, Input, Row, Spin, theme } from 'antd';
import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
// import LangTextItemForm from '@/components/LangTextItem/form';
const { TextArea } = Input;

type Props = {
  id: string | undefined;
  version: string | undefined;
  idType: string;
  name: any;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  drawerVisible: boolean;
};

const UnitGroupFromMini: FC<Props> = ({ id, version, idType, name, formRef, drawerVisible }) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const { token } = theme.useToken();

  useEffect(() => {
    if (id && drawerVisible) {
      if (idType === 'flow') {
        setSpinning(true);
        getReferenceProperty(id, version ?? '').then((res1: any) => {
          getReferenceUnitGroup(res1?.data?.refFlowPropertytId, res1?.data?.version).then(
            (res2: any) => {
              getReferenceUnit(res2?.data?.refUnitGroupId, res2?.data?.version).then(
                (res3: any) => {
                  formRef.current?.setFieldValue([...name, 'refUnitGroup'], {
                    shortDescription: jsonToList(res3?.data?.refUnitGroupShortDescription),
                    refUnit: {
                      name: res3?.data?.refUnitName ?? '',
                      generalComment: jsonToList(res3?.data?.refUnitGeneralComment),
                    },
                  });
                  setSpinning(false);
                },
              );
            },
          );
        });
      } else if (idType === 'flowproperty') {
        setSpinning(true);
        getReferenceUnitGroup(id, version ?? '').then((res1: any) => {
          getReferenceUnit(res1?.data?.refUnitGroupId, res1.data?.version).then((res2: any) => {
            formRef.current?.setFieldValue([...name, 'refUnitGroup'], {
              shortDescription: jsonToList(res2.data?.refUnitGroupShortDescription),
              refUnit: {
                name: res2.data?.refUnitName ?? '',
                generalComment: jsonToList(res2.data?.refUnitGeneralComment),
              },
            });
            setSpinning(false);
          });
        });
      }
    }
  }, [id, drawerVisible]);

  return (
    <Spin spinning={spinning}>
      <Card
        size="small"
        title={
          <FormattedMessage
            id="pages.flowproperty.referenceToReferenceUnitGroup"
            defaultMessage="Reference unit"
          />
        }
      >
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage id="pages.unitgroup.edit.generalComment" defaultMessage="Comment" />
        </Divider>
        <Form.Item>
          <Form.List name={[...name, 'refUnitGroup', 'shortDescription']}>
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
            label={
              <FormattedMessage id="pages.unitgroup.edit.name" defaultMessage="Name of unit" />
            }
            name={[...name, 'refUnitGroup', 'refUnit', 'name']}
          >
            <Input disabled={true} style={{ color: token.colorTextDescription }} />
          </Form.Item>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage id="pages.unitgroup.edit.generalComment" defaultMessage="Comment" />
          </Divider>
          <Form.Item>
            <Form.List name={[...name, 'refUnitGroup', 'refUnit', 'generalComment']}>
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
    </Spin>
  );
};

export default UnitGroupFromMini;
