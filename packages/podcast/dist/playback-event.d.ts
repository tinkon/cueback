import { z } from "zod";
export declare const PlaybackEventTypeSchema: z.ZodEnum<["started", "completed", "removed_before_playing", "skipped_forward", "replayed_section", "paused", "abandoned_queue"]>;
export type PlaybackEventType = z.infer<typeof PlaybackEventTypeSchema>;
export declare const PlaybackEventSchema: z.ZodObject<{
    type: z.ZodType<import("@cueback/core").Tolerant<"started" | "completed" | "removed_before_playing" | "skipped_forward" | "replayed_section" | "paused" | "abandoned_queue">, z.ZodTypeDef, import("@cueback/core").Tolerant<"started" | "completed" | "removed_before_playing" | "skipped_forward" | "replayed_section" | "paused" | "abandoned_queue">>;
    /**
     * Client-minted UUID, RECOMMENDED (0.3): the upload's idempotency key, so
     * an uploader retrying a batch whose acknowledgment was lost cannot
     * double-count events (SPEC.md §14).
     */
    event_id: z.ZodOptional<z.ZodString>;
    episode_id: z.ZodEffects<z.ZodString, string, string>;
    /** Plan recommendation the play came from, when it came from a plan. */
    recommendation_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Playback position when the event occurred. */
    position_seconds: z.ZodOptional<z.ZodNumber>;
    /** Event-specific extras (e.g. skip target position); free-form JSON (SPEC.md §14). */
    detail: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    occurred_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: import("@cueback/core").Tolerant<"started" | "completed" | "removed_before_playing" | "skipped_forward" | "replayed_section" | "paused" | "abandoned_queue">;
    episode_id: string;
    occurred_at: string;
    event_id?: string | undefined;
    recommendation_id?: string | undefined;
    position_seconds?: number | undefined;
    detail?: Record<string, unknown> | undefined;
}, {
    type: import("@cueback/core").Tolerant<"started" | "completed" | "removed_before_playing" | "skipped_forward" | "replayed_section" | "paused" | "abandoned_queue">;
    episode_id: string;
    occurred_at: string;
    event_id?: string | undefined;
    recommendation_id?: string | undefined;
    position_seconds?: number | undefined;
    detail?: Record<string, unknown> | undefined;
}>;
export type PlaybackEvent = z.infer<typeof PlaybackEventSchema>;
