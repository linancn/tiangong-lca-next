import { getFlowsDetail } from '@/services/flows/api';
// import { langOptions } from '@/services/general/data';
import { ProFormInstance } from '@ant-design/pro-components';
import {
  Card,
  // Col,
  Divider,
  Form, Input,
  // Row,
  // Select,
  Space
} from 'antd';
import { FC } from 'react';
import FlowsSelectDrawer from './drawer';
import LangTextItemFrom from '@/components/LangTextItem/from';
// const { TextArea } = Input;

type Props = {
  name: any;
  label: string;
  lang: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  // onData: (key: any, data: any) => void
};

const FlowsSelectFrom: FC<Props> = ({ name, label, lang, formRef }) => {


  const handletFlowsData = (rowKey: any) => {
    getFlowsDetail(rowKey).then(async (result: any) => {
      let data = {
        '@refObjectId': `${rowKey}`,
        '@type': 'flows data set',
        '@uri': `../flows/${rowKey}.xml`,
        // 'common:shortDescription': getShortDescription(
        //   result.data.json?.flowPropertyDataSet?.flowPropertiesInformation?.dataSetInformation,
        // ),
        'common:shortDescription': [],
        // '@version':
        //   result.data.json?.flowPropertyDataSet?.administrativeInformation?.publicationAndOwnership?.[
        //   'common:dataSetVersion'
        //   ],
      }
      formRef.current?.setFieldValue(name, data);
      // let formData = formRef.current?.getFieldsValue();
      // onData({}, formData)
    });
  };

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item label="Ref Object Id" name={[...name, '@refObjectId']}>
          <Input disabled={true} style={{ width: '300px' }} />
        </Form.Item>
        <FlowsSelectDrawer buttonType="text" lang={lang} onData={handletFlowsData} />
      </Space>
      <Form.Item label="Type" name={[...name, '@type']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="URI" name={[...name, '@uri']}>
        <Input disabled={true} />
      </Form.Item>
      <Form.Item label="Version" name={[...name, '@version']}>
        <Input disabled={true} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      <LangTextItemFrom
        name={[...name, 'common:shortDescription']}
        label="Short Description"
      />
      {/* <Form.Item>
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
            </div>
          )}
        </Form.List>
      </Form.Item> */}
    </Card>
  );
};

export default FlowsSelectFrom;
