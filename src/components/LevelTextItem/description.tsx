import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import { genClassStr } from '@/services/general/util';
import { Button, Descriptions, Spin } from 'antd';
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchClassification = async () => {
      if (!Array.isArray(data) || data.length === 0 || data[0] === undefined) {
        setClassStr(undefined);
        setLoadFailed(false);
        setSpinning(false);
        return;
      }

      setClassStr(undefined);
      setLoadFailed(false);
      setSpinning(true);
      try {
        const response =
          categoryType === 'Flow' && flowType === 'Elementary flow'
            ? await getILCDFlowCategorization(lang, [data[0]])
            : await getILCDClassification(categoryType, lang, [data[0]]);
        if (active) {
          if (!response.success || !Array.isArray(response.data) || response.data.length === 0) {
            setLoadFailed(true);
            return;
          }
          setClassStr(genClassStr(data, 0, response.data));
        }
      } catch {
        if (active) {
          setClassStr(undefined);
          setLoadFailed(true);
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
  }, [categoryType, data, flowType, lang, requestVersion]);

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
          {loadFailed ? (
            <>
              <FormattedMessage
                id='pages.classification.loadFailed'
                defaultMessage='Failed to load classification.'
              />
              <Button
                type='link'
                size='small'
                onClick={() => setRequestVersion((value) => value + 1)}
              >
                <FormattedMessage id='pages.classification.retry' defaultMessage='Retry' />
              </Button>
            </>
          ) : (
            (calssStr ?? '-')
          )}
        </Descriptions.Item>
      </Descriptions>
    </Spin>
  );
};

export default LevelTextItemDescription;
