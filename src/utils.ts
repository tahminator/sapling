/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export function _getOrCreateMap<T>(
  store: WeakMap<Function, Map<string, T>>,
  ctor: Function,
): Map<string, T> {
  const existing = store.get(ctor);
  if (existing) return existing;
  const created = new Map<string, T>();
  store.set(ctor, created);
  return created;
}
