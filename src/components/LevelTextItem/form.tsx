import RequiredMark from '@/components/RequiredMark';
import { getILCDClassification, getILCDFlowCategorization } from '@/services/ilcd/api';
import { Cascader, Form, Input, TreeSelect } from 'antd';
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
  rules?: any[];
  showRules?: boolean;
};

const LevelTextItemForm: FC<Props> = ({
  name,
  lang,
  dataType,
  flowType,
  formRef,
  hidden,
  onData,
  rules = [],
  showRules = false,
}) => {
  const [selectOptions, setSelectOptions] = useState<any>([]);
  const [hasClassId, setHasClassId] = useState<boolean>(false);

  const getNodePath = (
    targetId: string,
    nodes: any[],
  ): { ids: string[]; values: string[]; labels: string[] } => {
    const findPath = (
      currentNodes: any[],
      pathIds: string[],
      pathValues: string[],
      pathLabels: string[],
    ): { ids: string[]; values: string[]; labels: string[] } | null => {
      for (const node of currentNodes) {
        const currentId = node.id;
        const currentValue = node.value || node.title;
        const currentLabel = node.label || node.title;

        if (node.id === targetId) {
          return {
            ids: [...pathIds, currentId],
            values: [...pathValues, currentValue],
            labels: [...pathLabels, currentLabel],
          };
        }

        if (node.children && node.children.length > 0) {
          const result = findPath(
            node.children,
            [...pathIds, currentId],
            [...pathValues, currentValue],
            [...pathLabels, currentLabel],
          );
          if (result) {
            return result;
          }
        }
      }
      return null;
    };

    const result = findPath(nodes, [], [], []);
    return result || { ids: [], values: [], labels: [] };
  };

  const getIdByValue = (value: string, nodes: any[]): string => {
    const findId = (currentNodes: any[]): string | null => {
      for (const node of currentNodes) {
        if (!node.children && (node.value === value || node.title === value)) {
          return node.id;
        }
        if (node.children && node.children.length > 0) {
          const result = findId(node.children);
          if (result) {
            return result;
          }
        }
      }
      return null;
    };
    return findId(nodes) || '';
  };

  const processTreeData = (treeData: any[]): any[] => {
    const addFullPath = (nodes: any[], parentPath: string[] = []): any[] => {
      return nodes.map((node) => {
        const newNode = { ...node };
        const currentPath = [...parentPath, node.label];
        newNode.title = currentPath.join('/');

        if (node.children && node.children.length > 0) {
          newNode.selectable = false;
          newNode.children = addFullPath(node.children, currentPath);
        } else {
          newNode.selectable = true;
        }
        return newNode;
      });
    };
    return addFullPath(treeData);
  };

  const setShowValue = async () => {
    const field = formRef.current?.getFieldValue(name);
    if (
      field &&
      field.id &&
      field.id?.length &&
      field.id.every((item: string) => typeof item === 'string' && item.length !== 0)
    ) {
      const id = field.id[field.id.length - 1];
      setHasClassId(true);
      await formRef.current?.setFieldValue([...name, 'showValue'], id);
    } else if (
      field &&
      field.value &&
      field.value?.length &&
      field.value.every((item: any) => item)
    ) {
      const value = field.value[field.value.length - 1];
      const id = getIdByValue(value, selectOptions);
      await formRef.current?.setFieldValue([...name, 'showValue'], id);
      setHasClassId(true);
    } else {
      setHasClassId(false);
    }
  };

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
      setSelectOptions(processTreeData(result?.data));
    };

    fetchClassification(dataType, flowType);
  }, [dataType, flowType]);

  useEffect(() => {
    setTimeout(() => {
      setShowValue();
    });
  });

  const handleValueChange = async (item: any) => {
    const fullPath = getNodePath(item, selectOptions);
    await formRef.current?.setFieldValue([...name, 'id'], fullPath.ids);
    await formRef.current?.setFieldValue([...name, 'value'], fullPath.values);
    await formRef.current?.setFieldValue(
      [...name, 'showValue'],
      fullPath.ids[fullPath.ids.length - 1],
    );
    if (fullPath?.ids?.length > 0) {
      setHasClassId(true);
    } else {
      setHasClassId(false);
    }
    onData();
  };

  return (
    <>
      <Form.Item
        hidden={hidden}
        required={false}
        label={
          <RequiredMark
            showError={false}
            label={
              <FormattedMessage id='pages.contact.classification' defaultMessage='Classification' />
            }
          />
        }
        name={[...name, 'showValue']}
        rules={rules}
        validateStatus={showRules && !hasClassId ? 'error' : undefined}
        help={
          showRules && !hasClassId ? (
            <FormattedMessage
              id='pages.contact.validator.classification.required'
              defaultMessage='Please input classification'
            />
          ) : undefined
        }
      >
        <TreeSelect
          treeDefaultExpandedKeys={
            formRef.current?.getFieldValue([...name, 'showValue'])
              ? [formRef.current?.getFieldValue([...name, 'showValue'])]
              : []
          }
          onChange={handleValueChange}
          fieldNames={{ label: 'label', value: 'id', children: 'children' }}
          style={{ width: '100%' }}
          treeData={selectOptions}
          showSearch
          filterTreeNode={(inputValue, treeNode) => {
            return (treeNode?.title as string)?.toLowerCase().includes(inputValue.toLowerCase());
          }}
          treeNodeFilterProp='title'
          treeExpandAction='click'
          // labelInValue={true}
          treeNodeLabelProp='title'
        />
      </Form.Item>
      <Form.Item name={[...name, 'id']} hidden={true}>
        <Input />
      </Form.Item>
      <Form.Item name={[...name, 'value']} hidden={true}>
        <Cascader options={selectOptions} />
      </Form.Item>
    </>
  );
};

export default LevelTextItemForm;
