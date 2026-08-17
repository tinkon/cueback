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
/** Media profiles the protocol knows about. Only `podcast_episode` is implemented in V1. */
export declare const ContentTypeSchema: z.ZodEnum<["podcast_episode", "article"]>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
/** The `content_type` values this package release knows variants for. */
export declare const KNOWN_CONTENT_TYPES: readonly string[];
/**
 * What a recommendation/search match was grounded in. V1 never generates
 * transcripts: `publisher_transcript` only when the publisher supplied one
 * via RSS / Podcasting 2.0 / a publisher page. Recommendations must disclose
 * this. Values may grow per medium (SPEC.md §12).
 */
export declare const MatchBasisSchema: z.ZodEnum<["metadata", "publisher_transcript"]>;
export type MatchBasis = z.infer<typeof MatchBasisSchema>;
/** The `podcast_episode` ContentRef variant, standalone (carries the ≥1-identifier rule). */
export declare const PodcastEpisodeRefSchema: z.ZodEffects<z.ZodObject<{
    content_type: z.ZodLiteral<"podcast_episode">;
    /** Catalog id, when the assistant already has one. */
    episode_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** RSS <guid> of the episode. Publisher-minted and often a URL, so URL-class cap (0.4). */
    guid: z.ZodOptional<z.ZodString>;
    /** Canonical RSS feed URL of the show. URL-class length ceiling (0.4). */
    feed_url: z.ZodOptional<z.ZodString>;
    /** Public episode page or enclosure URL found via web search. */
    episode_url: z.ZodOptional<z.ZodString>;
    /** Hint: episode title as discovered. */
    title: z.ZodOptional<z.ZodString>;
    /** Hint: show title as discovered. */
    show_title: z.ZodOptional<z.ZodString>;
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}>, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}>;
export type PodcastEpisodeRef = z.infer<typeof PodcastEpisodeRefSchema>;
/** The `article` ContentRef variant — SCHEMA-ONLY in V1 (SPEC.md §8). */
export declare const ArticleRefSchema: z.ZodObject<{
    content_type: z.ZodLiteral<"article">;
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}, {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}>;
export type ArticleRef = z.infer<typeof ArticleRefSchema>;
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
export declare const UnrecognizedContentSchema: z.ZodEffects<z.ZodObject<{
    content_type: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type UnrecognizedContent = z.infer<typeof UnrecognizedContentSchema>;
export declare const ContentRefSchema: z.ZodUnion<[z.ZodEffects<z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
    content_type: z.ZodLiteral<"podcast_episode">;
    /** Catalog id, when the assistant already has one. */
    episode_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** RSS <guid> of the episode. Publisher-minted and often a URL, so URL-class cap (0.4). */
    guid: z.ZodOptional<z.ZodString>;
    /** Canonical RSS feed URL of the show. URL-class length ceiling (0.4). */
    feed_url: z.ZodOptional<z.ZodString>;
    /** Public episode page or enclosure URL found via web search. */
    episode_url: z.ZodOptional<z.ZodString>;
    /** Hint: episode title as discovered. */
    title: z.ZodOptional<z.ZodString>;
    /** Hint: show title as discovered. */
    show_title: z.ZodOptional<z.ZodString>;
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
}>, z.ZodObject<{
    content_type: z.ZodLiteral<"article">;
    url: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    /** Hint: publication date/time as discovered (ISO 8601 date or datetime). */
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}, {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}>]>, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
} | {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id?: string | undefined;
    guid?: string | undefined;
    feed_url?: string | undefined;
    episode_url?: string | undefined;
    title?: string | undefined;
    show_title?: string | undefined;
    published_at?: string | undefined;
} | {
    content_type: "article";
    url: string;
    title?: string | undefined;
    published_at?: string | undefined;
    author?: string | undefined;
}>, z.ZodEffects<z.ZodObject<{
    content_type: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>]>;
export type ContentRef = z.infer<typeof ContentRefSchema>;
/**
 * Narrow a ContentRef to the podcast profile's variant. Sound because the
 * unrecognized fallback refuses known content_type values, so anything whose
 * discriminator reads "podcast_episode" IS a PodcastEpisodeRef.
 */
