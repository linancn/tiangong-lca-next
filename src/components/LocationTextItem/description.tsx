import { getILCDLocationByValue } from '@/services/locations/api';
import { Descriptions, Spin } from 'antd';
import { CSSProperties, FC, ReactNode, useEffect, useState } from 'react';
type Props = {
  lang: any;
  data: any;
  label: ReactNode | string;
  styles?: {
    label?: CSSProperties;
  };
};

const LocationTextItemDescription: FC<Props> = ({ lang, data, label, styles }) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const [dataDes, setDataDes] = useState<string>('');
  useEffect(() => {
    let active = true;

    if (!data) {
      setDataDes('');
      setSpinning(false);
      return () => {
        active = false;
      };
    }

    setDataDes('');
    setSpinning(true);
    getILCDLocationByValue(lang, data)
      .then((res) => {
        if (active) {
          setDataDes(res.data);
        }
      })
      .catch(() => {
        if (active) {
          setDataDes('');
        }
      })
      .finally(() => {
        if (active) {
          setSpinning(false);
        }
      });

    return () => {
      active = false;
    };
  }, [data, lang]);

  return (
    <Spin spinning={spinning}>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={label} styles={styles}>
          {dataDes}
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  );
};

export default LocationTextItemDescription;
