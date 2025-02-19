import UnitGroupFromMini from '@/pages/Unitgroups/Components/select/formMini';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Col, Divider, Form, Input, Row, Space, theme } from 'antd';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
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
};

const FlowpropertiesSelectForm: FC<Props> = ({
  name,
  label,
  lang,
  formRef,
  drawerVisible,
  onData,
}) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<string | undefined>(undefined);
  const { token } = theme.useToken();

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
      onData();
    });
  };

  useEffect(() => {
    if (formRef.current?.getFieldValue(name)) {
      setId(formRef.current?.getFieldValue([...name, '@refObjectId']));
      setVersion(formRef.current?.getFieldValue([...name, '@version']));
    }
  });

  return (
    <Card size="small" title={label}>
      <Space direction="horizontal">
        <Form.Item
          label={
            <FormattedMessage
              id="pages.flow.view.flowProperties.refObjectId"
              defaultMessage="Ref object id"
            />
          }
          name={[...name, '@refObjectId']}
        >
          <Input disabled={true} style={{ width: '350px', color: token.colorTextDescription }} />
        </Form.Item>
        <Space direction="horizontal" style={{ marginTop: '6px' }}>
          {!id&&<FlowpropertiesSelectDrawer
            buttonType="text"
            lang={lang}
            onData={handletFlowpropertyData}
          />}
          {id&&<FlowpropertiesSelectDrawer
            buttonType="text"
            buttonText={<FormattedMessage id="pages.button.reselect" defaultMessage="Reselect" />}
            lang={lang}
            onData={handletFlowpropertyData}
          />}
            {id && (
            <Button
              onClick={() => {
                handletFlowpropertyData(id, version ?? '');
              }}
            >
              <FormattedMessage
                id="pages.button.updateReference"
                defaultMessage="Update reference"
              />
            </Button>
          )}
          {id && <FlowpropertyView lang={lang} id={id} version={version ?? ''} buttonType="text" />}
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
        label={<FormattedMessage id="pages.flow.view.flowProperties.type" defaultMessage="Type" />}
        name={[...name, '@type']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.flow.view.flowProperties.uri" defaultMessage="URI" />}
        name={[...name, '@uri']}
      >
        <Input disabled={true} style={{ color: token.colorTextDescription }} />
      </Form.Item>
      <Form.Item label="Version" name={[...name, '@version']}>
        <Input disabled={true} />
      </Form.Item>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage
          id="pages.flow.view.flowProperties.shortDescription"
          defaultMessage="Short description"
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

      <UnitGroupFromMini
        id={id}
        version={version}
        idType={'flowproperty'}
        name={name}
        formRef={formRef}
        drawerVisible={drawerVisible}
      />
    </Card>
  );
};

export default FlowpropertiesSelectForm;
