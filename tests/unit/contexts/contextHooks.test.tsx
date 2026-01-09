import { renderHook } from '@testing-library/react';
import React from 'react';

import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { UnitsContext, useUnitsContext } from '@/contexts/unitContext';

type UnitsContextValue = {
  units: any[];
  setUnits: (units: any[]) => void;
  setTargetUnit: (unitId: any) => void;
};

describe('context fallback hooks', () => {
  describe('useUnitsContext (src/contexts/unitContext.ts)', () => {
    it('returns defaults when no provider is mounted', () => {
      const { result } = renderHook(() => useUnitsContext());
      const ctx = result.current as unknown as UnitsContextValue;

      expect(ctx.units).toEqual([]);
      expect(typeof ctx.setUnits).toBe('function');
      expect(typeof ctx.setTargetUnit).toBe('function');

      expect(() => ctx.setUnits([{ id: 'u1' }])).not.toThrow();
      expect(() => ctx.setTargetUnit('u1')).not.toThrow();
    });

    it('uses values from the provider when available', () => {
      const setUnits = jest.fn();
      const setTargetUnit = jest.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UnitsContext.Provider value={{ units: [{ id: 'provided' }], setUnits, setTargetUnit }}>
          {children}
        </UnitsContext.Provider>
      );

      const { result } = renderHook(() => useUnitsContext(), { wrapper });
      const ctx = result.current as unknown as UnitsContextValue;

      expect(ctx.units).toEqual([{ id: 'provided' }]);
      ctx.setUnits([{ id: 'u2' }]);
      ctx.setTargetUnit('u2');

      expect(setUnits).toHaveBeenCalledWith([{ id: 'u2' }]);
      expect(setTargetUnit).toHaveBeenCalledWith('u2');
    });
  });

  describe('useRefCheckContext (src/contexts/refCheckContext.ts)', () => {
    it('returns default data without a provider', () => {
      const { result } = renderHook(() => useRefCheckContext());

      expect(result.current.refCheckData).toEqual([]);
    });

    it('falls back to defaults when provider value is null', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RefCheckContext.Provider value={null as any}>{children}</RefCheckContext.Provider>
      );

      const { result } = renderHook(() => useRefCheckContext(), { wrapper });

      expect(result.current.refCheckData).toEqual([]);
    });

    it('returns provided refCheck data', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RefCheckContext.Provider value={{ refCheckData: [{ id: 'r1', version: '1.0' }] }}>
          {children}
        </RefCheckContext.Provider>
      );

      const { result } = renderHook(() => useRefCheckContext(), { wrapper });

      expect(result.current.refCheckData).toEqual([{ id: 'r1', version: '1.0' }]);
    });
  });
});
