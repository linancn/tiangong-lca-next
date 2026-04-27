import type { ValidationIssueSdkDetail } from '@/pages/Utils/review';
import type { ProFormInstance } from '@ant-design/pro-components';
import { useEffect, useMemo, useRef } from 'react';
import { getSdkSuggestedFixMessage } from './messages';

type IntlShapeLike = {
  formatMessage: (
    descriptor: {
      defaultMessage?: string;
      id: string;
    },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

type SdkFieldMessageEntry = {
  text: string;
  validationCode?: string;
};

type ValidationFormRef = React.MutableRefObject<ProFormInstance | undefined>;

type UseDatasetSdkValidationFormSupportOptions = {
  activeTabKey: string;
  formRef: ValidationFormRef;
  intl: IntlShapeLike;
  sdkValidationDetails?: ValidationIssueSdkDetail[];
  sdkValidationFocus?: ValidationIssueSdkDetail | null;
  showRules?: boolean;
};

const waitForNextValidationTurn = async () => {
  await new Promise<void>((resolve) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => resolve());
      return;
    }

    Promise.resolve().then(() => resolve());
  });

  await new Promise<void>((resolve) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(() => resolve(), 0);
  });
};

export const validateVisibleFormFields = async (
  formRef: ValidationFormRef,
  options?: {
    onSettled?: () => void;
    waitForPaint?: boolean;
  },
) => {
  const runValidation = async () => {
    try {
      await formRef.current?.validateFields();
    } catch {
      // Ignore validation rejections because callers only need the field state side effects.
    }
  };

  if (options?.waitForPaint === false) {
    await runValidation();
    options?.onSettled?.();
    return;
  }

  await waitForNextValidationTurn();
  await runValidation();

  // Some required Form.List fields mount an initial empty row on the first validated render.
  // Run one more validation turn so those just-mounted controls receive field-level errors too.
  await waitForNextValidationTurn();
  await runValidation();

  options?.onSettled?.();
};

const isSdkFieldDetail = (detail: ValidationIssueSdkDetail) =>
  !detail.presentation || detail.presentation === 'field';

const isSdkSectionDetail = (detail: ValidationIssueSdkDetail) => detail.presentation === 'section';

const isSdkTabCountableDetail = (detail: ValidationIssueSdkDetail) =>
  detail.presentation !== 'highlight-only';

