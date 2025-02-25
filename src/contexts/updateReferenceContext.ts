import { createContext, useContext } from 'react';

const UpdateReferenceContext: any = createContext({ referenceValue: 0 });

const useUpdateReferenceContext = () => {
  const context = useContext(UpdateReferenceContext);
  if (!context) {
    return { referenceValue: 0 };
  }
  return context;
};

export { UpdateReferenceContext, useUpdateReferenceContext };
