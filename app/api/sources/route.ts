import { json, PUBLIC_CACHE } from "../../../lib/http";
import { sources } from "../../../lib/sources";

/** Authoritative sources index as JSON. Lists verified primary/secondary research references. */
export function GET() {
  return json(
    {
      count: sources.length,
      sources,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
