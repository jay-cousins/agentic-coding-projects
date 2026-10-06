"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
      <h2 className="text-lg font-semibold text-fg">Couldn&apos;t load oracle records</h2>
      <p className="text-sm text-fg-muted">{error.message || "Something went wrong reading oracle_output.jsonl."}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
      >
        Try again
      </button>
    </div>
  );
}
