/**
 * Resolution objects (SPEC.md §10): UnavailableReason and ResolutionResult.
 *
 * `resolve_content` / `resolve_content_batch` turn an assistant's ContentRef
 * into either catalog-grounded ResolvedContent or a reason the user cannot
 * consume it. Article refs are always `unavailable` /
 * `unsupported_content_type` in V1.
 */
import { z } from "zod";
import { ResolvedContentSchema } from "./content.js";
import { tolerantEnum } from "./tolerance.js";

/**
 * Why resolvable-looking content cannot be consumed (SPEC.md §10). Unavailability
 * is an expected outcome, not an error: returned by `resolve_content` and
 * per-recommendation on `create_plan`.
 *
 * Honesty split (0.3): `resolution_failed` means the RESOLVER failed — a
 * fetch error, a parse error, an ambiguity, an exception mid-pipeline — so a
 * retry or a better ref may succeed. `no_public_feed` is reserved for the
 * verified world-fact that no public feed could be located anywhere.
 */
export const UnavailableReasonSchema = z.enum([
  "subscription_only",
  "private_feed_required",
  "spotify_exclusive",
  "apple_subscription",
  "removed_by_publisher",
  "no_public_feed",
  "audio_unreachable",
  /** V1 guard: the ref names a content type this server has no profile for. */
  "unsupported_content_type",
  /** The resolver itself failed (fetch/parse error, ambiguity) — retry may succeed. */
  "resolution_failed",
]);
export type UnavailableReason = z.infer<typeof UnavailableReasonSchema>;

/** The two 0.3 verdicts. Consumers read the field tolerantly (SPEC.md §3). */
export const ResolutionStatusSchema = z.enum(["playable", "unavailable"]);
export type ResolutionStatus = z.infer<typeof ResolutionStatusSchema>;

/**
 * Output of `resolve_content` (SPEC.md §10). `playable` carries
 * `content`; `unavailable` carries `reason` so the assistant can suggest a
 * replacement or show the item as an external link. `status` and `reason`
 * are consumer-read fields and parse tolerantly — treat an unknown future
 * `reason` as generic unavailability (SPEC.md §3).
 */
export const ResolutionResultSchema = z
  .object({
    status: tolerantEnum(ResolutionStatusSchema),
    content: ResolvedContentSchema.optional(),
    reason: tolerantEnum(UnavailableReasonSchema).optional(),
  })
  .superRefine((result, ctx) => {
    if (result.status === "playable" && result.content === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status "playable" requires content',
        path: ["content"],
      });
    }
    if (result.status === "unavailable" && result.reason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status "unavailable" requires reason',
        path: ["reason"],
      });
    }
  });
export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;
