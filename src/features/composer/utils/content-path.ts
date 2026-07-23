export const getAtPath = (content: unknown, path: string): string => {
  const value = path
    .split('.')
    .reduce<unknown>(
      (current, key) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[key]
          : undefined,
      content,
    );
  return typeof value === 'string' ? value : '';
};

export const setAtPath = (
  content: unknown,
  path: string,
  value: string,
): unknown => {
  const keys = path.split('.');
  const head = keys[0];

  if (!head) {
    return content;
  }

  const base =
    typeof content === 'object' && content !== null
      ? (content as Record<string, unknown>)
      : {};

  if (keys.length === 1) {
    return { ...base, [head]: value };
  }

  return {
    ...base,
    [head]: setAtPath(base[head], keys.slice(1).join('.'), value),
  };
};
