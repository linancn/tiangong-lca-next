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
    label: 'en',
  },
  {
    value: 'zh',
    label: 'zh',
  },
];

export const initVersion = '01.01.000';
