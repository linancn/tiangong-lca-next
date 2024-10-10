import { getFileUrls, isImage } from '@/services/supabase/storage';
import { Card, Image, Space, Spin } from 'antd';
import React, { FC } from 'react';

import { FileTwoTone } from '@ant-design/icons';

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
        setFileUrls(urls);
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
                <Card
                  style={{
                    width: 100,
                    height: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  styles={{ body: { padding: 10 } }}
                  key={index}
                >
                  <Image
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    src={fileUrl.url}
                    preview={{
                      src: fileUrl.url,
                    }}
                  />
                </Card>
              );
            } else {
              return (
                <a href={fileUrl.url} target="blank" title="Open file" key={index}>
                  <Card
                    style={{
                      width: 100,
                      height: 100,
                      textAlign: 'center',
                      padding: 0,
                    }}
                  >
                    <FileTwoTone style={{ fontSize: '32px' }} />
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>{fileUrl.name}</div>
                  </Card>
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
