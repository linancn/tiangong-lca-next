import { getILCDLocationAll } from '@/services/locations/api';
import { normalizeExchangeLocationCode } from '@/services/processes/exchangeLocation';
import type { SelectProps } from 'antd';
import { Select } from 'antd';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';

type LocationCodeOption = {
  label: string;
  searchText: string;
  value: string;
};

type LocationCodeSelectProps = Omit<SelectProps<string>, 'children' | 'onChange' | 'options'> & {
  lang: string;
  onChange?: (value?: string) => void;
  onData?: () => void;
};

const getLocationCodeOption = (location: Record<string, unknown>): LocationCodeOption | null => {
  const value = normalizeExchangeLocationCode(location['@value']);

  if (!value) {
    return null;
  }

  const text = typeof location['#text'] === 'string' ? location['#text'].trim() : '';
  const label = text ? `${value} (${text})` : value;

  return {
    label,
    searchText: `${value} ${text}`.trim().toLowerCase(),
    value,
  };
};

const LocationCodeSelect: FC<LocationCodeSelectProps> = ({
  lang,
  onChange,
  onData,
  value,
  ...selectProps
}) => {
  const [locationOptions, setLocationOptions] = useState<LocationCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const normalizedValue = normalizeExchangeLocationCode(value);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getILCDLocationAll(lang)
      .then((res) => {
        if (cancelled || !res.success) {
          return;
        }

        const data = res.data?.[0]?.location ?? [];
        const locationList = Array.isArray(data) ? data : [data];
        const nextOptions = locationList
          .map((location: Record<string, unknown>) => getLocationCodeOption(location))
          .filter((option): option is LocationCodeOption => Boolean(option));

        setLocationOptions(nextOptions);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const options = useMemo(() => {
    if (!normalizedValue || locationOptions.some((option) => option.value === normalizedValue)) {
      return locationOptions;
    }

    return [
      {
        label: normalizedValue,
        searchText: normalizedValue.toLowerCase(),
        value: normalizedValue,
      },
      ...locationOptions,
    ];
  }, [locationOptions, normalizedValue]);

  return (
    <Select
      allowClear
      showSearch
      loading={loading}
      optionFilterProp='label'
      optionLabelProp='label'
      {...selectProps}
      value={normalizedValue}
      options={options}
      onChange={(nextValue) => {
        onChange?.(normalizeExchangeLocationCode(nextValue));
        onData?.();
      }}
      filterOption={(input, option) => {
        const searchText = String(option?.searchText ?? option?.label ?? option?.value ?? '');
        return searchText.toLowerCase().includes(input.toLowerCase());
      }}
    />
  );
};

export default LocationCodeSelect;
