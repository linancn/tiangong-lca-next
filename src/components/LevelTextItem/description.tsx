import { getILCDClassification } from '@/services/ilcd/api';
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
  const [calssStr, setClassStr] = useState<any>('');
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      setSpinning(true);
      if (categoryType === 'Flow' && flowType === 'Elementary flow') {
        // getILCDFlowCategorization(lang, [data?.['@level_0']]).then((res) => {
        //   const level0 = res.data?.category?.find(
        //     (i: any) => i?.['@name'].toString() === data?.['@level_0'],
        //   );
        //   if (level0) {
        //     setDataZH({
        //       '@level_0': level0?.['@nameZH'],
        //     });
        //     const level1 = level0?.category?.find(
        //       (i: any) => i?.['@name'].toString() === data?.['@level_1'],
        //     );
        //     if (level1) {
        //       setDataZH({
        //         '@level_0': level0?.['@nameZH'],
        //         '@level_1': level1?.['@nameZH'],
        //       });
        //       const level2 = level1?.category?.find(
        //         (i: any) => i?.['@name'].toString() === data?.['@level_2'],
        //       );
        //       if (level2) {
        //         setDataZH({
        //           '@level_0': level0?.['@nameZH'],
        //           '@level_1': level1?.['@nameZH'],
        //           '@level_2': level2?.['@nameZH'],
        //         });
        //       }
        //     }
        //   }
        //   setSpinning(false);
        // });
      } else {
        getILCDClassification(categoryType, lang, [data[0]]).then((res) => {
          const level0 = res.data?.find(
            (i: any) => i?.value === data[0],
          );
          if (level0) {
            setClassStr(level0?.label);

            const level1 = level0?.children?.find(
              (i: any) => i?.value === data?.[1],
            );
            if (level1) {
              setClassStr(level0?.label + ' / ' + level1?.label);
              const level2 = level1?.children?.find(
                (i: any) => i?.value === data?.[2],
              );
              if (level2) {
                setClassStr(level0?.label + ' / ' + level1?.label + ' / ' + level2?.label);
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
          label={<FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />}
          labelStyle={{ width: '100px' }}
        >
          {calssStr}
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  );
};

export default LevelTextItemDescription;
