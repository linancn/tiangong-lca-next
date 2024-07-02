import { getUnitGroupDetail } from '@/services/unitgroups/api';
import { langOptions } from '@/services/general/data';
import { ActionType, ProFormInstance } from '@ant-design/pro-components';
import {
  Card,
  Col,
  Divider,
  Form, Input,
  Row,
  Select,
  Space,
  Button
} from 'antd';
import React, { FC } from 'react';
import UnitgroupsSelectDrawer from './drawer';
import UnitgroupsView from '../view';
// import LangTextItemFrom from '@/components/LangTextItem/from';
const { TextArea } = Input;

type Props = {
  name: any;
  label: string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData?: (key: any, data: any) => void
};

const UnitgroupsSelectFrom: FC<Props> = ({ name, label, lang, formRef, onData }) => {
  const handleResetData = (data: any) => {
    formRef.current?.setFieldValue(name, data);
    if (onData) {
      onData(name, data)
    }
  }
  const handletUnitgroupsData = (rowKey: any) => {
    getUnitGroupDetail(rowKey).then(async (result: any) => {
      let data = {
        '@refObjectId': `${rowKey}`,
        '@type': 'unit group data set',
        '@uri': `../unitgroups/${rowKey}.xml`,
        'common:shortDescription': [],
      }
      handleResetData(data)
    });
  };
  const actionRef = React.useRef<ActionType | undefined>(undefined);
  const id = formRef.current?.getFieldValue([...name, '@refObjectId']);
  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item label="Ref Object Id" name={[...name, '@refObjectId']}>
          <Input disabled={true} style={{ width: '300px' }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          <UnitgroupsSelectDrawer buttonType="text" lang={lang} onData={handletUnitgroupsData} />
          {id && <UnitgroupsView lang={lang} id={id} dataSource="tg" buttonType="text" actionRef={actionRef} />}
          {id && (
            <Button onClick={() => handleResetData({})}>Clear</Button>
          )}
        </Space>

      </Space>
      <Form.Item label="Type" name={[...name, '@type']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="URI" name={[...name, '@uri']}>
        <Input disabled={true} />
      </Form.Item>
      {/* <Form.Item label="Version" name={[...name, '@version']}>
        <Input disabled={true} />
      </Form.Item> */}
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      {/* <LangTextItemFrom
        name={[...name, 'common:shortDescription']}
        label="Short Description"
      /> */}
      <Form.Item>
        <Form.List name={[...name, 'common:shortDescription']}>
          {(subFields) => (
            <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
              {subFields.map((subField) => (
                <Row key={subField.key}>
                  <Col flex="120px" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                      <Select
                        placeholder="Select a lang"
                        optionFilterProp="lang"
                        options={langOptions}
                        disabled={true}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="auto" style={{ marginRight: '10px' }}>
                    <Form.Item noStyle name={[subField.name, '#text']}>
                      <TextArea placeholder="text" rows={1} disabled={true} />
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

export default UnitgroupsSelectFrom;
