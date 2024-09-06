import { FormattedMessage } from 'umi';

export const StringMultiLanglength500 = [
  {
    required: true,
    warningOnly: true,
    message: (
      <FormattedMessage
        id="validator.StringMultiLang.empty"
        defaultMessage="It is recommended to fill in to ensure data completeness and accuracy!"
      />
    ),
  },
  {
    max: 500,
    message: (
      <FormattedMessage
        id="validator.StringMultiLang.length500"
        defaultMessage="Length cannot exceed 500 characters!"
      />
    ),
  },
];

export const STMultiLanglength1000 = [
  {
    required: true,
    warningOnly: true,
    message: (
      <FormattedMessage
        id="validator.STMultiLang.empty"
        defaultMessage="It is recommended to fill in to ensure data completeness and accuracy!"
      />
    ),
  },
  {
    max: 1000,
    message: (
      <FormattedMessage
        id="validator.STMultiLang.length1000"
        defaultMessage="Length cannot exceed 1000 characters!"
      />
    ),
  },
];

export const String = [
  {
    required: true,
    warningOnly: true,
    message: (
      <FormattedMessage
        id="validator.String.empty"
        defaultMessage="It is recommended to fill in to ensure data completeness and accuracy!"
      />
    ),
  },
  {
    whitespace: true,
    min: 1,
    max: 500,
    message: (
      <FormattedMessage
        id="validator.String.length1to500"
        defaultMessage="Length cannot be less than 1 or exceed 500 characters!"
      />
    ),
  },
];

export const dataSetVersion = [
  {
    required: true,
    message: (
      <FormattedMessage
        id="validator.dataSetVersion.empty"
        defaultMessage="Please input the Data Set Version!"
      />
    ),
  },
  {
    pattern: /^\d{2}\.\d{2}\.\d{3}$/,
    message: (
      <FormattedMessage
        id="validator.dataSetVersion.pattern"
        defaultMessage="Version format must be XX.XX.XXX, where X is a digit!"
      />
    ),
  },
];
