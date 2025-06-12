import { createContext, useContext } from 'react';

const RefCheckContext: any = createContext([]);

const useRefCheckContext = () => {
  const context: [] = useContext(RefCheckContext);
  if (!context) {
    return []; //{id:refId,version:refVersion,type:1|2(1:unRuleVerification,2:nonExistentRef)}[]
  }
  return context;
};

export { RefCheckContext, useRefCheckContext };
