import { jsonToList } from '@/services/general/util';
import type { ProcessReviewItem } from '@/services/processes/data';

export const reviewReportReferenceKey = (id?: string, version?: string) =>
  id && version ? `${id}:${version}` : null;

export const collectReviewReportReferenceKeys = (
  data: ProcessReviewItem | ProcessReviewItem[] | null | undefined,
) => {
  const keys = new Set<string>();
  jsonToList(data).forEach((review: ProcessReviewItem) => {
    jsonToList(review?.['common:referenceToCompleteReviewReport']).forEach((report) => {
      const key = reviewReportReferenceKey(report?.['@refObjectId'], report?.['@version']);
      if (key) keys.add(key);
    });
  });
  return [...keys];
};
