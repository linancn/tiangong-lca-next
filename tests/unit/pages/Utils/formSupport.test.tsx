import type { ValidationIssueSdkDetail } from '@/pages/Utils/review';
import type { ProFormInstance } from '@ant-design/pro-components';
import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { act } from 'react';

import {
  useDatasetSdkValidationFormSupport,
  validateVisibleFormFields,
} from '@/pages/Utils/validation/formSupport';

type FormErrorMap = Map<string, string[]>;

const stringifyFieldName = (name: Array<string | number>) => name.map(String).join('.');

const createFormRef = (initialErrors?: Record<string, string[]>) => {
  const errorMap: FormErrorMap = new Map(
    Object.entries(initialErrors ?? {}).map(([fieldName, errors]) => [fieldName, [...errors]]),
  );
  const setFields = jest.fn((fields: Array<{ errors: string[]; name: Array<string | number> }>) => {
    fields.forEach((field) => {
      errorMap.set(stringifyFieldName(field.name), [...field.errors]);
    });
  });
  const scrollToField = jest.fn();
  const formInstance = {
    getFieldError: jest.fn((name: Array<string | number>) => {
      return errorMap.get(stringifyFieldName(name)) ?? [];
    }),
    scrollToField,
    setFields,
  } as unknown as ProFormInstance;

  return {
    errorMap,
    formRef: { current: formInstance } as MutableRefObject<ProFormInstance | undefined>,
    scrollToField,
    setFields,
  };
};

const createSdkDetail = (
  overrides: Partial<ValidationIssueSdkDetail> &
    Pick<ValidationIssueSdkDetail, 'fieldPath' | 'key' | 'validationCode'>,
): ValidationIssueSdkDetail => {
  const { fieldPath, key, validationCode, ...restOverrides } = overrides;

  return {
    fieldLabel: 'Field',
    fieldPath,
    key,
    reasonMessage: 'Validation failed',
    validationCode,
    ...restOverrides,
  };
};

const intl = {
  formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
    defaultMessage ?? id,
};

