import { resolveFileLocator } from '@/services/supabase/fileLocator';
import {
  getOriginalFileUrl,
  getThumbFileUrls,
  isImage,
  type StorageFilePreview,
} from '@/services/supabase/storage';
import { Card, Image, Space, Spin } from 'antd';
import React, { FC } from 'react';
import { FileTwoTone } from '@ant-design/icons';
import { useIntl } from 'umi';
import { filePreviewLabel } from './preview';

type Props = { data: any };

const FileGallery: FC<Props> = ({ data }) => {
  const [fileUrls, setFileUrls] = React.useState<StorageFilePreview[]>([]);
  const [spinning, setSpinning] = React.useState(false);
  const intl = useIntl();

  const openManagedFile = async (file: StorageFilePreview, index: number, openWindow: boolean) => {
    const result = await getOriginalFileUrl(file.uid, file.name);
    setFileUrls((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index && entry.uid === file.uid
          ? {
              ...entry,
              ...result,
              previewState: result.url ? (result.previewState ?? 'resolved') : 'unavailable',
            }
          : entry,
      ),
    );
    if (openWindow && result.url) window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  React.useEffect(() => {
    let active = true;
    setSpinning(true);
    setFileUrls([]);
    if (!data) {
      setSpinning(false);
      return () => {
        active = false;
      };
    }
    getThumbFileUrls(data)
      .then((urls) => {
        if (active) setFileUrls(urls);
      })
      .catch(() => {
        if (active) {
          const references = Array.isArray(data) ? data : [data];
          setFileUrls(
            references.map((reference, index) => {
              const uri = String(reference?.['@uri'] ?? '');
              const locator = resolveFileLocator(uri);
              return {
                uid: uri,
                name: String(index + 1),
                url: locator.kind === 'external' ? locator.url : '',
                previewState:
                  locator.kind === 'managed'
                    ? 'unavailable'
                    : locator.kind === 'external'
                      ? 'unchecked'
                      : 'unsupported',
              };
            }),
          );
        }
      })
      .finally(() => {
        if (active) setSpinning(false);
      });
    return () => {
      active = false;
    };
  }, [data]);

  if (!data || data.length === 0) return <>-</>;

  return (
    <Spin spinning={spinning}>
      <Space size={[8, 16]} wrap>
        {fileUrls.map((file, index) => {
          const locator = resolveFileLocator(file.uid);
          const state = file.previewState ?? 'unchecked';
          const label = filePreviewLabel(state, intl.formatMessage);
          const title = intl.formatMessage({
            id: 'pages.button.downloadFile',
            defaultMessage: 'Download file',
          });
          if (
            locator.kind === 'managed' &&
            file.thumbUrl &&
            state !== 'unavailable' &&
            isImage(file)
          ) {
            return (
              <Card
                key={index}
                styles={{ body: { padding: 10 } }}
                style={{ width: 100, height: 100, padding: 0 }}
              >
                <Image
                  alt={file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  src={file.thumbUrl}
                  preview={{
                    onOpenChange: (open) => {
                      if (open) void openManagedFile(file, index, false);
                    },
                    src: file.url,
                  }}
                />
              </Card>
            );
          }
          const card = (
            <Card style={{ width: 150, minHeight: 100, textAlign: 'center', padding: 0 }}>
              <FileTwoTone style={{ fontSize: '32px' }} />
              <div style={{ marginTop: 8, fontSize: 14, overflowWrap: 'anywhere' }}>
                {file.name}
              </div>
              {label && <div>{label}</div>}
            </Card>
          );
          if (locator.kind === 'external') {
            return (
              <a
                key={index}
                href={locator.url}
                target='_blank'
                rel='noopener noreferrer'
                title={title}
              >
                {card}
              </a>
            );
          }
          if (locator.kind === 'managed') {
            return (
              <button
                key={index}
                type='button'
                title={title}
                style={{ border: 0, padding: 0, background: 'none' }}
                onClick={() => void openManagedFile(file, index, true)}
              >
                {card}
              </button>
            );
          }
          return <div key={index}>{card}</div>;
        })}
      </Space>
    </Spin>
  );
};

export default FileGallery;
