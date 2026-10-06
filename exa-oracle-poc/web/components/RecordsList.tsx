import { RecordCard } from "@/components/RecordCard";
import type { OracleRecord } from "@/types/oracle";

export function RecordsList({ records }: { records: OracleRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-fg-muted">No oracle records yet. Trigger a search above.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {records.map((record, index) => (
        // The shared JSONL log has no id field, and source+fetched_at isn't
        // guaranteed unique (two sources could resolve to the same instant).
        // `records` is a fixed array from the server plus prepended approvals,
        // never reordered or filtered, so the index is stable per item here.
        <RecordCard key={`${record.source}-${record.fetched_at}-${index}`} record={record} />
      ))}
    </div>
  );
}
