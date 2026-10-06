// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PENDING_TTL_MS } from "@/lib/pendingTtl";
import type { OracleRecord, PendingRecord } from "@/types/oracle";

const { postJsonMock } = vi.hoisted(() => ({ postJsonMock: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ postJson: postJsonMock }));

// Mirrors the private PENDING_STORAGE_KEY constant in OracleApp.tsx (not
// exported), so the seeding helpers below write to the same sessionStorage
// slot the component reads from.
const STORAGE_KEY = "oracle-pending-results";

function makeRecord(overrides: Partial<PendingRecord> = {}): PendingRecord {
  return {
    id: "rec-1",
    source: "US Open",
    fetched_at: "2026-01-01T00:00:00.000Z",
    datapoint: { winner: "A" },
    grounding: [],
    ...overrides,
  };
}

function seedStorage(entries: { record: PendingRecord; stagedAt: number }[]) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// OracleApp keeps its parsed sessionStorage snapshot in a module-level
// variable (`cachedStoredPending`) that is populated once per module
// instance and never invalidated in-process — by design, it only resets on
// a real page reload (a fresh module instance). To keep tests isolated from
// one another, every test below gets its own module instance via
// vi.resetModules() + a fresh dynamic import (one test, "caches the parsed
// snapshot across remounts", deliberately reuses a single instance to
// exercise that persistence).
let OracleApp: typeof import("@/components/OracleApp").OracleApp;

beforeEach(async () => {
  vi.resetModules();
  postJsonMock.mockReset();
  window.sessionStorage.clear();
  ({ OracleApp } = await import("@/components/OracleApp"));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("OracleApp mount / sessionStorage adoption", () => {
  it("adopts a fresh sessionStorage snapshot on mount", () => {
    seedStorage([{ record: makeRecord(), stagedAt: Date.now() }]);

    render(<OracleApp initialRecords={[]} />);

    expect(screen.getByText("US Open")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });

  it("falls back to no pending items when sessionStorage is empty", () => {
    render(<OracleApp initialRecords={[]} />);

    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
    expect(screen.getByText("No oracle records yet. Trigger a search above.")).toBeInTheDocument();
  });

  it("falls back to no pending items when sessionStorage holds invalid JSON", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not-json");

    expect(() => render(<OracleApp initialRecords={[]} />)).not.toThrow();
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });

  it("falls back to no pending items when sessionStorage holds valid JSON that isn't an array", () => {
    // Valid JSON, so JSON.parse succeeds; `.filter` on a non-array is what
    // must be caught here.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ oops: true }));

    expect(() => render(<OracleApp initialRecords={[]} />)).not.toThrow();
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });
});

describe("OracleApp TTL freshness filtering", () => {
  it("keeps entries within PENDING_TTL_MS and drops entries past it", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const fresh = makeRecord({ id: "fresh", source: "Fresh Source" });
    const stale = makeRecord({ id: "stale", source: "Stale Source" });
    seedStorage([
      { record: fresh, stagedAt: now - (PENDING_TTL_MS - 1_000) },
      { record: stale, stagedAt: now - (PENDING_TTL_MS + 1_000) },
    ]);

    render(<OracleApp initialRecords={[]} />);

    expect(screen.getByText("Fresh Source")).toBeInTheDocument();
    expect(screen.queryByText("Stale Source")).not.toBeInTheDocument();
  });

  it("renders no pending section at all when every stored entry is stale", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    seedStorage([{ record: makeRecord(), stagedAt: now - PENDING_TTL_MS - 1 }]);

    render(<OracleApp initialRecords={[]} />);

    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });
});

describe("OracleApp module-level cache", () => {
  it("does not re-read sessionStorage on a later mount within the same module instance", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const first = makeRecord({ id: "first", source: "First Source" });
    seedStorage([{ record: first, stagedAt: now }]);

    const { unmount } = render(<OracleApp initialRecords={[]} />);
    expect(screen.getByText("First Source")).toBeInTheDocument();
    unmount();

    // A different snapshot is written before the next mount — simulating,
    // e.g., another tab updating sessionStorage. Because
    // getStoredPendingSnapshot() memoizes into module-level
    // `cachedStoredPending`, this second mount (same module instance, no
    // resetModules) must NOT pick it up.
    const second = makeRecord({ id: "second", source: "Second Source" });
    seedStorage([{ record: second, stagedAt: now }]);

    render(<OracleApp initialRecords={[]} />);

    expect(screen.getByText("First Source")).toBeInTheDocument();
    expect(screen.queryByText("Second Source")).not.toBeInTheDocument();
  });
});

describe("OracleApp mount-once adoption guard", () => {
  it("adopts the stored snapshot exactly once — a later state update doesn't re-adopt a rejected item", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    seedStorage([{ record: makeRecord({ id: "r1", source: "US Open" }), stagedAt: now }]);
    postJsonMock.mockResolvedValueOnce(undefined);

    render(<OracleApp initialRecords={[]} />);
    expect(screen.getByText("US Open")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findByText("No oracle records yet. Trigger a search above.");

    // If adoption fired on every render (instead of once, guarded by
    // `hasMounted && !adoptedStored`), the setPending() from rejecting would
    // trigger a re-render that re-runs getStoredPendingSnapshot() and puts
    // the just-rejected card right back.
    expect(screen.queryByText("US Open")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });
});

describe("OracleApp approve / reject flows", () => {
  it("reject: removes the item from pending and calls the reject endpoint", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    seedStorage([{ record: makeRecord({ id: "r1", source: "US Open" }), stagedAt: now }]);
    postJsonMock.mockResolvedValueOnce(undefined);

    render(<OracleApp initialRecords={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await screen.findByText("No oracle records yet. Trigger a search above.");
    expect(postJsonMock).toHaveBeenCalledWith(
      "/api/search/reject",
      { id: "r1" },
      { fallbackMessage: "Failed to reject." }
    );
  });

  it("approve: removes the item from pending, calls the approve endpoint, and prepends the saved record", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const record = makeRecord({ id: "r1", source: "US Open" });
    seedStorage([{ record, stagedAt: now }]);
    const existing: OracleRecord = {
      source: "Existing",
      fetched_at: "2025-12-01T00:00:00.000Z",
      datapoint: {},
      grounding: [],
    };
    const saved: PendingRecord = { ...record, fetched_at: "2026-01-01T00:00:01.000Z" };
    postJsonMock.mockResolvedValueOnce({ record: saved });

    render(<OracleApp initialRecords={[existing]} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve & Save" }));

    await screen.findByText("Existing");
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
    expect(postJsonMock).toHaveBeenCalledWith(
      "/api/search/approve",
      { id: "r1" },
      {
        errorMessages: { expired_or_not_found: "This pending result has expired — please search again." },
        fallbackMessage: "Failed to save.",
      }
    );

    // The approved record is prepended ahead of the pre-existing one.
    const headings = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(headings).toEqual(["US Open", "Existing"]);
  });

  it("leaves the pending item in place and surfaces an error message when approve fails", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    seedStorage([{ record: makeRecord({ id: "r1", source: "US Open" }), stagedAt: now }]);
    postJsonMock.mockRejectedValueOnce(new Error("This pending result has expired — please search again."));

    render(<OracleApp initialRecords={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve & Save" }));

    await screen.findByText("This pending result has expired — please search again.");
    expect(screen.getByText("US Open")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });
});
