import { genClassStr } from '@/services/general/util';
import { getILCDClassification, getILCDFlowCategorization } from '@/services/ilcd/api';
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
    if (data && Array.isArray(data) && data.length > 0) {
      if (data[0] !== undefined) {
        setSpinning(true);
        if (categoryType === 'Flow' && flowType === 'Elementary flow') {
          getILCDFlowCategorization(lang, [data[0]]).then((res) => {
            setClassStr(genClassStr(data, 0, res.data));
            setSpinning(false);
          });
        } else {
          getILCDClassification(categoryType, lang, [data[0]]).then((res) => {
            setClassStr(genClassStr(data, 0, res.data));
            setSpinning(false);
          });
        }
      }
    }
  }, [data]);

  return (
    <Spin spinning={spinning}>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={
            <FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />
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
