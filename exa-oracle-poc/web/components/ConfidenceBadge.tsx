import type { Confidence } from "@/types/oracle";

const CLASSES: Record<Confidence, string> = {
  high: "bg-confidence-high-bg text-confidence-high-fg",
  medium: "bg-confidence-medium-bg text-confidence-medium-fg",
  low: "bg-confidence-low-bg text-confidence-low-fg",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const classes = CLASSES[confidence] ?? CLASSES.low;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {confidence} confidence
    </span>
  );
}
