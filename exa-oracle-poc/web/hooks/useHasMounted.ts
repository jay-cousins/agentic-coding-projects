import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// The server can't know client-only state (theme, sessionStorage), so it always
// renders as "not yet mounted". useSyncExternalStore lets the client value differ
// from the server snapshot on the first paint without a hydration mismatch.
export function useHasMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
