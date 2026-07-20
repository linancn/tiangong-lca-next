import LangTextItemDescription from '@/components/LangTextItem/description';
import type { ReferenceItem } from '@/services/general/data';
import { RESPONSIVE_DESCRIPTION_ITEM_STYLES } from '@/style/responsiveDescriptions';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage } from 'umi';
import SourceView from '../view';
type Props = {
  title: ReactNode | string;
  lang: string;
  data?: ReferenceItem | ReferenceItem[];
};

const SourceSelectDescription: FC<Props> = ({ title, lang, data }) => {
  const dataList: ReferenceItem[] = Array.isArray(data) ? data : data ? [data] : [];
  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      {dataList.length === 0 ? (
        <Card size='small' title={title}>
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage
                  id='pages.source.refObjectId'
                  defaultMessage='Reference source data set identifier'
                />
              }
              styles={RESPONSIVE_DESCRIPTION_ITEM_STYLES}
            >
              -
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        dataList.map((item, index: number) => (
          <Card
            size='small'
            title={
              <Space>
                {title}
                {index + 1}
              </Space>
            }
            key={item?.['@refObjectId'] ?? index}
          >
            <div>
              <Space direction='horizontal'>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id='pages.source.refObjectId'
                        defaultMessage='Reference source data set identifier'
                      />
                    }
                    styles={RESPONSIVE_DESCRIPTION_ITEM_STYLES}
                  >
                    {item?.['@refObjectId'] ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                {item?.['@refObjectId'] && (
                  <SourceView
                    id={item?.['@refObjectId']}
                    version={item?.['@version'] ?? ''}
                    buttonType='text'
                    lang={lang}
                  />
                )}
              </Space>
              <br />
              <br />
              <Descriptions bordered size={'small'} column={1}>
                <Descriptions.Item
                  key={0}
                  label={<FormattedMessage id='pages.contact.version' defaultMessage='Version' />}
                  styles={{ label: { width: '140px' } }}
                >
                  {item?.['@version'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <Divider orientationMargin='0' orientation='left' plain>
                <FormattedMessage
                  id='pages.contact.shortDescription'
                  defaultMessage='Short description'
                />
              </Divider>
              <LangTextItemDescription data={item?.['common:shortDescription']} />
            </div>
          </Card>
        ))
      )}
    </Space>
  );
};

export default SourceSelectDescription;
