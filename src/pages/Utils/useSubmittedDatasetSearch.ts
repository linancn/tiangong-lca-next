import { useCallback, useRef, useState } from 'react';
import { getReferenceLookupUuid, type DatasetSearchMode } from './referenceLookup';

export type SubmittedDatasetSearch = Readonly<{
  keyword: string;
  mode: DatasetSearchMode;
  revision: number;
}>;

/** Draft controls never change the query used by table requests. */
export function useSubmittedDatasetSearch(initialMode: DatasetSearchMode = 'normal') {
  const [draftMode, setDraftMode] = useState<DatasetSearchMode>(initialMode);
  const [submitted, setSubmitted] = useState<SubmittedDatasetSearch>({
    keyword: '',
    mode: initialMode,
    revision: 0,
  });
  const submittedRef = useRef(submitted);

  const submitSearch = useCallback(
    (keyword: string) => {
      if (draftMode === 'reference' && !getReferenceLookupUuid(keyword)) return false;
      const next = { keyword, mode: draftMode, revision: submittedRef.current.revision + 1 };
      // Imperative reloads in existing pickers can run before React commits state.
      submittedRef.current = next;
      setSubmitted(next);
      return true;
    },
    [draftMode],
  );

  return { draftMode, setDraftMode, submitted, submittedRef, submitSearch };
}
