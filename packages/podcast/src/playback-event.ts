/**
 * PlaybackEvent (SPEC.md §14) — the podcast profile's raw consumption signal.
 *
 * Playback events are server-internal: the app uploads them in batches (the
 * transport is app↔server implementation detail, non-normative;
 * SPEC.md Appendix A) and the server's receipt builder distills them into
 * ConsumptionReceipts. Assistants never see raw events (SPEC.md §21 rule 2).
 *
 * The SERVER is the consumer of this object (the app produces it), so `type`
 * parses tolerantly (SPEC.md §3: an unknown event type is ignorable) — the
 * receipt builder already skips types it does not know rather than erroring.
 */
import { ID_PREFIXES, idSchema, tolerantEnum } from "@cueback/core";
import { z } from "zod";

/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);

export const PlaybackEventTypeSchema = z.enum([
  "started",
  "completed",
  "removed_before_playing",
  "skipped_forward",
  "replayed_section",
  "paused",
  "abandoned_queue",
]);
export type PlaybackEventType = z.infer<typeof PlaybackEventTypeSchema>;

export const PlaybackEventSchema = z.object({
  type: tolerantEnum(PlaybackEventTypeSchema),
  /**
   * Client-minted UUID, RECOMMENDED (0.3): the upload's idempotency key, so
   * an uploader retrying a batch whose acknowledgment was lost cannot
   * double-count events (SPEC.md §14).
   */
  event_id: z.string().uuid().optional(),
  episode_id: idSchema(ID_PREFIXES.episode),
  /** Plan recommendation the play came from, when it came from a plan. */
  recommendation_id: idSchema(ID_PREFIXES.recommendation).optional(),
  /** Playback position when the event occurred. */
  position_seconds: z.number().int().nonnegative().optional(),
  /** Event-specific extras (e.g. skip target position); free-form JSON (SPEC.md §14). */
  detail: z.record(z.unknown()).optional(),
  occurred_at: isoTimestamp,
});
export type PlaybackEvent = z.infer<typeof PlaybackEventSchema>;
