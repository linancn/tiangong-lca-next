import { getILCDLocationAll } from '@/services/ilcd/api';
import { Form, Select, Space } from 'antd';
import { FC, useEffect, useState } from 'react';
import RequiredMark from '../RequiredMark';
type Props = {
  name: any;
  label: any;
  lang: string;
  onData: () => void;
  rules?: any[];
  showRequiredLable?: boolean;
};

const LocationTextItemForm: FC<Props> = ({
  name,
  label,
  lang,
  onData,
  rules,
  showRequiredLable = false,
}) => {
  const [locationData, setLocationData] = useState<any>([]);

  const handleLChange = async (value: any) => {
    console.log(value);
    onData();
  };

  useEffect(() => {
    getILCDLocationAll(lang).then((res) => {
      if (res.success) {
        const data: any = res.data?.[0]?.location ?? [];
        setLocationData(
          data?.map((l: any) => {
            if (l?.['@value'] === 'NULL') {
              return { label: '', value: 'NULL' };
            }
            return {
              label: l?.['@value'] + ' (' + l?.['#text'] + ')',
              value: l?.['@value'],
            };
          }) ?? [],
        );
      }
    });
  }, []);

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <Form.Item
        required={false}
        label={showRequiredLable ? <RequiredMark label={label} showError={false} /> : label}
        name={name}
        rules={rules}
      >
        <Select
          showSearch
          // defaultValue={null} defaultValue报错
          onChange={handleLChange}
          options={locationData}
          filterOption={(input: any, option: any) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>
    </Space>
  );
};

export default LocationTextItemForm;
