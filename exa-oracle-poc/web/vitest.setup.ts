// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// for the jsdom-environment component tests. Harmless to load for the
// node-environment lib/route tests too — it only adds matchers, doesn't touch
// globals those tests rely on.
import "@testing-library/jest-dom/vitest";
