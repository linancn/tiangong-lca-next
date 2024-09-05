import { getILCDLocationAll } from '@/services/ilcd/api';
import { Form, Select, Space } from 'antd';
import { FC, useEffect, useState } from 'react';
type Props = {
  name: any;
  label: any;
  lang: string;
  onData: () => void;
};

const LocationTextItemForm: FC<Props> = ({ name, label, lang, onData }) => {
  const [locationData, setLocationData] = useState<any>([]);

  const handleLChange = async () => {
    onData();
  };

  useEffect(() => {
    getILCDLocationAll(lang).then((res) => {
      if (res.success) {
        const data: any = res.data?.[0]?.location ?? [];
        setLocationData(
          data?.map((l: any) => ({
            label: l?.['@value'] + ' (' + l?.['#text'] + ')',
            value: l?.['@value'],
          })) ?? [],
        );
      }
    });
  }, []);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label={label} name={name}>
        <Select
          showSearch
          defaultValue={null}
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