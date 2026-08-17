import { z } from "zod";
/**
 * Entity name → wire id prefix. The prefix is part of the id and the only
 * part that is not opaque (SPEC.md §2). `show_` / `ep_` stay podcast-internal;
 * `pl_` now reads as "plan".
 */
export declare const ID_PREFIXES: {
    readonly show: "show_";
    readonly episode: "ep_";
    readonly plan: "pl_";
    readonly recommendation: "rec_";
    readonly receipt: "rcpt_";
    readonly connection: "conn_";
    readonly handoff: "hf_";
    readonly device: "dev_";
    readonly user: "user_";
};
export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];
/** Mint a new id: `<prefix>` + UUIDv7. */
export declare function newId<P extends IdPrefix>(prefix: P): `${P}${string}`;
/**
 * Zod schema for an id with the given prefix. Validates the prefix and that a
 * non-empty body follows; it deliberately does not pin the body to UUID
 * syntax so fixtures and future id formats keep parsing. The `.max(128)`
 * (0.4) is the id-class length ceiling — a prefixed UUIDv7 is ~44 chars, so
 * the room for future id formats is generous, not open-ended.
 */
export declare function idSchema(prefix: IdPrefix): z.ZodEffects<z.ZodString, string, string>;
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
export declare const contentIdSchema: z.ZodString;
