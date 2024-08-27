import { getFileUrls, isImage } from '@/services/supabase/storage';
import { Image, Space, Spin } from 'antd';
import React, { FC } from 'react';

type Props = {
  data: any;
};

const FileGallery: FC<Props> = ({ data }) => {
  const [fileUrls, setFileUrls] = React.useState<any[]>([]);
  const [spinning, setSpinning] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const urls = await getFileUrls(data);
        await setFileUrls(urls);
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
        {fileUrls.map((fileUrl, index) => {
          if (fileUrl.url) {
            if (isImage(fileUrl)) {
              return (
                <Image
                  height={150}
                  key={index}
                  src={fileUrl.thumbUrl}
                  preview={{
                    src: fileUrl.url,
                  }}
                />
              );
            } else {
              return (
                <a key={index} href={fileUrl.url} target="blank">
                  <img height={150} src={fileUrl.thumbUrl}></img>
                </a>
              );
            }
          } else {
            return <Image width={150} height={150} key={index} src={'error'} />;
          }
        })}
      </Space>
    </Spin>
  );
};

export default FileGallery;