const parseSdkDetailFormName = (detail: ValidationIssueSdkDetail) => {
  if (Array.isArray(detail.formName) && detail.formName.length > 0) {
    return detail.formName;
  }

  if (!detail.fieldPath) {
    return undefined;
  }

  const fieldPath = detail.fieldPath.replace(/^[^.]+\[#.+?\]\.?/, '');
  const segments = fieldPath.split('.').filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  return segments.map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
};

const stringifySdkFormName = (name?: Array<string | number>) => {
  if (!name || name.length === 0) {
    return '';
  }

  return name.map(String).join('.');
};

export const useDatasetSdkValidationFormSupport = ({
  activeTabKey,
  formRef,
  intl,
  sdkValidationDetails = [],
  sdkValidationFocus,
  showRules = false,
}: UseDatasetSdkValidationFormSupportOptions) => {
  const rootSdkFieldMessagesRef = useRef<
    Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
  >(new Map());

  const sdkValidationCountsByTab = useMemo(() => {
    return sdkValidationDetails.reduce<Record<string, number>>((accumulator, detail) => {
      if (!detail.tabName || !isSdkTabCountableDetail(detail)) {
        return accumulator;
      }

      accumulator[detail.tabName] = (accumulator[detail.tabName] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [sdkValidationDetails]);

  const sdkValidationSectionMessages = useMemo(() => {
    return sdkValidationDetails.reduce<Record<string, string[]>>((accumulator, detail) => {
      if (!isSdkSectionDetail(detail) || !detail.fieldPath) {
        return accumulator;
      }

      const messageText = getSdkSuggestedFixMessage(intl, detail);

      if (!messageText) {
        return accumulator;
      }

      if (!accumulator[detail.fieldPath]) {
        accumulator[detail.fieldPath] = [];
      }

      if (!accumulator[detail.fieldPath].includes(messageText)) {
        accumulator[detail.fieldPath].push(messageText);
      }

      return accumulator;
    }, {});
  }, [intl, sdkValidationDetails]);

  const sdkRootFieldMessages = useMemo(() => {
    return sdkValidationDetails.reduce<
      Map<string, { entries: SdkFieldMessageEntry[]; name: Array<string | number> }>
    >((accumulator, detail) => {
      if (!isSdkFieldDetail(detail)) {
        return accumulator;
      }

      const formName = parseSdkDetailFormName(detail);
      const serializedFormName = stringifySdkFormName(formName);
      const messageText = getSdkSuggestedFixMessage(intl, detail);

      if (!formName || !serializedFormName || !messageText) {
        return accumulator;
      }

      const messageEntry: SdkFieldMessageEntry = {
        text: messageText,
        validationCode: detail.validationCode,
      };
      const currentEntry = accumulator.get(serializedFormName);

      if (currentEntry) {
        if (
          !currentEntry.entries.some(
            (entry) =>
              entry.text === messageEntry.text &&
              entry.validationCode === messageEntry.validationCode,
          )
        ) {
          currentEntry.entries.push(messageEntry);
        }
        return accumulator;
      }

      accumulator.set(serializedFormName, {
        entries: [messageEntry],
        name: formName,
      });

      return accumulator;
    }, new Map());
  }, [intl, sdkValidationDetails]);

  useEffect(() => {
    const formInstance = formRef.current;

    if (
      !formInstance ||
      typeof formInstance.getFieldError !== 'function' ||
      typeof formInstance.setFields !== 'function'
    ) {
      return;
    }

    const previousEntries = rootSdkFieldMessagesRef.current;
    const nextEntries = sdkRootFieldMessages;
    const changedFieldData = new Set<string>();
    const fieldStates: Array<{ errors: string[]; name: Array<string | number> }> = [];
    const appliedEntries = new Map<
      string,
      { entries: SdkFieldMessageEntry[]; name: Array<string | number> }
    >();

    [...previousEntries.keys(), ...nextEntries.keys()].forEach((key) => {
      if (changedFieldData.has(key)) {
        return;
      }

      changedFieldData.add(key);

      const previousEntry = previousEntries.get(key);
      const nextEntry = nextEntries.get(key);
      const fieldName = (nextEntry?.name ?? previousEntry?.name)!;

      const existingErrors = [formInstance.getFieldError(fieldName)]
        .flat()
        .filter((errorMessage): errorMessage is string => typeof errorMessage === 'string');
      const previousSdkMessages = previousEntry?.entries.map((entry) => entry.text) ?? [];
      const retainedErrors = existingErrors.filter(
        (errorMessage: string) => !previousSdkMessages.includes(errorMessage),
      );
      const nextErrors = [...retainedErrors];
      const nextAppliedFieldEntries: SdkFieldMessageEntry[] = [];

      (nextEntry?.entries ?? []).forEach((entry) => {
        if (entry.validationCode === 'required_missing' && retainedErrors.length > 0) {
          return;
        }

        if (!nextErrors.includes(entry.text)) {
          nextErrors.push(entry.text);
        }

        nextAppliedFieldEntries.push(entry);
      });

      if (nextAppliedFieldEntries.length > 0) {
        appliedEntries.set(key, {
          entries: nextAppliedFieldEntries,
          name: fieldName,
        });
      }

      if (
        existingErrors.length === nextErrors.length &&
        existingErrors.every(
          (errorMessage: string, index: number) => errorMessage === nextErrors[index],
        )
      ) {
        return;
      }

      fieldStates.push({
        errors: nextErrors,
        name: fieldName,
      });
    });

    if (fieldStates.length > 0) {
      formInstance.setFields(fieldStates);
    }

    rootSdkFieldMessagesRef.current = appliedEntries;
  }, [formRef, showRules, sdkRootFieldMessages]);

  useEffect(() => {
    if (
      !sdkValidationFocus ||
      !isSdkFieldDetail(sdkValidationFocus) ||
      sdkValidationFocus.tabName !== activeTabKey
    ) {
      return;
    }

    const fieldName = parseSdkDetailFormName(sdkValidationFocus);
    const formInstance = formRef.current;

    if (!fieldName || !formInstance || typeof formInstance.scrollToField !== 'function') {
      return;
    }

    const timer = window.setTimeout(() => {
      formInstance.scrollToField(fieldName, { focus: true });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTabKey, formRef, sdkValidationFocus]);

  return {
    sdkValidationCountsByTab,
    sdkValidationSectionMessages,
  };
};
