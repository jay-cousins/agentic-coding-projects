// Shared between the server-side pending store (lib/pendingStore.ts) and the
// client-side sessionStorage mirror (components/OracleApp.tsx) so a reload
// can't show a pending card the server has already evicted.
export const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes
