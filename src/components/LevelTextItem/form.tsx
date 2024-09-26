import { getILCDClassification, getILCDFlowCategorization } from '@/services/ilcd/api';
import { Cascader, Form } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  name: any;
  lang: string;
  dataType: string;
  flowType?: string;
  onData: () => void;
};

const LevelTextItemForm: FC<Props> = ({ name, lang, dataType, flowType, onData }) => {
  const [selectOptions, setSelectOptions] = useState<any>([]);
  useEffect(() => {
    const fetchClassification = async (dt: string, ft: string | undefined) => {
      let result: any = {};
      if (dt === 'Flow' && !ft) {
        return;
      }
      if (dt === 'Flow' && ft === 'Elementary flow') {
        result = await getILCDFlowCategorization(lang, ['all']);
      } else {
        result = await getILCDClassification(dt, lang, ['all']);
      }
      setSelectOptions(result?.data);
      onData();
    };

    fetchClassification(dataType, flowType);
  }, [dataType, flowType]);

  return (
    <>
      <Form.Item
        label={<FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />}
        name={name}
      >
        <Cascader style={{ width: '100%' }} options={selectOptions} />
      </Form.Item>
    </>
  );
};

export default LevelTextItemForm;
