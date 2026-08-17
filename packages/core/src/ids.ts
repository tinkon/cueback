/**
 * ID prefixes and helpers (SPEC.md §2, "IDs").
 *
 * Every entity id is a prefixed UUIDv7 string, e.g.
 * `ep_0190f7a2-6a3e-7cc0-9f6e-2b1c5d8e4a10`. UUIDv7 keeps ids time-sortable,
 * which the server relies on for stable default ordering.
 */
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

/**
 * Entity name → wire id prefix. The prefix is part of the id and the only
 * part that is not opaque (SPEC.md §2). `show_` / `ep_` stay podcast-internal;
 * `pl_` now reads as "plan".
 */
export const ID_PREFIXES = {
  show: "show_",
  episode: "ep_",
  plan: "pl_",
  recommendation: "rec_",
  receipt: "rcpt_",
  connection: "conn_",
  handoff: "hf_",
  device: "dev_",
  user: "user_",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/** Mint a new id: `<prefix>` + UUIDv7. */
export function newId<P extends IdPrefix>(prefix: P): `${P}${string}` {
  return `${prefix}${uuidv7()}`;
}

/**
 * Zod schema for an id with the given prefix. Validates the prefix and that a
 * non-empty body follows; it deliberately does not pin the body to UUID
 * syntax so fixtures and future id formats keep parsing. The `.max(128)`
 * (0.4) is the id-class length ceiling — a prefixed UUIDv7 is ~44 chars, so
 * the room for future id formats is generous, not open-ended.
 */
export function idSchema(prefix: IdPrefix): z.ZodEffects<z.ZodString, string, string> {
  return z
    .string()
    .max(128)
    .refine((value) => value.startsWith(prefix) && value.length > prefix.length, {
      message: `expected an id starting with "${prefix}"`,
    });
}

/**
 * A media-neutral content id: some `<prefix>_<body>` (SPEC.md §2 — ids are
 * opaque beyond their prefix). 0.3 judgement call: the
 * media-neutral objects (`ConsumptionReceipt.content_id`,
 * `HandoffContent.content_id`, `NewRecommendation.content_id`) used to pin
 * `ep_`, which baked the podcast profile into core — a reading profile could
 * not mint `art_…` content ids without a core release. Core cannot enumerate
 * every future profile's prefix, so it validates only the id SHAPE; each
 * profile's own objects (e.g. `ResolvedPodcastEpisode.episode_id`) still pin
 * their profile's prefix via `idSchema`.
 */
export const contentIdSchema = z
  .string()
  .max(128)
  .regex(/^[a-z][a-z0-9]*_.+$/, 'expected a prefixed content id ("<prefix>_<body>")');
