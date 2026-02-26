import type { ReferenceItem } from '@/services/general/data';
import type { Contact } from '@tiangong-lca/tidas-sdk';

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

export type ContactReference = ReferenceItem | ReferenceItem[];

export type ContactImportItem = {
  contactDataSet: Contact['contactDataSet'];
};

export type ContactImportData = ContactImportItem[];

export type ContactDetailData = {
  id?: string;
  version?: string;
  json?: { contactDataSet?: Contact['contactDataSet'] };
  modifiedAt?: string | Date;
  stateCode?: number;
  ruleVerification?: boolean;
  userId?: string;
};

export type ContactDetailResponse = {
  data?: ContactDetailData | null;
  success?: boolean;
};

export type FormContact = Pick<
  Contact['contactDataSet'],
  'contactInformation' | 'administrativeInformation'
>;

export type ContactDataSetObjectKeys = Exclude<
  {
    [K in keyof Contact['contactDataSet']]: Contact['contactDataSet'][K] extends object | undefined
      ? K
      : never;
  }[keyof Contact['contactDataSet']],
  undefined
>;
