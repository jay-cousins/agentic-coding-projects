import Exa from "exa-js";
import type { Datapoint, Grounding } from "@/types/oracle";

interface FetchedDatapoint {
  datapoint: Datapoint;
  grounding: Grounding[];
}

// Exa's `output.content` is typed as `string | Record<string, unknown> | null` —
// it only matches our Datapoint shape (Record<string, string>) when Exa
// successfully validated against outputSchema. Guard and coerce rather than
// casting, so a fallback/unstructured response fails loudly here instead of
// crashing React with "Objects are not valid as a React child" at render time.
function toDatapoint(content: string | Record<string, unknown> | null | undefined): Datapoint {
  if (!content || typeof content !== "object") {
    throw new Error("Exa search did not return structured output matching the schema");
  }
  const datapoint: Datapoint = {};
  for (const [field, value] of Object.entries(content)) {
    if (typeof value === "string") {
      datapoint[field] = value;
    } else if (value === null || value === undefined) {
      datapoint[field] = "";
    } else if (typeof value === "object") {
      datapoint[field] = JSON.stringify(value);
    } else {
      datapoint[field] = String(value);
    }
  }
  return datapoint;
}

interface ObjectOutputSchema {
  type: "object";
  required: string[];
  properties: Record<string, unknown>;
}

function getClient(): Exa {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY not set (see .env.example)");
  }
  return new Exa(apiKey);
}

async function fetchDatapoint(
  query: string,
  outputSchema: ObjectOutputSchema,
  systemPrompt: string,
  includeDomains: string[],
  maxAgeHours = 1
): Promise<FetchedDatapoint> {
  const exa = getClient();
  const response = await exa.search(query, {
    type: "neural",
    systemPrompt,
    outputSchema,
    includeDomains,
    contents: { highlights: true, maxAgeHours },
  });

  if (!response.output) {
    throw new Error("Exa search did not return synthesized output");
  }

  return {
    datapoint: toDatapoint(response.output.content),
    grounding: response.output.grounding ?? [],
  };
}

// Mirrors web_scrape_source.py's US_OPEN_SCHEMA
const US_OPEN_SCHEMA: ObjectOutputSchema = {
  type: "object",
  required: ["event", "winner", "score"],
  properties: {
    event: {
      type: "string",
      description: "Name of the event, e.g. 'US Open Men's Singles Final'",
    },
    winner: { type: "string", description: "Name of the winning player" },
    score: { type: "string", description: "Final match score" },
  },
};

// Mirrors web_scrape_source.py's COPERNICUS_SCHEMA
const COPERNICUS_SCHEMA: ObjectOutputSchema = {
  type: "object",
  required: ["headline", "value", "period"],
  properties: {
    headline: { type: "string", description: "Headline finding of the bulletin" },
    value: {
      type: "string",
      description: "Key reported figure, e.g. a temperature anomaly",
    },
    period: { type: "string", description: "Time period the report covers" },
  },
};

// TS port of fetch_us_open_result() in web_scrape_source.py
export function fetchUsOpenResult(): Promise<FetchedDatapoint> {
  return fetchDatapoint(
    "US Open tennis 2025 singles final result winner score",
    US_OPEN_SCHEMA,
    "Prefer usopen.org and atptour.com. Return only confirmed final results, not predictions.",
    ["usopen.org", "atptour.com"]
  );
}

// TS port of fetch_copernicus_climate_bulletin() in web_scrape_source.py
export function fetchCopernicusBulletin(): Promise<FetchedDatapoint> {
  return fetchDatapoint(
    "Copernicus Climate Change Service latest monthly global temperature bulletin",
    COPERNICUS_SCHEMA,
    "Prefer climate.copernicus.eu. Report the most recently published bulletin only.",
    ["climate.copernicus.eu"]
  );
}