describe('useDatasetSdkValidationFormSupport', () => {
  it('waits for the next animation frame before validating by default', async () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const validateFields = jest.fn().mockResolvedValue(undefined);
    const onSettled = jest.fn();
    const formRef = {
      current: {
        validateFields,
      },
    } as unknown as MutableRefObject<ProFormInstance | undefined>;
    const animationFrameCallbacks: FrameRequestCallback[] = [];

    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    }) as typeof requestAnimationFrame;

    const validationPromise = validateVisibleFormFields(formRef, {
      onSettled,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateFields).not.toHaveBeenCalled();
    expect(animationFrameCallbacks).toHaveLength(1);

    act(() => {
      animationFrameCallbacks.shift()?.(0);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateFields).toHaveBeenCalledTimes(1);
    expect(animationFrameCallbacks).toHaveLength(1);

    act(() => {
      animationFrameCallbacks.shift()?.(0);
    });

    await validationPromise;

    expect(validateFields).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledTimes(1);

    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('runs form validation side effects even when validateFields rejects', async () => {
    const onSettled = jest.fn();
    const formRef = {
      current: {
        validateFields: jest.fn().mockRejectedValue(new Error('invalid')),
      },
    } as unknown as MutableRefObject<ProFormInstance | undefined>;

    await validateVisibleFormFields(formRef, {
      onSettled,
      waitForPaint: false,
    });

    expect(formRef.current?.validateFields).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('falls back to Promise and setTimeout scheduling when browser helpers are unavailable', async () => {
    const originalQueueMicrotask = globalThis.queueMicrotask;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const validateFields = jest.fn().mockResolvedValue(undefined);
    const onSettled = jest.fn();
    const formRef = {
      current: {
        validateFields,
      },
    } as unknown as MutableRefObject<ProFormInstance | undefined>;

    jest.useFakeTimers();
    // @ts-expect-error intentionally testing the fallback branch
    globalThis.queueMicrotask = undefined;
    // @ts-expect-error intentionally testing the fallback branch
    globalThis.requestAnimationFrame = undefined;

    const validationPromise = validateVisibleFormFields(formRef, {
      onSettled,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateFields).not.toHaveBeenCalled();

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(validateFields).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await validationPromise;

    expect(validateFields).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledTimes(1);

    globalThis.queueMicrotask = originalQueueMicrotask;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    jest.useRealTimers();
  });

  it('counts section details by tab while skipping highlight-only markers', () => {
    const { formRef } = createFormRef();
    const { result } = renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'flowProperties',
        formRef,
        intl,
        sdkValidationDetails: [
          createSdkDetail({
            fieldPath: 'flowInformation.dataSetInformation.common:name.0.#text',
            formName: ['flowInformation', 'dataSetInformation', 'common:name', 0, '#text'],
            key: 'field-detail',
            suggestedFix: 'Fill in the required value for this field.',
            tabName: 'flowInformation',
            validationCode: 'required_missing',
          }),
          createSdkDetail({
            fieldPath: 'flowProperties',
            key: 'section-detail',
            presentation: 'section',
            suggestedFix: 'Select one quantitative reference.',
            tabName: 'flowProperties',
            validationCode: 'custom',
          }),
          createSdkDetail({
            fieldPath: 'flowProperties[#fp-1].meanValue',
            key: 'highlight-detail',
            presentation: 'highlight-only',
            tabName: 'flowProperties',
            validationCode: 'custom',
          }),
        ],
      }),
    );

    expect(result.current.sdkValidationCountsByTab).toEqual({
      flowInformation: 1,
      flowProperties: 1,
    });
    expect(result.current.sdkValidationSectionMessages).toEqual({
      flowProperties: ['Select one quantitative reference'],
    });
  });

  it('supports omitted sdk detail arrays via the default hook parameters', () => {
    const { formRef } = createFormRef();
    const { result } = renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'sourceInformation',
        formRef,
        intl,
      }),
    );

    expect(result.current.sdkValidationCountsByTab).toEqual({});
    expect(result.current.sdkValidationSectionMessages).toEqual({});
  });

  it('does not duplicate required sdk messages when local form rules already failed', () => {
    const { formRef, setFields } = createFormRef({
      'contactInformation.dataSetInformation.common:name.0.#text': ['Name is required'],
    });

    renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'contactInformation',
        formRef,
        intl,
        sdkValidationDetails: [
          createSdkDetail({
            fieldPath: 'contactInformation.dataSetInformation.common:name.0.#text',
            formName: ['contactInformation', 'dataSetInformation', 'common:name', 0, '#text'],
            key: 'contact-name-required',
            suggestedFix: 'Fill in the required value for this field.',
            tabName: 'contactInformation',
            validationCode: 'required_missing',
          }),
        ],
      }),
    );

    expect(setFields).not.toHaveBeenCalled();
    expect(
      formRef.current?.getFieldError([
        'contactInformation',
        'dataSetInformation',
        'common:name',
        0,
        '#text',
      ]),
    ).toEqual(['Name is required']);
  });

  it('clears stale sdk errors while preserving non-sdk errors on rerender', () => {
    const { formRef, errorMap, setFields } = createFormRef({
      'sourceInformation.dataSetInformation.common:shortName.0.#text': ['Existing local error'],
    });

    const detail = createSdkDetail({
      fieldPath: 'sourceInformation.dataSetInformation.common:shortName.0.#text',
      formName: [
        'sourceInformation',
        'dataSetInformation',
        'common:shortName',
        0,
        '#text',
      ] as Array<string | number>,
      key: 'source-short-name-length',
      reasonMessage: 'Text length 1 is below minimum 2',
      suggestedFix: 'Expand this text to at least 2 characters.',
      tabName: 'sourceInformation',
      validationCode: 'string_too_short',
      validationParams: {
        actualLength: 1,
        minimum: 2,
      },
    });

    const { rerender } = renderHook(
      (sdkValidationDetails: any[]) =>
        useDatasetSdkValidationFormSupport({
          activeTabKey: 'sourceInformation',
          formRef,
          intl,
          sdkValidationDetails,
        }),
      {
        initialProps: [detail],
      },
    );

    expect(setFields).toHaveBeenCalledWith([
      {
        errors: ['Existing local error', 'Expand this text to at least 2 characters'],
        name: ['sourceInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
      },
    ]);
    expect(errorMap.get('sourceInformation.dataSetInformation.common:shortName.0.#text')).toEqual([
      'Existing local error',
      'Expand this text to at least 2 characters',
    ]);

    setFields.mockClear();

    rerender([]);

    expect(setFields).toHaveBeenCalledWith([
      {
        errors: ['Existing local error'],
        name: ['sourceInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
      },
    ]);
    expect(errorMap.get('sourceInformation.dataSetInformation.common:shortName.0.#text')).toEqual([
      'Existing local error',
    ]);
  });

  it('dedupes repeated sdk field entries and skips redundant updates on rerender', () => {
    const { formRef, setFields } = createFormRef();
    const details = [
      createSdkDetail({
        fieldPath: 'sourceInformation.dataSetInformation.common:shortName.0.#text',
        formName: ['sourceInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
        key: 'duplicate-source-short-name-1',
        reasonMessage: 'Text length 1 is below minimum 2',
        suggestedFix: 'Expand this text to at least 2 characters.',
        tabName: 'sourceInformation',
        validationCode: 'string_too_short',
        validationParams: {
          actualLength: 1,
          minimum: 2,
        },
      }),
      createSdkDetail({
        fieldPath: 'sourceInformation.dataSetInformation.common:shortName.0.#text',
        formName: ['sourceInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
        key: 'duplicate-source-short-name-2',
        reasonMessage: 'Text length 1 is below minimum 2',
        suggestedFix: 'Expand this text to at least 2 characters.',
        tabName: 'sourceInformation',
        validationCode: 'string_too_short',
        validationParams: {
          actualLength: 1,
          minimum: 2,
        },
      }),
    ];

    const { rerender } = renderHook(
      (sdkValidationDetails: ValidationIssueSdkDetail[]) =>
        useDatasetSdkValidationFormSupport({
          activeTabKey: 'sourceInformation',
          formRef,
          intl,
          sdkValidationDetails,
        }),
      {
        initialProps: details,
      },
    );

    expect(setFields).toHaveBeenCalledWith([
      {
        errors: ['Expand this text to at least 2 characters'],
        name: ['sourceInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
      },
    ]);

    setFields.mockClear();
    rerender([...details]);

    expect(setFields).not.toHaveBeenCalled();
  });

  it('parses numeric field-path segments and preserves distinct sdk messages for one field', () => {
    const { formRef, setFields } = createFormRef();

    renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'sourceInformation',
        formRef,
        intl,
        sdkValidationDetails: [
          createSdkDetail({
            fieldPath: 'sourceInformation.classification.0.name',
            key: 'parsed-field-path-1',
            suggestedFix: 'Fix the parsed field.',
            tabName: 'sourceInformation',
            validationCode: 'custom',
          }),
          createSdkDetail({
            fieldPath: 'sourceInformation.classification.0.name',
            key: 'parsed-field-path-2',
            suggestedFix: 'Use a longer parsed value.',
            tabName: 'sourceInformation',
            validationCode: 'string_too_short',
          }),
        ],
      }),
    );

    expect(setFields).toHaveBeenCalledWith([
      {
        errors: ['Fix the parsed field', 'Use a longer parsed value'],
        name: ['sourceInformation', 'classification', 0, 'name'],
      },
    ]);
  });

  it('skips blank section messages and safely ignores invalid form refs and empty parsed paths', () => {
    const blankIntl = {
      formatMessage: ({ id, defaultMessage }: { defaultMessage?: string; id: string }) => {
        if (id.endsWith('.custom')) {
          return '';
        }

        return defaultMessage ?? id;
      },
    };
    const badFormRef = {
      current: {
        setFields: jest.fn(),
      },
    } as unknown as MutableRefObject<ProFormInstance | undefined>;

    const { result } = renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'sourceInformation',
        formRef: badFormRef,
        intl: blankIntl,
        sdkValidationDetails: [
          createSdkDetail({
            fieldPath: 'sourceInformation.section',
            key: 'blank-section-copy',
            presentation: 'section',
            suggestedFix: undefined,
            tabName: 'sourceInformation',
            validationCode: 'custom',
          }),
          createSdkDetail({
            fieldPath: 'sourceInformation[#source-1].',
            key: 'empty-field-path',
            suggestedFix: 'Fill in the required value for this field.',
            tabName: 'sourceInformation',
            validationCode: 'required_missing',
          }),
        ],
      }),
    );

    expect(result.current.sdkValidationSectionMessages).toEqual({});
    expect(badFormRef.current?.setFields).not.toHaveBeenCalled();
  });

  it('scrolls to the focused sdk field on the active tab', () => {
    jest.useFakeTimers();
    const { formRef, scrollToField } = createFormRef();

    renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'administrativeInformation',
        formRef,
        intl,
        sdkValidationDetails: [],
        sdkValidationFocus: createSdkDetail({
          fieldPath:
            'administrativeInformation.dataEntryBy.common:referenceToPersonOrEntityEnteringTheData.@refObjectId',
          formName: [
            'administrativeInformation',
            'dataEntryBy',
            'common:referenceToPersonOrEntityEnteringTheData',
            '@refObjectId',
          ],
          key: 'focus-detail',
          suggestedFix: 'Select a contact reference.',
          tabName: 'administrativeInformation',
          validationCode: 'required_missing',
        }),
      }),
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(scrollToField).toHaveBeenCalledWith(
      [
        'administrativeInformation',
        'dataEntryBy',
        'common:referenceToPersonOrEntityEnteringTheData',
        '@refObjectId',
      ],
      { focus: true },
    );

    jest.useRealTimers();
  });

  it('does not scroll when the focused sdk detail cannot resolve to a visible field', () => {
    jest.useFakeTimers();
    const { formRef, scrollToField } = createFormRef();

    renderHook(() =>
      useDatasetSdkValidationFormSupport({
        activeTabKey: 'sourceInformation',
        formRef,
        intl,
        sdkValidationDetails: [],
        sdkValidationFocus: createSdkDetail({
          fieldPath: '',
          key: 'focus-empty-field-path',
          suggestedFix: 'Fill in the required value for this field.',
          tabName: 'sourceInformation',
          validationCode: 'required_missing',
        }),
      }),
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(scrollToField).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
