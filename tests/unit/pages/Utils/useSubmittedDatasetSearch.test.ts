import { act, renderHook } from '@testing-library/react';
import { useSubmittedDatasetSearch } from '@/pages/Utils/useSubmittedDatasetSearch';

describe('submitted dataset search', () => {
  it('keeps draft mode changes separate from the accepted query', () => {
    const { result } = renderHook(() => useSubmittedDatasetSearch());
    const initial = result.current.submitted;
    expect(initial).toEqual({ keyword: '', mode: 'normal', revision: 0 });
    act(() => result.current.setDraftMode('smart'));
    expect(result.current.draftMode).toBe('smart');
    expect(result.current.submitted).toBe(initial);
    expect(result.current.submittedRef.current).toBe(initial);

    act(() => expect(result.current.submitSearch('cement')).toBe(true));
    expect(result.current.submitted).toEqual({ keyword: 'cement', mode: 'smart', revision: 1 });
    act(() => result.current.setDraftMode('normal'));
    expect(result.current.submitted.mode).toBe('smart');
    act(() => expect(result.current.submitSearch('')).toBe(true));
    expect(result.current.submitted).toEqual({ keyword: '', mode: 'normal', revision: 2 });
  });

  it('supports implicit AI selectors and publishes each accepted query before React commits', () => {
    const { result } = renderHook(() => useSubmittedDatasetSearch('smart'));
    const initial = result.current.submitted;
    expect(initial).toEqual({ keyword: '', mode: 'smart', revision: 0 });
    act(() => {
      expect(result.current.submitSearch('copper')).toBe(true);
      expect(result.current.submitted).toBe(initial);
      expect(result.current.submittedRef.current).toEqual({
        keyword: 'copper',
        mode: 'smart',
        revision: 1,
      });
      expect(result.current.submitSearch('copper')).toBe(true);
      expect(result.current.submittedRef.current.revision).toBe(2);
    });
    expect(result.current.submitted).toBe(result.current.submittedRef.current);
    expect(result.current.submitted.revision).toBe(2);
  });

  it('rejects incomplete reference input without replacing the accepted query', () => {
    const { result } = renderHook(() => useSubmittedDatasetSearch());
    act(() => result.current.submitSearch('accepted normal query'));
    const accepted = result.current.submitted;
    act(() => result.current.setDraftMode('reference'));
    for (const keyword of ['', '  ', 'd1380000', 'not-a-uuid']) {
      act(() => expect(result.current.submitSearch(keyword)).toBe(false));
      expect(result.current.submitted).toBe(accepted);
      expect(result.current.submittedRef.current).toBe(accepted);
    }
    const valid = ' D1380000-0000-4000-8000-000000000001 ';
    act(() => expect(result.current.submitSearch(valid)).toBe(true));
    expect(result.current.submitted).toEqual({ keyword: valid, mode: 'reference', revision: 2 });
    const reference = result.current.submitted;
    act(() => expect(result.current.submitSearch('incomplete')).toBe(false));
    expect(result.current.submittedRef.current).toBe(reference);
    expect(result.current.submitted).toBe(reference);
  });
});
