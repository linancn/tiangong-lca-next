import { Contact } from '@tiangong-lca/tidas-sdk';

export type ContactTable = {
  key: React.Key;
  id: string;
  version: string;
  lang: string;
  shortName: string;
  name: string;
  classification: string;
  email: string;
  modifiedAt: Date;
  teamId: string;
};

export type FormContact = Pick<
  Contact['contactDataSet'],
  'contactInformation' | 'administrativeInformation'
>;

export type ContactDataSetObjectKeys = Exclude<
  {
    [K in keyof Contact['contactDataSet']]: Contact['contactDataSet'][K] extends object ? K : never;
  }[keyof Contact['contactDataSet']],
  undefined
>;
