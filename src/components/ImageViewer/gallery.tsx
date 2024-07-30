import { getImageUrls } from '@/services/general/util';
import { Image, Space, Spin } from 'antd';
import React, { FC } from 'react';

type Props = {
  data: string;
};

const ImageGallery: FC<Props> = ({ data }) => {
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);
  const [spinning, setSpinning] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const urls = await getImageUrls(data);
        await setImageUrls(urls);
        setSpinning(false);
      }
    };
    setSpinning(true);
    fetchData();
  }, [data]);

  if (!data) {
    return <></>;
  }

  return (
    <Spin spinning={spinning}>
      <Space size={[8, 16]} wrap>
        {imageUrls.map((imageUrl, index) => {
          return <Image height={150} key={index} src={imageUrl} />;
        })}
      </Space>
    </Spin>
  );
};

export default ImageGallery;
