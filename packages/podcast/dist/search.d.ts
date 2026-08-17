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
import { MatchBasisSchema } from "@cueback/core";
import { z } from "zod";
export { MatchBasisSchema };
export type { MatchBasis } from "@cueback/core";
/** One row of `search_episodes` output (MCP-TOOLS.md §1). */
export declare const EpisodeSearchResultSchema: z.ZodObject<{
    episode_id: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodString;
    show_title: z.ZodString;
    duration_seconds: z.ZodNumber;
    published_at: z.ZodString;
    /** A SNIPPET by definition; the reference server cuts at 240 chars (0.4 ceiling 500). */
    description_snippet: z.ZodString;
    has_publisher_transcript: z.ZodBoolean;
    /** Consumer-read disclosure: values may grow per medium, so it parses tolerantly. */
    match_basis: z.ZodType<import("@cueback/core").Tolerant<"metadata" | "publisher_transcript">, z.ZodTypeDef, import("@cueback/core").Tolerant<"metadata" | "publisher_transcript">>;
}, "strip", z.ZodTypeAny, {
    episode_id: string;
    title: string;
    show_title: string;
    duration_seconds: number;
    published_at: string;
    description_snippet: string;
    has_publisher_transcript: boolean;
    match_basis: import("@cueback/core").Tolerant<"metadata" | "publisher_transcript">;
}, {
    episode_id: string;
    title: string;
    show_title: string;
    duration_seconds: number;
    published_at: string;
    description_snippet: string;
    has_publisher_transcript: boolean;
    match_basis: import("@cueback/core").Tolerant<"metadata" | "publisher_transcript">;
}>;
export type EpisodeSearchResult = z.infer<typeof EpisodeSearchResultSchema>;