export declare function isPodcastEpisodeRef(ref: ContentRef): ref is PodcastEpisodeRef;
/** Narrow a ContentRef to the (schema-only) article variant. */
export declare function isArticleRef(ref: ContentRef): ref is ArticleRef;
/**
 * Catalog-grounded podcast episode (SPEC.md §9) — only the server produces
 * these, after validation (feed exists, audio playable, deduped; SPEC.md §1).
 */
export declare const ResolvedPodcastEpisodeSchema: z.ZodObject<{
    content_type: z.ZodLiteral<"podcast_episode">;
    episode_id: z.ZodEffects<z.ZodString, string, string>;
    show_id: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodString;
    show_title: z.ZodString;
    /** Publisher editorial text (show notes); generous ceiling, larger than titles (0.4). */
    description: z.ZodOptional<z.ZodString>;
    duration_seconds: z.ZodNumber;
    published_at: z.ZodString;
    artwork_url: z.ZodOptional<z.ZodString>;
    has_publisher_transcript: z.ZodBoolean;
    /** Whether this user already consumed the episode (dedupe signal for curation). */
    already_listened: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    content_type: "podcast_episode";
    episode_id: string;
    title: string;
    show_title: string;
    published_at: string;
    show_id: string;
    duration_seconds: number;
    has_publisher_transcript: boolean;
    already_listened: boolean;
    description?: string | undefined;
    artwork_url?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id: string;
    title: string;
    show_title: string;
    published_at: string;
    show_id: string;
    duration_seconds: number;
    has_publisher_transcript: boolean;
    already_listened: boolean;
    description?: string | undefined;
    artwork_url?: string | undefined;
}>;
export type ResolvedPodcastEpisode = z.infer<typeof ResolvedPodcastEpisodeSchema>;
/** Resolved article — SCHEMA-ONLY in V1; no server path produces one. */
export declare const ResolvedArticleSchema: z.ZodObject<{
    content_type: z.ZodLiteral<"article">;
    url: z.ZodString;
    title: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodString>;
    word_count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content_type: "article";
    title: string;
    url: string;
    published_at?: string | undefined;
    author?: string | undefined;
    word_count?: number | undefined;
}, {
    content_type: "article";
    title: string;
    url: string;
    published_at?: string | undefined;
    author?: string | undefined;
    word_count?: number | undefined;
}>;
export type ResolvedArticle = z.infer<typeof ResolvedArticleSchema>;
export declare const ResolvedContentSchema: z.ZodUnion<[z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
    content_type: z.ZodLiteral<"podcast_episode">;
    episode_id: z.ZodEffects<z.ZodString, string, string>;
    show_id: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodString;
    show_title: z.ZodString;
    /** Publisher editorial text (show notes); generous ceiling, larger than titles (0.4). */
    description: z.ZodOptional<z.ZodString>;
    duration_seconds: z.ZodNumber;
    published_at: z.ZodString;
    artwork_url: z.ZodOptional<z.ZodString>;
    has_publisher_transcript: z.ZodBoolean;
    /** Whether this user already consumed the episode (dedupe signal for curation). */
    already_listened: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    content_type: "podcast_episode";
    episode_id: string;
    title: string;
    show_title: string;
    published_at: string;
    show_id: string;
    duration_seconds: number;
    has_publisher_transcript: boolean;
    already_listened: boolean;
    description?: string | undefined;
    artwork_url?: string | undefined;
}, {
    content_type: "podcast_episode";
    episode_id: string;
    title: string;
    show_title: string;
    published_at: string;
    show_id: string;
    duration_seconds: number;
    has_publisher_transcript: boolean;
    already_listened: boolean;
    description?: string | undefined;
    artwork_url?: string | undefined;
}>, z.ZodObject<{
    content_type: z.ZodLiteral<"article">;
    url: z.ZodString;
    title: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodString>;
    word_count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content_type: "article";
    title: string;
    url: string;
    published_at?: string | undefined;
    author?: string | undefined;
    word_count?: number | undefined;
}, {
    content_type: "article";
    title: string;
    url: string;
    published_at?: string | undefined;
    author?: string | undefined;
    word_count?: number | undefined;
}>]>, z.ZodEffects<z.ZodObject<{
    content_type: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    content_type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>]>;
export type ResolvedContent = z.infer<typeof ResolvedContentSchema>;
/** Narrow ResolvedContent to the podcast profile's variant (see isPodcastEpisodeRef). */
export declare function isResolvedPodcastEpisode(content: ResolvedContent): content is ResolvedPodcastEpisode;
