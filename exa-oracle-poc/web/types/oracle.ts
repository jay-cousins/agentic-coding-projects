export type Confidence = "low" | "medium" | "high";

export interface Citation {
  url: string;
  title: string;
}

export interface Grounding {
  field: string;
  citations: Citation[];
  confidence: Confidence;
}

export type Datapoint = Record<string, string>;

export interface OracleRecord {
  source: string;
  fetched_at: string;
  datapoint: Datapoint;
  grounding: Grounding[];
}

export interface PendingRecord extends OracleRecord {
  id: string;
}

export type SourceKey = "us_open" | "copernicus";

export const SOURCE_LABELS: Record<SourceKey, string> = {
  us_open: "US Open",
  copernicus: "Copernicus",
};
