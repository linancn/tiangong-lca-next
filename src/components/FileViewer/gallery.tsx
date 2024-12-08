import { getOriginalFileUrl, getThumbFileUrls, isImage } from '@/services/supabase/storage';
import { Card, Image, Space, Spin } from 'antd';
import React, { FC } from 'react';

import { FileTwoTone } from '@ant-design/icons';
import { useIntl } from 'umi';

type Props = {
  data: any;
};

const FileGallery: FC<Props> = ({ data }) => {
  const [fileUrls, setFileUrls] = React.useState<any[]>([]);
  const [spinning, setSpinning] = React.useState<boolean>(false);

  const intl = useIntl();

  const updateFileUrls = (previewUrl: any, index: number) => {
    setFileUrls((prevFileUrls) => {
      const newFileUrls = [...prevFileUrls];
      if (newFileUrls.length > index) {
        newFileUrls[index] = {
          ...newFileUrls[index],
          url: previewUrl,
        };
      }
      return newFileUrls;
    });
  };

  React.useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const urls = await getThumbFileUrls(data);
        setFileUrls(urls);
        setSpinning(false);
      }
    };
    setSpinning(true);
    fetchData();
  }, [data]);

  if (!data || data.length === 0) {
    return <>-</>;
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
                    src={fileUrl.thumbUrl}
                    preview={{
                      onVisibleChange: (visible) => {
                        if (visible) {
                          getOriginalFileUrl(fileUrl.uid, fileUrl.name).then((res) => {
                            updateFileUrls(res.url, index);
                          });
                        }
                      },
                      src: fileUrl.url,
                    }}
                  />
                </Card>
              );
            } else {
              return (
                <a
                  target="blank"
                  title={intl.formatMessage({
                    id: 'pages.button.downloadFile',
                    defaultMessage: 'Download file',
                  })}
                  key={index}
                  onClick={() => {
                    getOriginalFileUrl(fileUrl.uid, fileUrl.name).then((res) => {
                      window.open(res.url, '_blank');
                    });
                  }}
                >
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
