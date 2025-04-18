import { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { get } from 'lodash';
import { FormattedMessage } from 'umi';

export function getDataTitle(dataSource: string) {
  if (dataSource === 'my') {
    return <FormattedMessage id='menu.mydata' defaultMessage='My Data' />;
  } else if (dataSource === 'tg') {
    return <FormattedMessage id='menu.tgdata' defaultMessage='Open Data' />;
  } else if (dataSource === 'co') {
    return <FormattedMessage id='menu.codata' defaultMessage='Commercial Data' />;
  } else if (dataSource === 'te') {
    return <FormattedMessage id='menu.tedata' defaultMessage='Team Data' />;
  }
  return '';
}

export function getAllVersionsColumns(columns: ProColumns<any>[], versionIndex: number) {
  const newColumns = [...columns];
  newColumns[versionIndex] = {
    ...newColumns[versionIndex],
    render: undefined,
  };

  newColumns.pop();
  return newColumns;
}

export function getRules(rules: any[]) {
  return rules.map((rule) => {
    let _rule = { ...rule };
    if (rule.hasOwnProperty('pattern')) {
      if (rule.pattern === 'dataSetVersion') {
        _rule.pattern = /^\d{2}\.\d{2}\.\d{3}$/;
      }
      if (rule.pattern === 'CASNumber') {
        _rule.pattern = /^\d{2,7}-\d{2}-\d$/;
      }
      if (rule.pattern === 'year') {
        _rule.pattern = /^[0-9]{4}$/;
      }
    }
    return {
      ..._rule,
      message: <FormattedMessage id={rule.messageKey} defaultMessage={rule.defaultMessage} />,
    };
  });
}

export const validateRefObjectId = (
  formRef: React.MutableRefObject<ProFormInstance | undefined>,
  name: string[],
  parentName?: string[],
) => {
  if (parentName) {
    formRef.current?.validateFields([[...parentName, ...name, '@refObjectId']]);
  } else {
    formRef.current?.validateFields([[...name, '@refObjectId']]);
  }
};

export const getLocalValueProps = (value: string) => ({
  value: value === 'en' ? 'English' : value === 'zh' ? '简体中文' : value,
});

const checkValidationFields = (data: any) => {
  if (!data) {
    return { checkResult: false, tabName: 'validation' };
  }
  for (let review of data) {
    if (
      review['@type'] &&
      review['common:scope'] &&
      review['common:scope']?.length &&
      review['common:scope'].every(
        (item: any) => item['@name'] && item['common:method'] && item['common:method']['@name'],
      ) &&
      review['common:reviewDetails'] &&
      review['common:reviewDetails']?.length &&
      review['common:reviewDetails'].every((item: any) => item !== undefined)
    ) {
      return { checkResult: true, tabName: null };
    }
  }
  return { checkResult: false, tabName: 'validation' };
};

const checkComplianceFields = (data: any) => {
  if (!data || !data?.length) {
    return { checkResult: false, tabName: 'complianceDeclarations' };
  }

  for (let item of data) {
    for (let key of Object.keys(item)) {
      if (key === 'common:referenceToComplianceSystem') {
        if (!item[key]?.['@refObjectId']) {
          return { checkResult: false, tabName: 'complianceDeclarations' };
        }
      }
      if (item[key] === null || item[key] === undefined) {
        return { checkResult: false, tabName: 'complianceDeclarations' };
      }
    }
  }
  return { checkResult: true, tabName: null };
};

export const checkRequiredFields = (requiredFields: any, formData: any) => {
  for (let field of Object.keys(requiredFields)) {
    const value = get(formData, field);
    // console.log('checkRequiredFields', field, value,formData)
    if (field === 'modellingAndValidation.validation.review') {
      const { checkResult, tabName } = checkValidationFields(value);
      if (!checkResult) {
        return { checkResult, tabName };
      }
    }

    if (field === 'modellingAndValidation.complianceDeclarations.compliance') {
      const { checkResult, tabName } = checkComplianceFields(value);
      if (!checkResult) {
        return { checkResult, tabName };
      }
    }

    if (!value) {
      return { checkResult: false, tabName: requiredFields[field] };
    }

    if (Array.isArray(value) && (value.length === 0 || value.every((item) => !item))) {
      return { checkResult: false, tabName: requiredFields[field] };
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) {
        return { checkResult: false, tabName: requiredFields[field] };
      }
      const allPropsEmpty = Object.values(value).every(
        (propValue) => propValue === undefined || propValue === null,
      );
      if (allPropsEmpty) {
        return { checkResult: false, tabName: requiredFields[field] };
      }
    }
  }

  return { checkResult: true, tabName: null };
};
