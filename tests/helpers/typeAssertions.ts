/**
 * Utility types for compile-time assertions in tests.
 *
 * These helpers let us verify that TypeScript types match expected shapes
 * without emitting any runtime code.
 */

export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

export type ExpectTrue<T extends true> = T;

export type ExpectEqual<A, B> = Equal<A, B> extends true ? true : never;

export type ExpectAssignable<To, From> = From extends To ? true : never;
