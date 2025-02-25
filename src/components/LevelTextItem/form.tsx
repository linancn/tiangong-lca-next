import { Classification } from '@/services/general/data';
import { genClassIdList } from '@/services/general/util';
import { getILCDClassification, getILCDFlowCategorization } from '@/services/ilcd/api';
import { Cascader, CascaderProps, Form, Input } from 'antd';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  name: any;
  lang: string;
  dataType: string;
  flowType?: string;
  formRef: React.MutableRefObject<any | undefined>;
  hidden?: boolean;
  onData: () => void;
};

const LevelTextItemForm: FC<Props> = ({
  name,
  lang,
  dataType,
  flowType,
  formRef,
  hidden,
  onData,
}) => {
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
    };

    fetchClassification(dataType, flowType);
  }, [dataType, flowType]);

  const onChange: CascaderProps<Classification>['onChange'] = async (value) => {
    const ids = genClassIdList(value, 0, selectOptions);
    await formRef.current?.setFieldValue(name, { id: ids, value: value });
    onData();
  };

  const filter = (inputValue: string, path: any[]) =>
    path.some(
      (option) =>
        typeof option.label === 'string' &&
        option.label.toLowerCase().includes(inputValue.toLowerCase()),
    );

  return (
    <>
      <Form.Item
        hidden={hidden}
        label={
          <FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />
        }
        name={[...name, 'value']}
      >
        <Cascader
          style={{ width: '100%' }}
          options={selectOptions}
          onChange={onChange}
          showSearch={{ filter }}
        />
      </Form.Item>
      <Form.Item name={[...name, 'id']} hidden={true}>
        <Input />
      </Form.Item>
    </>
  );
};

export default LevelTextItemForm;
