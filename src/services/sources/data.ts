export type SourceTable = {
  key: React.Key;
  id: string;
  lang: string;
  shortName: string;
  classification: string;
  sourceCitation: string;
  publicationType: string;
  created_at: Date;
};

export const publicationTypeOptions = [
  {
    value: 'Undefined',
    label: 'Undefined',
  },
  {
    value: 'Article in periodical',
    label: 'Article in periodical',
  },
  {
    value: 'Chapter in anthology',
    label: 'Chapter in anthology',
  },
  {
    value: 'Monograph',
    label: 'Monograph',
  },
  {
    value: 'Direct measurement',
    label: 'Direct measurement',
  },
  {
    value: 'Oral communication',
    label: 'Oral communication',
  },
  {
    value: 'Personal written communication',
    label: 'Personal written communication',
  },
  {
    value: 'Questionnaire',
    label: 'Questionnaire',
  },
  {
    value: 'Software or database',
    label: 'Software or database',
  },
  {
    value: 'Other unpublished and grey literature',
    label: 'Other unpublished and grey literature',
  },
];
