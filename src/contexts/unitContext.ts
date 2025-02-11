import { createContext, useContext } from 'react';
const UnitsContext: any = createContext(null);
const useUnitsContext = () => {
    const context = useContext(UnitsContext);
    if (!context) {
        console.log('UnitsContext 必须在 UnitsContext 内部使用');
    }
    return context;
}

export { UnitsContext, useUnitsContext };
