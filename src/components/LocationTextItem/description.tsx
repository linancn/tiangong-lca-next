import { getILCDLocationByValue } from '@/services/ilcd/api';
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
    if (data) {
      setSpinning(true);
      getILCDLocationByValue(lang, data).then((res) => {
        setDataDes(res.data);
        setSpinning(false);
      });
    }
  }, [data]);

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
