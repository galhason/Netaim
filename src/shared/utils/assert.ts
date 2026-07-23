/**
 * Narrowing assertion for exhaustive switch handling. Guarantees at
 * compile time that every scene type and enum variant is handled.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled variant: ${String(value)}`);
};
