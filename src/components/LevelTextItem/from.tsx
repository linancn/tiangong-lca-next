import { getILCDClassification } from '@/services/ilcd/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Form, Select, Space } from 'antd';
import { FC, useEffect, useState } from 'react';

type Props = {
  name: any;
  dataType: string;
  formRef: React.MutableRefObject<ProFormInstance | undefined>;
  onData: () => void;
};

const LevelTextItemFrom: FC<Props> = ({ name, dataType, formRef, onData }) => {
  const [l0, setL0] = useState<any>([]);
  const [l1, setL1] = useState<any>([]);
  const [l2, setL2] = useState<any>([]);

  const handleL0Change = async (value: string) => {
    const filteredData = l0.filter((l: any) => l.value === value);
    setL1(filteredData[0]?.children?.map((l: any) => ({ label: l['@name'], value: l['@name'], children: l.category ?? [] })) ?? []);
    setL2([]);
    await formRef.current?.setFieldValue([...name, '@level_1'], null);
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    onData();
  };

  const handleL1Change = async (value: string) => {
    const filteredData = l1.filter((l: any) => l.value === value);
    setL2(filteredData[0]?.children?.map((l: any) => ({ label: l['@name'], value: l['@name'], children: l.category ?? [] })) ?? []);
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    onData();
  };

  useEffect(() => {
    const fetchClassification = async (dt: string) => {
      const result = await getILCDClassification(dt);
      setL0(result.data?.category?.map((l: any) => ({ label: l['@name'], value: l['@name'], children: l.category ?? [] })) ?? []);
      setL1([]);
      setL2([]);
    };

    fetchClassification(dataType);
  }, []);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label='Level 1' name={[...name, '@level_0']}>
        <Select
          defaultValue={null}
          onChange={handleL0Change}
          options={l0}
        />
      </Form.Item>
      <Form.Item label='Level 2' name={[...name, '@level_1']}>
        <Select
          defaultValue={null}
          onChange={handleL1Change}
          options={l1}
        />
      </Form.Item>
      <Form.Item label='Level 3' name={[...name, '@level_2']}>
        <Select
          defaultValue={null}
          onChange={() => { }}
          options={l2}
        />
      </Form.Item>
    </Space>
  );
};

export default LevelTextItemFrom;
