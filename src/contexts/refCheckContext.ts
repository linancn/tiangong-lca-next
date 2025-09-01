import { createContext, useContext } from 'react';

const RefCheckContext: any = createContext<RefCheckContextType>({
  refCheckData: [],
  // updateRefCheckStatus: () => {},
});

export type RefCheckType = {
  id: string;
  version: string;
  ruleVerification: boolean;
  nonExistent: boolean;
  stateCode?: number;
};

type RefCheckContextType = {
  refCheckData: RefCheckType[];
  // updateRefCheckStatus: (onlyCheck: boolean) => void;
};

const useRefCheckContext = () => {
  const context: RefCheckContextType = useContext(RefCheckContext);
  if (!context) {
    return { refCheckData: [] };
  }
  return context;
};

export { RefCheckContext, useRefCheckContext };
