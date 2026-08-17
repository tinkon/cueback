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
import { ID_PREFIXES, contentIdSchema, idSchema } from "./ids.js";
import { ConsumptionReceiptSchema } from "./receipt.js";
import { cuebackVersionSchema } from "./version.js";

/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);

/**
 * Metadata subset of ResolvedContent included in a handoff — enough for the
 * assistant to know what is playing, nothing more (SPEC.md §18).
 */
export const HandoffContentSchema = z.object({
  /** Any prefixed content id — opaque beyond its prefix (SPEC.md §2). */
  content_id: contentIdSchema,
  title: z.string().max(2000),
  /** Show / publication / channel the content came from. */
  source_title: z.string().max(2000),
  duration_seconds: z.number().int().nonnegative(),
  published_at: isoTimestamp,
});
export type HandoffContent = z.infer<typeof HandoffContentSchema>;

export const AssistantHandoffSchema = z.object({
  cueback_version: cuebackVersionSchema,
  handoff_id: idSchema(ID_PREFIXES.handoff),
  content: HandoffContentSchema,
  /** Current playback position when the user asked. */
  position_seconds: z.number().int().nonnegative(),
  /** Why the content was recommended (the recommendation's `why`), when it came from a plan. */
  recommendation_reason: z.string().max(2000).optional(),
  /** The user's own words — widest cap class, like UserFeedbackEntry.text (0.4). */
  user_question: z.string().max(20000),
  /** Excerpt near the playback position — publisher-provided transcripts only (V1 never generates). */
  transcript_excerpt: z.string().max(10000).optional(),
  /** Prior receipts, present only when explicitly authorized by the user for this handoff. */
  receipts: z.array(ConsumptionReceiptSchema).optional(),
  /** Handoffs are short-lived; the server rejects consumption after this instant. */
  expires_at: isoTimestamp,
});
export type AssistantHandoff = z.infer<typeof AssistantHandoffSchema>;
