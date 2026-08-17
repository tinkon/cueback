/**
 * Content objects: ContentRef (SPEC.md §8) and ResolvedContent (SPEC.md §9), plus
 * ContentType and the MatchBasis disclosure (SPEC.md §12).
 *
 * Core invariant: the assistant can discover content anywhere, but only a
 * Cueback server can declare it consumable. Discovery is open-ended;
 * consumption is catalog-grounded (SPEC.md §1).
 *
 * Cueback is media-neutral, so both ContentRef and ResolvedContent are
 * discriminated unions on `content_type`. V1 implements the podcast profile
 * only: the `article` variants are SCHEMA-ONLY — nothing resolves them, and
 * server paths reject article refs with `unsupported_content_type`
 * (see resolution.ts).
 */
import { z } from "zod";
import { ID_PREFIXES, idSchema } from "./ids.js";
/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);
/** Media profiles the protocol knows about. Only `podcast_episode` is implemented in V1. */
export const ContentTypeSchema = z.enum(["podcast_episode", "article"]);
/** The `content_type` values this package release knows variants for. */
export const KNOWN_CONTENT_TYPES = ContentTypeSchema.options;
/**
 * What a recommendation/search match was grounded in. V1 never generates
 * transcripts: `publisher_transcript` only when the publisher supplied one
 * via RSS / Podcasting 2.0 / a publisher page. Recommendations must disclose
 * this. Values may grow per medium (SPEC.md §12).
 */
export const MatchBasisSchema = z.enum(["metadata", "publisher_transcript"]);
/**
 * Assistant-side reference to a podcast episode, possibly unresolved
 * (SPEC.md §8). At least one identifying field (episode_id / guid /
 * feed_url / episode_url) must be present; title / show_title / published_at
 * are hints the resolver may fall back on, last in the spec's resolution
 * precedence (SPEC.md §8).
 */
const podcastEpisodeRefObject = z.object({
    content_type: z.literal("podcast_episode"),
    /** Catalog id, when the assistant already has one. */
    episode_id: idSchema(ID_PREFIXES.episode).optional(),
    /** RSS <guid> of the episode. Publisher-minted and often a URL, so URL-class cap (0.4). */
    guid: z.string().max(2000).optional(),
    /** Canonical RSS feed URL of the show. URL-class length ceiling (0.4). */
    feed_url: z.string().url().max(2000).optional(),
    /** Public episode page or enclosure URL found via web search. */
    episode_url: z.string().url().max(2000).optional(),
    /** Hint: episode title as discovered. */
    title: z.string().max(2000).optional(),
    /** Hint: show title as discovered. */
    show_title: z.string().max(2000).optional(),
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.string().max(64).optional(),
});
const PODCAST_REF_IDENTIFIER_MESSAGE = "podcast_episode ContentRef must include at least one of episode_id, guid, feed_url, episode_url";
function hasEpisodeIdentifier(ref) {
    return (ref.episode_id !== undefined ||
        ref.guid !== undefined ||
        ref.feed_url !== undefined ||
        ref.episode_url !== undefined);
}
/** The `podcast_episode` ContentRef variant, standalone (carries the ≥1-identifier rule). */
export const PodcastEpisodeRefSchema = podcastEpisodeRefObject.refine(hasEpisodeIdentifier, {
    message: PODCAST_REF_IDENTIFIER_MESSAGE,
});
/** The `article` ContentRef variant — SCHEMA-ONLY in V1 (SPEC.md §8). */
export const ArticleRefSchema = z.object({
    content_type: z.literal("article"),
    url: z.string().url().max(2000),
    title: z.string().max(2000).optional(),
    author: z.string().max(500).optional(),
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.string().max(64).optional(),
});
/**
 * The 0.3 extensibility fallback (SPEC.md §3 "add new content types", spelled
 * out at §8 "Unrecognized content"): a ContentRef/ResolvedContent whose
 * `content_type` this package
 * release does not know. It parses — a reading profile must be addable
 * WITHOUT a core release breaking 0.3 validators — and is treated as content
 * this consumer cannot handle: servers answer `unavailable` /
 * `unsupported_content_type`, apps render it unplayable. `.passthrough()`
 * keeps the unknown profile's fields intact for anything downstream that does
 * understand them. The refine excludes the known types so a MALFORMED known
 * ref (e.g. a podcast ref with no identifier) still fails validation instead
 * of sliding into the fallback.
 */
export const UnrecognizedContentSchema = z
    .object({ content_type: z.string().min(1).max(100) })
    .passthrough()
    .refine((value) => !KNOWN_CONTENT_TYPES.includes(value.content_type), {
    message: "known content_type must match its own variant",
});
/** The known 0.3 ContentRef variants, strict (producer-side validation). */
const knownContentRefSchema = z
    .discriminatedUnion("content_type", [podcastEpisodeRefObject, ArticleRefSchema])
    .superRefine((ref, ctx) => {
    if (ref.content_type === "podcast_episode" && !hasEpisodeIdentifier(ref)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: PODCAST_REF_IDENTIFIER_MESSAGE });
    }
});
export const ContentRefSchema = z.union([knownContentRefSchema, UnrecognizedContentSchema]);
/**
 * Narrow a ContentRef to the podcast profile's variant. Sound because the
 * unrecognized fallback refuses known content_type values, so anything whose
 * discriminator reads "podcast_episode" IS a PodcastEpisodeRef.
 */
export function isPodcastEpisodeRef(ref) {
    return ref.content_type === "podcast_episode";
}
/** Narrow a ContentRef to the (schema-only) article variant. */
export function isArticleRef(ref) {
    return ref.content_type === "article";
}
/**
 * Catalog-grounded podcast episode (SPEC.md §9) — only the server produces
 * these, after validation (feed exists, audio playable, deduped; SPEC.md §1).
 */
export const ResolvedPodcastEpisodeSchema = z.object({
    content_type: z.literal("podcast_episode"),
    episode_id: idSchema(ID_PREFIXES.episode),
    show_id: idSchema(ID_PREFIXES.show),
    title: z.string().max(2000),
    show_title: z.string().max(2000),
    /** Publisher editorial text (show notes); generous ceiling, larger than titles (0.4). */
    description: z.string().max(10000).optional(),
    duration_seconds: z.number().int().nonnegative(),
    published_at: isoTimestamp,
    artwork_url: z.string().url().max(2000).optional(),
    has_publisher_transcript: z.boolean(),
    /** Whether this user already consumed the episode (dedupe signal for curation). */
    already_listened: z.boolean(),
});
/** Resolved article — SCHEMA-ONLY in V1; no server path produces one. */
export const ResolvedArticleSchema = z.object({
    content_type: z.literal("article"),
    url: z.string().url().max(2000),
    title: z.string().max(2000),
    author: z.string().max(500).optional(),
    published_at: isoTimestamp.optional(),
    word_count: z.number().int().nonnegative().optional(),
});
export const ResolvedContentSchema = z.union([
    z.discriminatedUnion("content_type", [ResolvedPodcastEpisodeSchema, ResolvedArticleSchema]),
    UnrecognizedContentSchema,
]);
/** Narrow ResolvedContent to the podcast profile's variant (see isPodcastEpisodeRef). */
export function isResolvedPodcastEpisode(content) {
    return content.content_type === "podcast_episode";
}
//# sourceMappingURL=content.js.map