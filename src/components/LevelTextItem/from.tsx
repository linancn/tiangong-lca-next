import { getILCDClassificationZH } from '@/services/ilcd/api';
import { ProFormInstance } from '@ant-design/pro-components';
import { Form, Select, Space } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
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
    setL1(
      filteredData[0]?.children?.map((l: any) => ({
        label: (
          <Space size={'large'}>
            <Space>en:{l?.['@name'] ?? '-'}</Space>
            <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
          </Space>
        ),
        value: l['@name'],
        children: l.category ?? [],
      })) ?? [],
    );
    setL2([]);
    await formRef.current?.setFieldValue([...name, '@level_1'], null);
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    onData();
  };

  const handleL1Change = async (value: string) => {
    const filteredData = l1.filter((l: any) => l.value === value);
    setL2(
      filteredData[0]?.children?.map((l: any) => ({
        label: (
          <Space size={'large'}>
            <Space>en:{l?.['@name'] ?? '-'}</Space>
            <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
          </Space>
        ),
        value: l['@name'],
        children: l.category ?? [],
      })) ?? [],
    );
    await formRef.current?.setFieldValue([...name, '@level_2'], null);
    onData();
  };

  useEffect(() => {
    const fetchClassification = async (dt: string) => {
      const result = await getILCDClassificationZH(dt);
      const category0 =
        result.data?.category?.map((l: any) => ({
          label: (
            <Space size={'large'}>
              <Space>en:{l?.['@name'] ?? '-'}</Space>
              <Space>zh:{l?.['@nameZH'] ?? '-'}</Space>
            </Space>
          ),
          value: l['@name'],
          children: l.category ?? [],
        })) ?? [];
      setL0(category0);

      const filteredData1 = category0?.find(
        (l: any) => l.value === formRef.current?.getFieldValue([...name, '@level_0']),
      );

      const category1 =
        filteredData1?.children?.map((l: any) => ({
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

      const category2 =
        filteredData2?.children?.map((l: any) => ({
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
    };

    fetchClassification(dataType);
  }, []);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level1" defaultMessage="Level 1" />}
        name={[...name, '@level_0']}
      >
        <Select defaultValue={null} onChange={handleL0Change} options={l0} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level2" defaultMessage="Level 2" />}
        name={[...name, '@level_1']}
      >
        <Select defaultValue={null} onChange={handleL1Change} options={l1} />
      </Form.Item>
      <Form.Item
        label={<FormattedMessage id="pages.contact.level3" defaultMessage="Level 3" />}
        name={[...name, '@level_2']}
      >
        <Select defaultValue={null} onChange={() => {}} options={l2} />
      </Form.Item>
    </Space>
  );
};

export default LevelTextItemFrom;
