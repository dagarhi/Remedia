import { useEffect, useState } from "react";

/*
 * Values kept for the whole app session, outside any component. A component's own state is
 * lost when React unmounts it (leaving the screen); this store survives that and is cleared
 * only when the app restarts (UI Design: library view options).
 */
const store = new Map<string, unknown>();

/** Like useState, but the value outlives the component until the app is closed. `key` must be unique. */
export function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));

  useEffect(() => {
    store.set(key, value);
  }, [key, value]);

  return [value, setValue];
}
