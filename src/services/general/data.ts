export type ListPagination = {
  total: number;
  pageSize: number;
  current: number;
};

export type Classification = {
  id: string;
  value: string;
  label: string;
  children: Classification[];
};

export const langOptions = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'zh',
    label: '简体中文',
  },
];

export const initVersion = '01.01.000';
