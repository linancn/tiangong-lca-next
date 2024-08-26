import { jsonToList } from '@/services/general/util';
import { getReferenceUnit, getUnitGroupDetail } from '@/services/unitgroups/api';
import { genUnitGroupFromData } from '@/services/unitgroups/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitgroupsView from '../view';
import UnitgroupsSelectDrawer from './drawer';
// import LangTextItemFrom from '@/components/LangTextItem/from';
const { TextArea } = Input;

type Props = {
  name: any;
  label: ReactNode | string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const UnitgroupsSelectFrom: FC<Props> = ({ name, label, lang, formRef, onData }) => {
  const [id, setId] = useState<string | undefined>(undefined);

  const handletUnitgroupsData = (rowKey: any) => {
    getUnitGroupDetail(rowKey).then(async (result: any) => {
      const selectedData = genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {});

      const unitList = jsonToList(selectedData?.units.unit);
      const refUnit = unitList.find(
        (item) =>
          item?.['@dataSetInternalID'] ===
          selectedData?.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit,
      );

      await formRef.current?.setFieldValue(name, {
        '@refObjectId': `${rowKey}`,
        '@type': 'unit group data set',
        '@uri': `../unitgroups/${rowKey}.xml`,
        'common:shortDescription':
          selectedData?.unitGroupInformation?.dataSetInformation?.['common:name'] ?? [],
        refUnit: {
          name: refUnit?.name ?? '',
          generalComment: refUnit?.generalComment ?? [],
        },
      });
      onData();
    });
  };

  useEffect(() => {
    if (formRef.current?.getFieldValue([...name, '@refObjectId'])) {
      setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      getReferenceUnit(formRef.current?.getFieldValue([...name, '@refObjectId'])).then(
        (res: any) => {
          formRef.current?.setFieldValue([...name, 'refUnit'], {
            name: res.data?.refUnitName ?? '',
            generalComment: res.data?.refUnitGeneralComment ?? [],
          });
        },
      );
    }
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.refObjectId"
              defaultMessage="Ref Object Id"
            />
          }
          name={[...name, '@refObjectId']}
        >
          <Input disabled={true} style={{ width: '350px', color: '#000' }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <UnitgroupsSelectDrawer buttonType="text" lang={lang} onData={handletUnitgroupsData} />
          {id && <UnitgroupsView lang={lang} id={id} buttonType="text" />}
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
        label={<FormattedMessage id="pages.FlowProperties.view.type" defaultMessage="Type" />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: '#000' }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.FlowProperties.view.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: '#000' }} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage
          id="pages.FlowProperties.view.shortDescription"
          defaultMessage="Short Description"
        />
      </Divider>
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="100px" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                      <Input disabled={true} style={{ width: '100px', color: '#000' }} />
                    </Form.Item>
                  </Col>
                  <Col flex="auto" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea
                        placeholder="text"
                        rows={1}
                        disabled={true}
                        style={{ color: '#000' }}
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
            defaultMessage="Quantitative Reference"
          />
        }
      >
        <Form.Item
          label={<FormattedMessage id="pages.unitgroup.edit.name" defaultMessage="Name" />}
          name={[...name, 'refUnit', 'name']}
        >
          <Input disabled={true} style={{ color: '#000' }} />
        </Form.Item>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.unitgroup.edit.generalComment"
            defaultMessage="General Comment"
          />
        </Divider>
        <Form.Item>
          <Form.List name={[...name, 'refUnit', 'generalComment']}>
            {(subFields) => (
              <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                {subFields.map((subField) => (
                  <Row key={subField.key}>
                    <Col flex="100px" style={{ marginRight: '10px' }}>
                      <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                        <Input disabled={true} style={{ width: '100px', color: '#000' }} />
                      </Form.Item>
                    </Col>
                    <Col flex="auto" style={{ marginRight: '10px' }}>
                      <Form.Item noStyle name={[subField.name, '#text']}>
                        <TextArea
                          placeholder="text"
                          rows={1}
                          disabled={true}
                          style={{ color: '#000' }}
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
