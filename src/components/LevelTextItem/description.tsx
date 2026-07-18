import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import { genClassStr } from '@/services/general/util';
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
  const [calssStr, setClassStr] = useState<any>(undefined);

  useEffect(() => {
    let active = true;

    const fetchClassification = async () => {
      if (!Array.isArray(data) || data.length === 0 || data[0] === undefined) {
        setClassStr(undefined);
        setSpinning(false);
        return;
      }

      setClassStr(undefined);
      setSpinning(true);
      try {
        const response =
          categoryType === 'Flow' && flowType === 'Elementary flow'
            ? await getILCDFlowCategorization(lang, [data[0]])
            : await getILCDClassification(categoryType, lang, [data[0]]);
        if (active) {
          setClassStr(genClassStr(data, 0, response.data));
        }
      } catch {
        if (active) {
          setClassStr(undefined);
        }
      } finally {
        if (active) {
          setSpinning(false);
        }
      }
    };

    fetchClassification();
    return () => {
      active = false;
    };
  }, [categoryType, data, flowType, lang]);

  return (
    <Spin spinning={spinning}>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={
            <FormattedMessage id='pages.contact.classification' defaultMessage='Classification' />
          }
          styles={{ label: { width: '100px' } }}
        >
          {calssStr ?? '-'}
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  );
};

export default LevelTextItemDescription;
