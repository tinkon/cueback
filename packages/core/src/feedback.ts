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
import { tolerantEnum } from "./tolerance.js";

export const FeedbackValueSchema = z.enum(["worth_my_time", "not_worth_my_time"]);
export type FeedbackValue = z.infer<typeof FeedbackValueSchema>;

export const FeedbackDifficultySchema = z.enum([
  "too_basic",
  "slightly_basic",
  "just_right",
  "slightly_technical",
  "too_technical",
]);
export type FeedbackDifficulty = z.infer<typeof FeedbackDifficultySchema>;

export const FeedbackLengthSchema = z.enum(["too_long", "fine", "too_short"]);
export type FeedbackLength = z.infer<typeof FeedbackLengthSchema>;

export const FeedbackFlagSchema = z.enum(["too_repetitive", "too_promotional"]);
export type FeedbackFlag = z.infer<typeof FeedbackFlagSchema>;

export const StructuredFeedbackSchema = z
  .object({
    value: FeedbackValueSchema.optional(),
    difficulty: FeedbackDifficultySchema.optional(),
    length: FeedbackLengthSchema.optional(),
    /** Subset of [too_repetitive, too_promotional]. */
    flags: z.array(FeedbackFlagSchema).optional(),
    /** Free-form tags, e.g. "good operator perspective". Machine-ish: ≤ 20 × 40 (0.4). */
    tags: z.array(z.string().max(40)).max(20).optional(),
  })
  .refine(
    (feedback) =>
      feedback.value !== undefined ||
      feedback.difficulty !== undefined ||
      feedback.length !== undefined ||
      (feedback.flags !== undefined && feedback.flags.length > 0) ||
      (feedback.tags !== undefined && feedback.tags.length > 0),
    { message: "StructuredFeedback requires at least one populated field" },
  );
export type StructuredFeedback = z.infer<typeof StructuredFeedbackSchema>;

/**
 * StructuredFeedback as a CONSUMER reads it off a receipt (SPEC.md §3):
 * every enum is tolerant, and there is no at-least-one refine — a newer
 * minor may have populated only a field this release does not know (unknown
 * keys are stripped on parse, which must not turn a valid document into an
 * "empty" invalid one). Producers never validate against this schema.
 */
export const TolerantStructuredFeedbackSchema = z.object({
  value: tolerantEnum(FeedbackValueSchema).optional(),
  difficulty: tolerantEnum(FeedbackDifficultySchema).optional(),
  length: tolerantEnum(FeedbackLengthSchema).optional(),
  flags: z.array(tolerantEnum(FeedbackFlagSchema)).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});
export type TolerantStructuredFeedback = z.infer<typeof TolerantStructuredFeedbackSchema>;
