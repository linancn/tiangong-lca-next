import { getILCDClassificationZH, getILCDFlowCategorizationZH } from '@/services/ilcd/api';
import { Descriptions, Spin } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  data: any;
  lang: string;
  categoryType: string;
  flowType?: string;
};

const LevelTextItemDescription: FC<Props> = ({ data, lang, categoryType, flowType }) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const [dataZH, setDataZH] = useState<any>({});
  useEffect(() => {
    if (data) {
      setSpinning(true);
      if (categoryType === 'Flow' && flowType === 'Elementary flow') {
        getILCDFlowCategorizationZH().then((res) => {
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
          setSpinning(false);
        });
      } else {
        getILCDClassificationZH(categoryType).then((res) => {
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
          setSpinning(false);
        });
      }
    }
  }, [data]);

  return (
    <Spin spinning={spinning}>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.level1" defaultMessage="Level 1" />}
          labelStyle={{ width: '100px' }}
        >
          {lang === 'zh' ? dataZH?.['@level_0'] ?? '-' : data?.['@level_0'] ?? '-'}
          {/* <Space size={'large'}>
            <Space>en:{data?.['@level_0'] ?? '-'}</Space>
            <Space>zh:{dataZH?.['@level_0'] ?? '-'}</Space>
          </Space> */}
        </Descriptions.Item>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.level2" defaultMessage="Level 2" />}
          labelStyle={{ width: '100px' }}
        >
          {lang === 'zh' ? dataZH?.['@level_1'] ?? '-' : data?.['@level_1'] ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.level3" defaultMessage="Level 3" />}
          labelStyle={{ width: '100px' }}
        >
          {lang === 'zh' ? dataZH?.['@level_2'] ?? '-' : data?.['@level_2'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  );
};

export default LevelTextItemDescription;
