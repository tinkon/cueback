/**
 * Consumer-side enum tolerance (SPEC.md §3, tolerant-reader rule 2).
 *
 * Minor protocol versions may ADD enum values, so a 0.3 consumer reading a
 * document produced by a newer 0.x minor must not hard-fail on a value it does
 * not know. The pattern chosen for 0.3 — applied to every closed enum a
 * consumer reads on server-produced documents — is a tolerant union:
 *
 *   tolerantEnum(XSchema)  ≈  XSchema.or(z.string())
 *
 * - A known value keeps its literal type (autocomplete and switch narrowing
 *   survive, via the `string & {}` trick).
 * - An unknown future value parses and is PRESERVED VERBATIM as a plain
 *   string — never collapsed to a synthetic "unknown", because the reader of
 *   most of these documents is an assistant, and `reason: "drm_locked"` is
 *   actionable where `reason: "unknown"` is not.
 *
 * Producer-side input schemas (StructuredFeedbackSchema as `record_feedback`
 * input, BriefSchema on `create_plan`, PlanUpdateOpSchema, the known
 * ContentRef variants) deliberately stay STRICT so typos are rejected at the
 * door. The rule of thumb: validate what you are about to write with the
 * strict schema; parse what someone else produced with the document schemas,
 * which embed these tolerant fields.
 *
 * Narrow with `isKnown(XSchema, value)` before treating a value as one of the
 * 0.3 literals; treat anything else conservatively (an unknown
 * `UnavailableReason` is generic unavailability, an unknown `content_type` is
 * content this consumer cannot handle, an unknown event type is ignorable).
 */
import { z } from "zod";
/**
 * `string & {}` — a string type that TypeScript will not eagerly collapse
 * literal unions into, so `"completed" | OpenString` still autocompletes.
 */
export type OpenString = string & {};
/** The tolerant type for a closed enum: its literals, or any other string. */
export type Tolerant<T extends string> = T | OpenString;
/**
 * Wrap a closed enum for consumer reads: known values keep their literal
 * types; unknown future values parse as plain strings (SPEC.md §3).
 */
export declare function tolerantEnum<T extends [string, ...string[]]>(schema: z.ZodEnum<T>): z.ZodType<Tolerant<T[number]>>;
/** Narrow a tolerantly-parsed value back to the enum's known literals. */
export declare function isKnown<T extends [string, ...string[]]>(schema: z.ZodEnum<T>, value: string): value is T[number];
