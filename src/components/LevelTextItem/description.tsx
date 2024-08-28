import { getILCDClassificationZh } from '@/services/ilcd/api';
import { Descriptions, Space } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  data: any;
  categoryType: string;
};

const LevelTextItemDescription: FC<Props> = ({ data, categoryType }) => {
  const [dataZH, setDataZH] = useState<any>({});
  useEffect(() => {
    if (data) {
      getILCDClassificationZh(categoryType).then((res) => {
        const level0 = res.data?.category?.find(
          (i: any) => i?.['@name'].toString() === data?.['@level_0'],
        );
        if (level0) {
          setDataZH({
            '@level_0': level0?.['@nameZH'],
          });
          const level1 = level0?.category?.find(
            (i: any) => i?.['@name'].toString() === data?.['@level_1'],
          );
          if (level1) {
            setDataZH({
              '@level_0': level0?.['@nameZH'],
              '@level_1': level1?.['@nameZH'],
            });
            const level2 = level1?.category?.find(
              (i: any) => i?.['@name'].toString() === data?.['@level_2'],
            );
            if (level2) {
              setDataZH({
                '@level_0': level0?.['@nameZH'],
                '@level_1': level1?.['@nameZH'],
                '@level_2': level2?.['@nameZH'],
              });
            }
          }
        }
      });
    }
  }, [data]);

  return (
    <Descriptions bordered size={'small'} column={1}>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level1" defaultMessage="Level 1" />}
        labelStyle={{ width: '100px' }}
      >
        <Space size={'large'}>
          <Space>en:{data?.['@level_0'] ?? '-'}</Space>
          <Space>zh:{dataZH?.['@level_0'] ?? '-'}</Space>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level2" defaultMessage="Level 2" />}
        labelStyle={{ width: '100px' }}
      >
        <Space size={'large'}>
          <Space>en:{data?.['@level_1'] ?? '-'}</Space>
          <Space>zh:{dataZH?.['@level_1'] ?? '-'}</Space>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level3" defaultMessage="Level 3" />}
        labelStyle={{ width: '100px' }}
      >
        <Space size={'large'}>
          <Space>en:{data?.['@level_2'] ?? '-'}</Space>
          <Space>zh:{dataZH?.['@level_2'] ?? '-'}</Space>
        </Space>
      </Descriptions.Item>
    </Descriptions>
  );
};

export default LevelTextItemDescription;
