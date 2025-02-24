import { createContext, useContext } from 'react';

const UnitsContext: any = createContext(null);

const useUnitsContext = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    return { units: [], setUnits: () => {}, setTargetUnit: () => {} };
  }
  return context;
};

export { UnitsContext, useUnitsContext };
