/**
 * Resolution objects (SPEC.md §10): UnavailableReason and ResolutionResult.
 *
 * `resolve_content` / `resolve_content_batch` turn an assistant's ContentRef
 * into either catalog-grounded ResolvedContent or a reason the user cannot
 * consume it. Article refs are always `unavailable` /
 * `unsupported_content_type` in V1.
 */
import { z } from "zod";
/**
 * Why resolvable-looking content cannot be consumed (SPEC.md §10). Unavailability
 * is an expected outcome, not an error: returned by `resolve_content` and
 * per-recommendation on `create_plan`.
 *
 * Honesty split (0.3): `resolution_failed` means the RESOLVER failed — a
 * fetch error, a parse error, an ambiguity, an exception mid-pipeline — so a
 * retry or a better ref may succeed. `no_public_feed` is reserved for the
 * verified world-fact that no public feed could be located anywhere.
 */
export declare const UnavailableReasonSchema: z.ZodEnum<["subscription_only", "private_feed_required", "spotify_exclusive", "apple_subscription", "removed_by_publisher", "no_public_feed", "audio_unreachable", "unsupported_content_type", "resolution_failed"]>;
export type UnavailableReason = z.infer<typeof UnavailableReasonSchema>;
/** The two 0.3 verdicts. Consumers read the field tolerantly (SPEC.md §3). */
export declare const ResolutionStatusSchema: z.ZodEnum<["playable", "unavailable"]>;
export type ResolutionStatus = z.infer<typeof ResolutionStatusSchema>;
/**
 * Output of `resolve_content` (SPEC.md §10). `playable` carries
 * `content`; `unavailable` carries `reason` so the assistant can suggest a
 * replacement or show the item as an external link. `status` and `reason`
 * are consumer-read fields and parse tolerantly — treat an unknown future
 * `reason` as generic unavailability (SPEC.md §3).
 */
export declare const ResolutionResultSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodType<import("./tolerance.js").Tolerant<"playable" | "unavailable">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"playable" | "unavailable">>;
    content: z.ZodOptional<z.ZodUnion<[z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
        content_type: z.ZodLiteral<"podcast_episode">;
        episode_id: z.ZodEffects<z.ZodString, string, string>;
        show_id: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodString;
        show_title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        duration_seconds: z.ZodNumber;
        published_at: z.ZodString;
        artwork_url: z.ZodOptional<z.ZodString>;
        has_publisher_transcript: z.ZodBoolean;
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
    }, z.ZodTypeAny, "passthrough">>]>>;
    reason: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed">>>;
}, "strip", z.ZodTypeAny, {
    status: import("./tolerance.js").Tolerant<"playable" | "unavailable">;
    content?: z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
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
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    } | undefined;
    reason?: import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed"> | undefined;
}, {
    status: import("./tolerance.js").Tolerant<"playable" | "unavailable">;
    content?: z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
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
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    } | undefined;
    reason?: import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed"> | undefined;
}>, {
    status: import("./tolerance.js").Tolerant<"playable" | "unavailable">;
    content?: z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
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
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    } | undefined;
    reason?: import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed"> | undefined;
}, {
    status: import("./tolerance.js").Tolerant<"playable" | "unavailable">;
    content?: z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
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
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    } | undefined;
    reason?: import("./tolerance.js").Tolerant<"subscription_only" | "private_feed_required" | "spotify_exclusive" | "apple_subscription" | "removed_by_publisher" | "no_public_feed" | "audio_unreachable" | "unsupported_content_type" | "resolution_failed"> | undefined;
}>;
export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;
