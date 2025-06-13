import { createContext, useContext } from 'react';

const RefCheckContext: any = createContext<RefCheckType[]>([]);

export type RefCheckType = {
  id: string;
  version: string;
  ruleVerification: boolean;
  nonExistent: boolean;
};

const useRefCheckContext = () => {
  const context: [] = useContext(RefCheckContext);
  if (!context) {
    return []; //{id:refId,version:refVersion,ruleVerification:boolean,nonExistent:boolean}[]
  }
  return context;
};

export { RefCheckContext, useRefCheckContext };
