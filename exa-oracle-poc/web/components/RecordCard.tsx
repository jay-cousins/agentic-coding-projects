import { OracleDatapoint } from "@/components/OracleDatapoint";
import type { OracleRecord } from "@/types/oracle";

export function RecordCard({ record }: { record: OracleRecord }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="font-semibold text-fg">{record.source}</h3>
        <time className="text-xs text-fg-muted" dateTime={record.fetched_at}>
          {new Date(record.fetched_at).toLocaleString()}
        </time>
      </div>
      <OracleDatapoint datapoint={record.datapoint} grounding={record.grounding} />
    </article>
  );
}
