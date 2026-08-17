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
/**
 * A media-neutral measure of "how much content" / "where in the content":
 * a profile-defined unit plus a value (SPEC.md §16; §22 items 2–3). The
 * podcast profile uses unit "seconds"; an article profile would use "words".
 * Units are a profile's to define — consumers must not assume a closed set.
 */
export declare const ContentMeasureSchema: z.ZodObject<{
    /** Profile-defined unit name ("seconds", "words") — machine-ish, tight cap (0.4). */
    unit: z.ZodString;
    value: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: string;
}, {
    value: number;
    unit: string;
}>;
export type ContentMeasure = z.infer<typeof ContentMeasureSchema>;
/** Overall outcome the receipt summarizes for one recommendation. */
export declare const ReceiptOutcomeSchema: z.ZodEnum<["completed", "partial", "skipped", "removed"]>;
export type ReceiptOutcome = z.infer<typeof ReceiptOutcomeSchema>;
/** Deterministic, media-objective consumption block (SPEC.md §16). */
export declare const ConsumptionSummarySchema: z.ZodObject<{
    outcome: z.ZodType<import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">>;
    /** 0–100. */
    progress_percent: z.ZodNumber;
    /** Minutes actually spent on the content, net of skips/replays. */
    time_spent_minutes: z.ZodNumber;
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
    saved_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
    progress_percent: number;
    time_spent_minutes: number;
    saved_at?: string | undefined;
}, {
    outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
    progress_percent: number;
    time_spent_minutes: number;
    saved_at?: string | undefined;
}>;
export type ConsumptionSummary = z.infer<typeof ConsumptionSummarySchema>;
/** One verbatim thing the user said, kept exactly as typed (SPEC.md §16, "The verbatim rule"). */
export declare const UserFeedbackEntrySchema: z.ZodObject<{
    /**
     * The user's own words. Widest cap in the protocol (0.4): 20000 characters
     * bounds the payload without ever cramping honest expression. Compare
     * `StandingFeedbackNote.text` (standing.ts), which is an EXCERPT of this
     * field and caps at 500.
     */
    text: z.ZodString;
    occurred_at: z.ZodString;
    /**
     * Where in the content the note refers to (0.3; podcast unit "seconds").
     * The reference app has no UI for this yet and MAY send it later.
     */
    location: z.ZodOptional<z.ZodObject<{
        /** Profile-defined unit name ("seconds", "words") — machine-ish, tight cap (0.4). */
        unit: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: string;
    }, {
        value: number;
        unit: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    occurred_at: string;
    location?: {
        value: number;
        unit: string;
    } | undefined;
}, {
    text: string;
    occurred_at: string;
    location?: {
        value: number;
        unit: string;
    } | undefined;
}>;
export type UserFeedbackEntry = z.infer<typeof UserFeedbackEntrySchema>;
/**
 * Compact per-content consumption summary returned to assistants via
 * `get_recent_receipts` (scope `receipts:read`). Receipts are summaries; raw
 * playback/consumption events never leave the server.
 */
export declare const ConsumptionReceiptSchema: z.ZodObject<{
    cueback_version: z.ZodString;
    receipt_id: z.ZodEffects<z.ZodString, string, string>;
    content_type: z.ZodType<import("./tolerance.js").Tolerant<"podcast_episode" | "article">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"podcast_episode" | "article">>;
    /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
    content_id: z.ZodString;
    content_title: z.ZodString;
    /** Show / publication / channel the content came from. */
    source_title: z.ZodString;
    /** Goal text the content was recommended for: goal_supported-first, else brief.goal. */
    recommended_for: z.ZodOptional<z.ZodString>;
    /** The recommendation this receipt reports on, when plan-attributed (0.3). */
    recommendation_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** The plan the play was attributed to, when plan-attributed (0.3). */
    plan_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Echo of the recommendation's `why`, when plan-attributed (0.3). */
    why: z.ZodOptional<z.ZodString>;
    /** Echo of the recommendation's `contrasting_perspective`, when plan-attributed (0.3). */
    contrasting_perspective: z.ZodOptional<z.ZodBoolean>;
    /** Media-neutral content size (0.3; podcast: { unit: "seconds", value: duration }). */
    content_length: z.ZodOptional<z.ZodObject<{
        /** Profile-defined unit name ("seconds", "words") — machine-ish, tight cap (0.4). */
        unit: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: string;
    }, {
        value: number;
        unit: string;
    }>>;
    consumption: z.ZodObject<{
        outcome: z.ZodType<import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">>;
        /** 0–100. */
        progress_percent: z.ZodNumber;
        /** Minutes actually spent on the content, net of skips/replays. */
        time_spent_minutes: z.ZodNumber;
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
        saved_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    }, {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    }>;
    /** Optional one-tap convenience beside the verbatim feedback below. */
    structured_feedback: z.ZodOptional<z.ZodObject<{
        value: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time">>>;
        difficulty: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical">>>;
        length: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short">>>;
        flags: z.ZodOptional<z.ZodArray<z.ZodType<import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">>, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        length?: import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short"> | undefined;
        value?: import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time"> | undefined;
        difficulty?: import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical"> | undefined;
        flags?: import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">[] | undefined;
        tags?: string[] | undefined;
    }, {
        length?: import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short"> | undefined;
        value?: import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time"> | undefined;
        difficulty?: import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical"> | undefined;
        flags?: import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">[] | undefined;
        tags?: string[] | undefined;
    }>>;
    /** The user's own words, chronological. Never summarized by the server. */
    user_feedback: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /**
         * The user's own words. Widest cap in the protocol (0.4): 20000 characters
         * bounds the payload without ever cramping honest expression. Compare
         * `StandingFeedbackNote.text` (standing.ts), which is an EXCERPT of this
         * field and caps at 500.
         */
        text: z.ZodString;
        occurred_at: z.ZodString;
        /**
         * Where in the content the note refers to (0.3; podcast unit "seconds").
         * The reference app has no UI for this yet and MAY send it later.
         */
        location: z.ZodOptional<z.ZodObject<{
            /** Profile-defined unit name ("seconds", "words") — machine-ish, tight cap (0.4). */
            unit: z.ZodString;
            value: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: number;
            unit: string;
        }, {
            value: number;
            unit: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        occurred_at: string;
        location?: {
            value: number;
            unit: string;
        } | undefined;
    }, {
        text: string;
        occurred_at: string;
        location?: {
            value: number;
            unit: string;
        } | undefined;
    }>, "many">>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content_type: import("./tolerance.js").Tolerant<"podcast_episode" | "article">;
    cueback_version: string;
    receipt_id: string;
    content_id: string;
    content_title: string;
    source_title: string;
    consumption: {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    };
    created_at: string;
    recommended_for?: string | undefined;
    recommendation_id?: string | undefined;
    plan_id?: string | undefined;
    why?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    content_length?: {
        value: number;
        unit: string;
    } | undefined;
    structured_feedback?: {
        length?: import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short"> | undefined;
        value?: import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time"> | undefined;
        difficulty?: import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical"> | undefined;
        flags?: import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">[] | undefined;
        tags?: string[] | undefined;
    } | undefined;
    user_feedback?: {
        text: string;
        occurred_at: string;
        location?: {
            value: number;
            unit: string;
        } | undefined;
    }[] | undefined;
}, {
    content_type: import("./tolerance.js").Tolerant<"podcast_episode" | "article">;
    cueback_version: string;
    receipt_id: string;
    content_id: string;
    content_title: string;
    source_title: string;
    consumption: {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    };
    created_at: string;
    recommended_for?: string | undefined;
    recommendation_id?: string | undefined;
    plan_id?: string | undefined;
    why?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    content_length?: {
        value: number;
        unit: string;
    } | undefined;
    structured_feedback?: {
        length?: import("./tolerance.js").Tolerant<"too_long" | "fine" | "too_short"> | undefined;
        value?: import("./tolerance.js").Tolerant<"worth_my_time" | "not_worth_my_time"> | undefined;
        difficulty?: import("./tolerance.js").Tolerant<"too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical"> | undefined;
        flags?: import("./tolerance.js").Tolerant<"too_repetitive" | "too_promotional">[] | undefined;
        tags?: string[] | undefined;
    } | undefined;
    user_feedback?: {
        text: string;
        occurred_at: string;
        location?: {
            value: number;
            unit: string;
        } | undefined;
    }[] | undefined;
}>;
export type ConsumptionReceipt = z.infer<typeof ConsumptionReceiptSchema>;
