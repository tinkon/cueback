/**
 * StructuredFeedback (SPEC.md §15).
 *
 * Structured feedback is the optional one-tap convenience beside the
 * first-class verbatim `user_feedback` on ConsumptionReceipt (SPEC.md §16): it
 * carries more weight than passive consumption behavior, but the user's own
 * words are never replaced by it. All fields are optional, but at least one
 * must be populated — an empty feedback object is meaningless and is rejected.
 *
 * 0.3 clean break (SPEC.md §4 version history; note at §15): `direction`
 * ("more_like_this" / "less_like_this") was REMOVED — it duplicated `value`'s
 * signal (`worth_my_time` / `not_worth_my_time` already steers future
 * curation).
 *
 * Producer vs consumer (SPEC.md §3): `StructuredFeedbackSchema` is the
 * STRICT producer-side schema — it validates what an app or assistant is
 * about to write (the `record_feedback` tool, or the app's own feedback write
 * path) and rejects typos. `TolerantStructuredFeedbackSchema` is what receipts embed:
 * a consumer reading a receipt produced by a newer minor must not fail on an
 * enum value (or field) added after 0.3.
 */
import { z } from "zod";
export declare const FeedbackValueSchema: z.ZodEnum<["worth_my_time", "not_worth_my_time"]>;
export type FeedbackValue = z.infer<typeof FeedbackValueSchema>;
export declare const FeedbackDifficultySchema: z.ZodEnum<["too_basic", "slightly_basic", "just_right", "slightly_technical", "too_technical"]>;
export type FeedbackDifficulty = z.infer<typeof FeedbackDifficultySchema>;
export declare const FeedbackLengthSchema: z.ZodEnum<["too_long", "fine", "too_short"]>;
export type FeedbackLength = z.infer<typeof FeedbackLengthSchema>;
export declare const FeedbackFlagSchema: z.ZodEnum<["too_repetitive", "too_promotional"]>;
export type FeedbackFlag = z.infer<typeof FeedbackFlagSchema>;
export declare const StructuredFeedbackSchema: z.ZodEffects<z.ZodObject<{
    value: z.ZodOptional<z.ZodEnum<["worth_my_time", "not_worth_my_time"]>>;
    difficulty: z.ZodOptional<z.ZodEnum<["too_basic", "slightly_basic", "just_right", "slightly_technical", "too_technical"]>>;
    length: z.ZodOptional<z.ZodEnum<["too_long", "fine", "too_short"]>>;
    /** Subset of [too_repetitive, too_promotional]. */
    flags: z.ZodOptional<z.ZodArray<z.ZodEnum<["too_repetitive", "too_promotional"]>, "many">>;
    /** Free-form tags, e.g. "good operator perspective". Machine-ish: ≤ 20 × 40 (0.4). */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    length?: "too_long" | "fine" | "too_short" | undefined;
    value?: "worth_my_time" | "not_worth_my_time" | undefined;
    difficulty?: "too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical" | undefined;
    flags?: ("too_repetitive" | "too_promotional")[] | undefined;
    tags?: string[] | undefined;
}, {
    length?: "too_long" | "fine" | "too_short" | undefined;
    value?: "worth_my_time" | "not_worth_my_time" | undefined;
    difficulty?: "too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical" | undefined;
    flags?: ("too_repetitive" | "too_promotional")[] | undefined;
    tags?: string[] | undefined;
}>, {
    length?: "too_long" | "fine" | "too_short" | undefined;
    value?: "worth_my_time" | "not_worth_my_time" | undefined;
    difficulty?: "too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical" | undefined;
    flags?: ("too_repetitive" | "too_promotional")[] | undefined;
    tags?: string[] | undefined;
}, {
    length?: "too_long" | "fine" | "too_short" | undefined;
    value?: "worth_my_time" | "not_worth_my_time" | undefined;
    difficulty?: "too_basic" | "slightly_basic" | "just_right" | "slightly_technical" | "too_technical" | undefined;
    flags?: ("too_repetitive" | "too_promotional")[] | undefined;
    tags?: string[] | undefined;
}>;
export type StructuredFeedback = z.infer<typeof StructuredFeedbackSchema>;
/**
 * StructuredFeedback as a CONSUMER reads it off a receipt (SPEC.md §3):
 * every enum is tolerant, and there is no at-least-one refine — a newer
 * minor may have populated only a field this release does not know (unknown
 * keys are stripped on parse, which must not turn a valid document into an
 * "empty" invalid one). Producers never validate against this schema.
 */
export declare const TolerantStructuredFeedbackSchema: z.ZodObject<{
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
}>;
export type TolerantStructuredFeedback = z.infer<typeof TolerantStructuredFeedbackSchema>;
