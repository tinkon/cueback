/**
 * StandingFeedback (SPEC.md §17, protocol as of 0.4) — what the user has WRITTEN
 * about their consuming, delivered unbidden on the tools an assistant touches
 * on its way to a plan.
 *
 * PROMOTED from a reference-implementation envelope extension into the
 * protocol in 0.4, on evidence: adversarial review of its honesty claims plus
 * a blinded A/B evaluation including a cross-model round showed the shape
 * changes what an assistant builds, across models (SPEC.md §17 "Motivation"; it
 * is the precedent for the extension-graduation path, §20). It graduates
 * exactly as fielded — every value is a projection of a stored
 * `ConsumptionReceipt` (receipt.ts), which was already protocol; what 0.4
 * standardizes is the push.
 *
 * THE SEMANTICS ARE THE CONTRACT, not implementation detail:
 *
 * - **Verbatim or flagged-truncated.** `text` is the user's own words exactly
 *   as stored, or a leading excerpt cut on a grapheme boundary with an
 *   ellipsis and `truncated: true`. A server must never paraphrase,
 *   summarize, classify, sentiment-score, merge, or re-attribute what the
 *   user wrote — the only permitted edit is the flagged cut.
 * - **Selection is structural, never semantic.** Notes are selected by having
 *   words at all and ordered by structural keys (candidate membership,
 *   recency) — never filtered or ranked by topic. Deciding which note bears
 *   on the current build is the assistant's job; the server hands it the
 *   words.
 * - **Gated on `receipts:read`.** A connection without the scope gets no
 *   standing keys at all — absent, never empty.
 * - **Keys omitted entirely when empty.** Never `null`, never `[]`, never
 *   `{}`: an always-present empty key trains assistants to skip the field.
 * - **Delivery cadence is implementation-defined.** When and how often a
 *   server attaches the block (every build, windowed on reads, …) is its
 *   delivery decision; the shape and the rules above are what the protocol
 *   fixes.
 *
 * THE TWO ENVELOPE FLAGS. `StandingFeedback` rides the tool-result envelope
 * of carrier tools under two optional keys:
 *
 * - `standing_feedback?: StandingFeedback` — present only when there is
 *   something to say (see omission rule above).
 * - `standing_feedback_unchecked?: true` — the server tried to look on this
 *   call and could not (query failure, deadline). Raised only when a look was
 *   actually attempted, so absence never means two things: an omitted
 *   `standing_feedback` with no flag means "nothing on file for this
 *   delivery", never "the server could not look".
 */
import { z } from "zod";
/**
 * One thing the user wrote, with the context that stops a bare quote from
 * misleading. Media-neutral: content/source, never episode/show.
 */
