import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-fg">Oracle</h1>
          <p className="text-sm text-fg-muted">EXA-sourced, source-grounded datapoints</p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
