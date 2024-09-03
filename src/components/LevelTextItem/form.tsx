import { getILCDClassificationZH, getILCDFlowCategorizationZH } from '@/services/ilcd/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Form, Input, Select, Space } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  name: any;
  dataType: string;
  flowType?: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const LevelTextItemForm: FC<Props> = ({ name, dataType, flowType, formRef, onData }) => {
  const [categoryData0, setCategoryData0] = useState<any>([]);
  const [categoryData1, setCategoryData1] = useState<any>([]);
  const [categoryData2, setCategoryData2] = useState<any>([]);
  const [l0, setL0] = useState<any>([]);
  const [l1, setL1] = useState<any>([]);
  const [l2, setL2] = useState<any>([]);

  const handleL0Change = async (value: string) => {
    const filteredData0 = categoryData0.find((l: any) => l?.['@name'] === value);
    formRef.current?.setFieldValue([...name, '@catId_0'], filteredData0?.['@id'] ?? null);
    setCategoryData1(filteredData0?.category);
    setCategoryData2([]);
    setL1(
      filteredData0?.category?.map((l: any) => ({
        id: l?.['@id'],
        label: (
          <Space size={'large'}>
            <Space>en:{l?.['@name'] ?? '-'}</Space>
            <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
          </Space>
        ),
        value: l?.['@name'],
      })) ?? [],
    );
    setL2([]);
    await formRef.current?.setFieldValue([...name, '@level_1'], null);
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    await formRef.current?.setFieldValue([...name, '@catId_1'], null);
    await formRef.current?.setFieldValue([...name, '@catId_2'], null);
    onData();
  };

  const handleL1Change = async (value: string) => {
    const filteredData1 = categoryData1.find((l: any) => l?.['@name'] === value);
    formRef.current?.setFieldValue([...name, '@catId_1'], filteredData1?.['@id'] ?? null);
    setCategoryData2(filteredData1?.category);
    setL2(
      filteredData1?.category?.map((l: any) => ({
        id: l?.['@id'],
        label: (
          <Space size={'large'}>
            <Space>en:{l?.['@name'] ?? '-'}</Space>
            <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
          </Space>
        ),
        value: l?.['@name'],
      })) ?? [],
    );
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    await formRef.current?.setFieldValue([...name, '@catId_2'], null);
    onData();
  };

  const handleL2Change = async (value: string) => {
    const filteredData2 = categoryData2.find((l: any) => l?.['@name'] === value);
    await formRef.current?.setFieldValue([...name, '@catId_2'], filteredData2?.['@id'] ?? null);
    onData();
  };

  useEffect(() => {
    const fetchClassification = async (dt: string, ft: string | undefined) => {
      let result: any = {};
      if (dt === 'Flow' && ft && ft === 'Elementary flow') {
        result = await getILCDFlowCategorizationZH();
      } else {
        result = await getILCDClassificationZH(dt);
      }
      setCategoryData0(result?.data?.category);
      const category0 =
        result.data?.category?.map((l: any) => ({
          id: l?.['@id'],
          label: (
            <Space size={'large'}>
              <Space>en:{l?.['@name'] ?? '-'}</Space>
              <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
            </Space>
          ),
          value: l?.['@name'],
          children: l.category ?? [],
        })) ?? [];
      setL0(category0);

      const filteredData1 = category0?.find(
        (l: any) => l?.value === formRef.current?.getFieldValue([...name, '@level_0']),
      );
      formRef.current?.setFieldValue([...name, '@catId_0'], filteredData1?.id ?? null);
      setCategoryData1(filteredData1?.children);
      const category1 =
        filteredData1?.children?.map((l: any) => ({
          id: l?.['@id'],
          label: (
            <Space size={'large'}>
              <Space>en:{l?.['@name'] ?? '-'}</Space>
              <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
            </Space>
          ),
          value: l['@name'],
          children: l.category ?? [],
        })) ?? [];
      setL1(category1);

      const filteredData2 = category1.find(
        (l: any) => l.value === formRef.current?.getFieldValue([...name, '@level_1']),
      );
      formRef.current?.setFieldValue([...name, '@catId_1'], filteredData2?.id ?? null);
      setCategoryData2(filteredData2?.children);
      const category2 =
        filteredData2?.children?.map((l: any) => ({
          id: l?.['@id'],
          label: (
            <Space size={'large'}>
              <Space>en:{l?.['@name'] ?? '-'}</Space>
              <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
            </Space>
          ),
          value: l['@name'],
          children: l.category ?? [],
        })) ?? [];
      setL2(category2);

      const filteredData3 = category2.find(
        (l: any) => l.value === formRef.current?.getFieldValue([...name, '@level_2']),
      );
      formRef.current?.setFieldValue([...name, '@catId_2'], filteredData3?.id ?? null);
      onData();
    };

    fetchClassification(dataType, flowType);
  }, [dataType, flowType]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level1" defaultMessage="Level 1" />}
        name={[...name, '@level_0']}
      >
        <Select defaultValue={null} onChange={handleL0Change} options={l0} />
      </Form.Item>
      <Form.Item name={[...name, '@catId_0']} hidden>
        <Input />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level2" defaultMessage="Level 2" />}
        name={[...name, '@level_1']}
      >
        <Select defaultValue={null} onChange={handleL1Change} options={l1} />
      </Form.Item>
      <Form.Item name={[...name, '@catId_1']} hidden>
        <Input />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level3" defaultMessage="Level 3" />}
        name={[...name, '@level_2']}
      >
        <Select defaultValue={null} onChange={handleL2Change} options={l2} />
      </Form.Item>
      <Form.Item name={[...name, '@catId_2']} hidden>
        <Input />
      </Form.Item>
    </Space>
  );
};

export default LevelTextItemForm;
