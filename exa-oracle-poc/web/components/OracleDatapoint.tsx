import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { Datapoint, Grounding } from "@/types/oracle";

export function OracleDatapoint({
  datapoint,
  grounding,
}: {
  datapoint: Datapoint;
  grounding: Grounding[];
}) {
  const groundingByField = new Map(grounding.map((g) => [g.field, g]));

  return (
    <dl className="flex flex-col gap-4">
      {Object.entries(datapoint).map(([field, value]) => {
        const fieldGrounding = groundingByField.get(field);
        return (
          <div key={field} className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {field}
            </dt>
            <dd className="text-fg">{value}</dd>
            {fieldGrounding ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ConfidenceBadge confidence={fieldGrounding.confidence} />
                {fieldGrounding.citations.map((citation) => (
                  <a
                    key={citation.url}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                  >
                    {citation.title}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}
