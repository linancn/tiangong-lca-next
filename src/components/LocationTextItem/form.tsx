import { getILCDLocationAll } from '@/services/locations/api';
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

  const handleLChange = async () => {
    onData();
  };

  useEffect(() => {
    let active = true;

    setLocationData([]);
    getILCDLocationAll(lang)
      .then((res) => {
        if (!active || !res.success) {
          return;
        }
        const data: any = res.data?.[0]?.location ?? [];
        setLocationData(
          data.map((l: any) => {
            if (l?.['@value'] === 'NULL') {
              return { label: '', value: 'NULL' };
            }
            return {
              label: l?.['@value'] + ' (' + l?.['#text'] + ')',
              value: l?.['@value'],
            };
          }),
        );
      })
      .catch(() => {
        if (active) {
          setLocationData([]);
        }
      });

    return () => {
      active = false;
    };
  }, [lang]);

  return (
    <Space orientation='vertical' style={{ width: '100%' }}>
      <Form.Item
        required={false}
        label={showRequiredLable ? <RequiredMark label={label} showError={false} /> : label}
        name={name}
        rules={rules}
      >
        <Select
          classNames={{
            root: 'tg-location-reference-select',
            popup: {
              root: 'tg-location-reference-popup',
              listItem: 'tg-location-reference-option',
            },
          }}
          showSearch={{
            filterOption: (input: string, option: any) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
          }}
          // defaultValue={null} defaultValue报错
          onChange={handleLChange}
          options={locationData}
        />
      </Form.Item>
    </Space>
  );
};

export default LocationTextItemForm;
