import { getFileUrls } from '@/services/general/util';
import { Image, Space, Spin } from 'antd';
import React, { FC } from 'react';

type Props = {
  data: string;
};

const ImageGallery: FC<Props> = ({ data }) => {
  const [imageUrls, setImageUrls] = React.useState<any[]>([]);
  const [spinning, setSpinning] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const urls = await getFileUrls(data);
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
          if (imageUrl.url) {
            return <Image height={150} key={index} src={imageUrl.url} />;
          } else {
            return <Image width={150} height={150} key={index} src={imageUrl.url ?? 'error'} />;
          }
        })}
      </Space>
    </Spin>
  );
};

export default ImageGallery;
