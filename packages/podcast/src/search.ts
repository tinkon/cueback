/**
 * EpisodeSearchResult (SPEC.md §6; MCP-TOOLS.md §1) — the podcast profile's
 * search row, the shape SPEC.md §22 item 5 requires a profile to define.
 *
 * Search is metadata FTS over the podcast catalog; `match_basis` discloses
 * whether the hit came from metadata or a publisher-supplied transcript (V1
 * never generates transcripts). MatchBasis itself is defined in
 * `@cueback/core` because the disclosure is generic across media; it is
 * re-exported here for the podcast profile's convenience.
 */
import { ID_PREFIXES, MatchBasisSchema, idSchema, tolerantEnum } from "@cueback/core";
import { z } from "zod";

export { MatchBasisSchema };
export type { MatchBasis } from "@cueback/core";

/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);

/** One row of `search_episodes` output (MCP-TOOLS.md §1). */
export const EpisodeSearchResultSchema = z.object({
  episode_id: idSchema(ID_PREFIXES.episode),
  title: z.string().max(2000),
  show_title: z.string().max(2000),
  duration_seconds: z.number().int().nonnegative(),
  published_at: isoTimestamp,
  /** A SNIPPET by definition; the reference server cuts at 240 chars (0.4 ceiling 500). */
  description_snippet: z.string().max(500),
  has_publisher_transcript: z.boolean(),
  /** Consumer-read disclosure: values may grow per medium, so it parses tolerantly. */
  match_basis: tolerantEnum(MatchBasisSchema),
});
export type EpisodeSearchResult = z.infer<typeof EpisodeSearchResultSchema>;
