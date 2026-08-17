/**
 * AssistantHandoff (SPEC.md §18).
 *
 * STATUS (SPEC.md §18; Appendix B): DRAFT — non-normative and unimplemented. No
 * server serializes this object. The schema stays exported and compiling so
 * the shape survives review; expect it to change before it ships. Its
 * `position_seconds` concept ("where in the content was the user") migrated
 * into `UserFeedbackEntry.location` in 0.3.
 *
 * Intended semantics: created when the user taps "Ask assistant"
 * mid-consumption. Short-lived and consumed once: the chosen assistant
 * receives ONLY the permitted context below — never raw consumption logs, and
 * receipts only when the user explicitly authorized them for this handoff.
 */
import { z } from "zod";
/**
 * Metadata subset of ResolvedContent included in a handoff — enough for the
 * assistant to know what is playing, nothing more (SPEC.md §18).
 */
export declare const HandoffContentSchema: z.ZodObject<{
    /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
    content_id: z.ZodString;
    title: z.ZodString;
    /** Show / publication / channel the content came from. */
    source_title: z.ZodString;
    duration_seconds: z.ZodNumber;
    published_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    published_at: string;
    duration_seconds: number;
    content_id: string;
    source_title: string;
}, {
    title: string;
    published_at: string;
    duration_seconds: number;
    content_id: string;
    source_title: string;
}>;
export type HandoffContent = z.infer<typeof HandoffContentSchema>;
export declare const AssistantHandoffSchema: z.ZodObject<{
    cueback_version: z.ZodString;
    handoff_id: z.ZodEffects<z.ZodString, string, string>;
    content: z.ZodObject<{
        /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
        content_id: z.ZodString;
        title: z.ZodString;
        /** Show / publication / channel the content came from. */
        source_title: z.ZodString;
        duration_seconds: z.ZodNumber;
        published_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        published_at: string;
        duration_seconds: number;
        content_id: string;
        source_title: string;
    }, {
        title: string;
        published_at: string;
        duration_seconds: number;
        content_id: string;
        source_title: string;
    }>;
    /** Current playback position when the user asked. */
    position_seconds: z.ZodNumber;
    /** Why the content was recommended (the recommendation's `why`), when it came from a plan. */
    recommendation_reason: z.ZodOptional<z.ZodString>;
    /** The user's own words — widest cap class, like UserFeedbackEntry.text (0.4). */
    user_question: z.ZodString;
    /** Excerpt near the playback position — publisher-provided transcripts only (V1 never generates). */
    transcript_excerpt: z.ZodOptional<z.ZodString>;
    /** Prior receipts, present only when explicitly authorized by the user for this handoff. */
    receipts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        cueback_version: z.ZodString;
        receipt_id: z.ZodEffects<z.ZodString, string, string>;
        content_type: z.ZodType<import("./tolerance.js").Tolerant<"podcast_episode" | "article">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"podcast_episode" | "article">>;
        content_id: z.ZodString;
        content_title: z.ZodString;
        source_title: z.ZodString;
        recommended_for: z.ZodOptional<z.ZodString>;
        recommendation_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        plan_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        why: z.ZodOptional<z.ZodString>;
        contrasting_perspective: z.ZodOptional<z.ZodBoolean>;
        content_length: z.ZodOptional<z.ZodObject<{
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
            progress_percent: z.ZodNumber;
            time_spent_minutes: z.ZodNumber;
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
        user_feedback: z.ZodOptional<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            occurred_at: z.ZodString;
            location: z.ZodOptional<z.ZodObject<{
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
    }>, "many">>;
    /** Handoffs are short-lived; the server rejects consumption after this instant. */
    expires_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cueback_version: string;
    handoff_id: string;
    content: {
        title: string;
        published_at: string;
        duration_seconds: number;
        content_id: string;
        source_title: string;
    };
    position_seconds: number;
    user_question: string;
    expires_at: string;
    recommendation_reason?: string | undefined;
    transcript_excerpt?: string | undefined;
    receipts?: {
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
    }[] | undefined;
}, {
    cueback_version: string;
    handoff_id: string;
    content: {
        title: string;
        published_at: string;
        duration_seconds: number;
        content_id: string;
        source_title: string;
    };
    position_seconds: number;
    user_question: string;
    expires_at: string;
    recommendation_reason?: string | undefined;
    transcript_excerpt?: string | undefined;
    receipts?: {
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
    }[] | undefined;
}>;
export type AssistantHandoff = z.infer<typeof AssistantHandoffSchema>;
