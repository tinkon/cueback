/**
 * ConsumptionReceipt (SPEC.md §16).
 *
 * Raw consumption events are server-internal: profile packages define them
 * (e.g. PlaybackEvent in `@cueback/podcast`), the app uploads them, and the
 * server's receipt builder distills them. Assistants only ever see
 * ConsumptionReceipts (SPEC.md §21 rule 2).
 *
 * The receipt is deliberately two-layered: the `consumption` block is
 * deterministic and media-objective, while `user_feedback` preserves the
 * user's own words exactly as typed — never summarized or classified by the
 * server. Assistants interpret meaning; the server structures behavior.
 *
 * 0.3 closes the adaptation gap: a receipt now names the recommendation it
 * reports on (`recommendation_id`, `plan_id`) and echoes the pick's own
 * editorial framing (`why`, `contrasting_perspective`) when plan-attributed,
 * so the assistant reading it can adapt without a second `get_plan` call.
 * `content_length` sizes the content media-neutrally (podcast: unit
 * "seconds"; an article profile would use "words"), and each `user_feedback`
 * entry may carry a `location` — where in the content the note refers to.
 *
 * Interpretation caveats (SPEC.md §16, "Receipt-interpretation caveats" — they
 * bind assistants reading receipts and the server building them): unfinished
 * ≠ disliked (the commute may have ended), autoplay-completed ≠ endorsement,
 * forward skips may be ad skips, and one session must not create a permanent
 * preference. Feedback outweighs passive behavior.
 *
 * This schema is as much a consumer-side parser as a producer-side type
 * (SPEC.md §3): `cueback_version` accepts any 0.x, closed enums parse
 * tolerantly, and `content_id` accepts any prefixed content id — a page of
 * receipts may mix versions (old stored receipts are returned as stored).
 */
import { z } from "zod";
import { ContentTypeSchema } from "./content.js";
import { TolerantStructuredFeedbackSchema } from "./feedback.js";
import { ID_PREFIXES, contentIdSchema, idSchema } from "./ids.js";
import { tolerantEnum } from "./tolerance.js";
import { cuebackVersionSchema } from "./version.js";
/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);
/**
 * A media-neutral measure of "how much content" / "where in the content":
 * a profile-defined unit plus a value (SPEC.md §16; §22 items 2–3). The
 * podcast profile uses unit "seconds"; an article profile would use "words".
 * Units are a profile's to define — consumers must not assume a closed set.
 */
export const ContentMeasureSchema = z.object({
    /** Profile-defined unit name ("seconds", "words") — machine-ish, tight cap (0.4). */
    unit: z.string().min(1).max(32),
    value: z.number().nonnegative(),
});
/** Overall outcome the receipt summarizes for one recommendation. */
export const ReceiptOutcomeSchema = z.enum(["completed", "partial", "skipped", "removed"]);
/** Deterministic, media-objective consumption block (SPEC.md §16). */
export const ConsumptionSummarySchema = z.object({
    outcome: tolerantEnum(ReceiptOutcomeSchema),
    /** 0–100. */
    progress_percent: z.number().int().min(0).max(100),
    /** Minutes actually spent on the content, net of skips/replays. */
    time_spent_minutes: z.number().int().nonnegative(),
    /**
     * When the user bookmarked this content for their own later return (0.4
     * additive). Present iff a save stands right now; absent means no save, or
     * one the user has since taken back.
     *
     * **A save is behavior, not judgment**, and it belongs in this block for
     * exactly that reason. It frequently happens BEFORE the content is consumed —
     * "I want to come back to this" is not a report on something heard — and it
     * COEXISTS with any verdict, including a negative one whose topic the user
     * wants more of. Readers must treat it as context about the user's
     * intentions and never as a stronger form of positive feedback:
     * `structured_feedback` and `user_feedback` are where judgment lives, and
     * nothing here outranks them.
     */
    saved_at: isoTimestamp.optional(),
});
/** One verbatim thing the user said, kept exactly as typed (SPEC.md §16, "The verbatim rule"). */
export const UserFeedbackEntrySchema = z.object({
    /**
     * The user's own words. Widest cap in the protocol (0.4): 20000 characters
     * bounds the payload without ever cramping honest expression. Compare
     * `StandingFeedbackNote.text` (standing.ts), which is an EXCERPT of this
     * field and caps at 500.
     */
    text: z.string().min(1).max(20000),
    occurred_at: isoTimestamp,
    /**
     * Where in the content the note refers to (0.3; podcast unit "seconds").
     * The reference app has no UI for this yet and MAY send it later.
     */
    location: ContentMeasureSchema.optional(),
});
/**
 * Compact per-content consumption summary returned to assistants via
 * `get_recent_receipts` (scope `receipts:read`). Receipts are summaries; raw
 * playback/consumption events never leave the server.
 */
export const ConsumptionReceiptSchema = z.object({
    cueback_version: cuebackVersionSchema,
    receipt_id: idSchema(ID_PREFIXES.receipt),
    content_type: tolerantEnum(ContentTypeSchema),
    /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
    content_id: contentIdSchema,
    content_title: z.string().max(2000),
    /** Show / publication / channel the content came from. */
    source_title: z.string().max(2000),
    /** Goal text the content was recommended for: goal_supported-first, else brief.goal. */
    recommended_for: z.string().max(2000).optional(),
    /** The recommendation this receipt reports on, when plan-attributed (0.3). */
    recommendation_id: idSchema(ID_PREFIXES.recommendation).optional(),
    /** The plan the play was attributed to, when plan-attributed (0.3). */
    plan_id: idSchema(ID_PREFIXES.plan).optional(),
    /** Echo of the recommendation's `why`, when plan-attributed (0.3). */
    why: z.string().max(2000).optional(),
    /** Echo of the recommendation's `contrasting_perspective`, when plan-attributed (0.3). */
    contrasting_perspective: z.boolean().optional(),
    /** Media-neutral content size (0.3; podcast: { unit: "seconds", value: duration }). */
    content_length: ContentMeasureSchema.optional(),
    consumption: ConsumptionSummarySchema,
    /** Optional one-tap convenience beside the verbatim feedback below. */
    structured_feedback: TolerantStructuredFeedbackSchema.optional(),
    /** The user's own words, chronological. Never summarized by the server. */
    user_feedback: z.array(UserFeedbackEntrySchema).optional(),
    created_at: isoTimestamp,
});
//# sourceMappingURL=receipt.js.map