export declare const StandingFeedbackNoteSchema: z.ZodObject<{
    /**
     * The user's words, verbatim — or a leading excerpt with `truncated: true`.
     * `.max(500)` because a standing note is an EXCERPT by definition: the
     * reference server cuts at exactly 500 and points at the receipts tool for
     * the whole text. The underlying `UserFeedbackEntry.text` (receipt.ts) is
     * the uncut source and caps at 20000.
     */
    text: z.ZodString;
    /** Emitted only when true; absence means the text is exactly as stored. */
    truncated: z.ZodOptional<z.ZodLiteral<true>>;
    /** When the user said it — the feedback entry's own `occurred_at`. */
    said_at: z.ZodString;
    /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
    content_id: z.ZodString;
    content_title: z.ZodString;
    /** Show / publication / channel the content came from. */
    source_title: z.ZodString;
    /**
     * The goal the content was recommended under, when a single one is
     * knowable. Omitted rather than guessed: a server must never attach the
     * user's words to a context they may not have said them in.
     */
    recommended_for: z.ZodOptional<z.ZodString>;
    /**
     * Copied field-for-field from the one stored receipt the note is shown
     * from — never recomputed, never merged across rows.
     */
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
}, "strip", z.ZodTypeAny, {
    text: string;
    content_id: string;
    content_title: string;
    source_title: string;
    consumption: {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    };
    said_at: string;
    recommended_for?: string | undefined;
    truncated?: true | undefined;
}, {
    text: string;
    content_id: string;
    content_title: string;
    source_title: string;
    consumption: {
        outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
        progress_percent: number;
        time_spent_minutes: number;
        saved_at?: string | undefined;
    };
    said_at: string;
    recommended_for?: string | undefined;
    truncated?: true | undefined;
}>;
export type StandingFeedbackNote = z.infer<typeof StandingFeedbackNoteSchema>;
export declare const StandingFeedbackSchema: z.ZodObject<{
    /** Server-authored; states the remainder, the ambiguity and the cuts in words. */
    note: z.ZodString;
    /** At most 40 — the eval-validated ceiling the promotion carries (SPEC.md §17 rule 10). */
    notes: z.ZodArray<z.ZodObject<{
        /**
         * The user's words, verbatim — or a leading excerpt with `truncated: true`.
         * `.max(500)` because a standing note is an EXCERPT by definition: the
         * reference server cuts at exactly 500 and points at the receipts tool for
         * the whole text. The underlying `UserFeedbackEntry.text` (receipt.ts) is
         * the uncut source and caps at 20000.
         */
        text: z.ZodString;
        /** Emitted only when true; absence means the text is exactly as stored. */
        truncated: z.ZodOptional<z.ZodLiteral<true>>;
        /** When the user said it — the feedback entry's own `occurred_at`. */
        said_at: z.ZodString;
        /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
        content_id: z.ZodString;
        content_title: z.ZodString;
        /** Show / publication / channel the content came from. */
        source_title: z.ZodString;
        /**
         * The goal the content was recommended under, when a single one is
         * knowable. Omitted rather than guessed: a server must never attach the
         * user's words to a context they may not have said them in.
         */
        recommended_for: z.ZodOptional<z.ZodString>;
        /**
         * Copied field-for-field from the one stored receipt the note is shown
         * from — never recomputed, never merged across rows.
         */
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
    }, "strip", z.ZodTypeAny, {
        text: string;
        content_id: string;
        content_title: string;
        source_title: string;
        consumption: {
            outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
            progress_percent: number;
            time_spent_minutes: number;
            saved_at?: string | undefined;
        };
        said_at: string;
        recommended_for?: string | undefined;
        truncated?: true | undefined;
    }, {
        text: string;
        content_id: string;
        content_title: string;
        source_title: string;
        consumption: {
            outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
            progress_percent: number;
            time_spent_minutes: number;
            saved_at?: string | undefined;
        };
        said_at: string;
        recommended_for?: string | undefined;
        truncated?: true | undefined;
    }>, "many">;
    /** This user has written more than the block carries. Omitted when false. */
    more_on_file: z.ZodOptional<z.ZodLiteral<true>>;
}, "strip", z.ZodTypeAny, {
    note: string;
    notes: {
        text: string;
        content_id: string;
        content_title: string;
        source_title: string;
        consumption: {
            outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
            progress_percent: number;
            time_spent_minutes: number;
            saved_at?: string | undefined;
        };
        said_at: string;
        recommended_for?: string | undefined;
        truncated?: true | undefined;
    }[];
    more_on_file?: true | undefined;
}, {
    note: string;
    notes: {
        text: string;
        content_id: string;
        content_title: string;
        source_title: string;
        consumption: {
            outcome: import("./tolerance.js").Tolerant<"completed" | "partial" | "skipped" | "removed">;
            progress_percent: number;
            time_spent_minutes: number;
            saved_at?: string | undefined;
        };
        said_at: string;
        recommended_for?: string | undefined;
        truncated?: true | undefined;
    }[];
    more_on_file?: true | undefined;
}>;
export type StandingFeedback = z.infer<typeof StandingFeedbackSchema>;
