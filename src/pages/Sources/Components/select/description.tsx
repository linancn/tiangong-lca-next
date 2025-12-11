import LangTextItemDescription from '@/components/LangTextItem/description';
import { jsonToList } from '@/services/general/util';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, getLocale } from 'umi';
import SourceView from '../view';
type Props = {
  title: ReactNode | string;
  lang: string;
  data: any;
};

const SourceSelectDescription: FC<Props> = ({ title, lang, data }) => {
  const locale = getLocale();
  const dataList = jsonToList(data);
  return (
    <Card size='small' title={title}>
      <Space direction='vertical' style={{ width: '100%' }}>
        {dataList.length === 0 ? (
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage id='pages.source.refObjectId' defaultMessage='Ref object id' />
              }
              labelStyle={{ width: locale === 'zh-CN' ? '150px' : '250px' }}
            >
              -
            </Descriptions.Item>
          </Descriptions>
        ) : (
          dataList.map((item: any, index: number) => (
            <div key={item?.['@refObjectId'] ?? index}>
              <Space direction='horizontal'>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id='pages.source.refObjectId'
                        defaultMessage='Ref object id'
                      />
                    }
                    labelStyle={{ width: locale === 'zh-CN' ? '150px' : '250px' }}
                  >
                    {item?.['@refObjectId'] ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                {item?.['@refObjectId'] && (
                  <SourceView
                    id={item?.['@refObjectId']}
                    version={item?.['@version']}
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
                  labelStyle={{ width: '140px' }}
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
              {index < dataList.length - 1 && <Divider />}
            </div>
          ))
        )}
      </Space>
    </Card>
  );
};

export default SourceSelectDescription;
