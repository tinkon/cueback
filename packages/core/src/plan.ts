/**
 * Plan objects: ConsumptionPlan (SPEC.md §11), Recommendation and
 * NewRecommendation (SPEC.md §12), PlanUpdateOp (SPEC.md §13).
 *
 * Plans are assistant-curated but user-controlled: users can remove, reorder,
 * add, replace, and lock recommendations; assistants must never touch
 * user-locked recommendations via `update_plan` (SPEC.md §13, "Locked-item
 * semantics").
 */
import { z } from "zod";
import { TolerantBriefSchema } from "./brief.js";
import { ContentRefSchema, MatchBasisSchema, ResolvedContentSchema } from "./content.js";
import { ID_PREFIXES, contentIdSchema, idSchema } from "./ids.js";
import { AssistantNameSchema } from "./permissions.js";
import { tolerantEnum } from "./tolerance.js";
import { cuebackVersionSchema } from "./version.js";

/** ISO 8601 UTC timestamp on the wire (SPEC.md §2). */
const isoTimestamp = z.string().datetime().max(64);

/** Zero-based position of a recommendation within the plan. */
const positionSchema = z.number().int().nonnegative();

/**
 * Input shape for adding a recommendation (`create_plan` recommendations and
 * the add/replace update ops, SPEC.md §12, §13). Exactly identifies content via
 * a catalog `content_id` OR an unresolved `ref` the server will resolve
 * (JIT-importing if needed); at least one of the two is required.
 */
export const NewRecommendationSchema = z
  .object({
    /**
     * Catalog id of already-resolved content. Any prefixed content id —
     * opaque beyond its prefix (SPEC.md §2); V1 resolves `ep_` ids only,
     * and an unknown id simply fails resolution.
     */
    content_id: contentIdSchema.optional(),
    ref: ContentRefSchema.optional(),
    /** Why the assistant selected this content — shown to the user in the app. */
    why: z.string().max(2000),
    /** Which user goal (from the brief) this recommendation supports. */
    goal_supported: z.string().max(2000).optional(),
    /** True when included as a contrasting/skeptical perspective. */
    contrasting_perspective: z.boolean().optional(),
  })
  .refine(
    (recommendation) => recommendation.content_id !== undefined || recommendation.ref !== undefined,
    {
      message: "NewRecommendation requires content_id or ref",
    },
  );
export type NewRecommendation = z.infer<typeof NewRecommendationSchema>;

/** Per-recommendation consumption summary surfaced by `get_plan` (SPEC.md §12). */
export const ConsumptionStateSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "removed",
]);
export type ConsumptionState = z.infer<typeof ConsumptionStateSchema>;

/** Who added a recommendation. Consumers read the field tolerantly (SPEC.md §3). */
export const RecommendationActorSchema = z.enum(["assistant", "user"]);
export type RecommendationActor = z.infer<typeof RecommendationActorSchema>;

export const RecommendationSchema = z.object({
  recommendation_id: idSchema(ID_PREFIXES.recommendation),
  content: ResolvedContentSchema,
  position: positionSchema,
  /** Why the assistant selected this content. */
  why: z.string().max(2000),
  goal_supported: z.string().max(2000).optional(),
  /** Whether the match was based on metadata or a publisher transcript (must be disclosed). */
  match_basis: tolerantEnum(MatchBasisSchema),
  contrasting_perspective: z.boolean(),
  /** Locked recommendations cannot be removed/replaced by assistants (user-only control). */
  locked: z.boolean(),
  added_by: tolerantEnum(RecommendationActorSchema),
  consumption_state: tolerantEnum(ConsumptionStateSchema).optional(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const ConsumptionPlanSchema = z.object({
  cueback_version: cuebackVersionSchema,
  plan_id: idSchema(ID_PREFIXES.plan),
  /**
   * The plan's short name — what a client puts in chrome and in running
   * sentences that refer to the plan. `brief.goal` is the displayed headline;
   * these two are distinct jobs (SPEC.md §11; §7 "Display").
   */
  title: z.string().max(2000),
  /**
   * The plan's name **as the user set it** (additive, 2026-08-06). Absent
   * until they rename it.
   *
   * User-authored, and that is the whole point: `title` and `brief.goal` are
   * the assistant's expression, so a rename adds a string rather than
   * overwriting either (SPEC.md §1: structure behavior, preserve expression).
   * A producer must never populate this from assistant input, and the protocol
   * defines no way for an assistant to write it — `PlanUpdateOp` has no rename
   * op. Headline precedence for clients: `user_title` → `brief.goal` → `title`,
   * first non-empty (SPEC.md §11; `goal` is `""` on a purged brief).
   * Protocol ceiling 2000 (0.4); the reference app's own form caps at 200.
   */
  user_title: z.string().max(2000).optional(),
  /** As read back: tolerant of enum values added by a newer minor (SPEC.md §3). */
  brief: TolerantBriefSchema,
  recommendations: z.array(RecommendationSchema),
  /** Assistant slug of the creating connection (shown in the app). */
  created_by: AssistantNameSchema,
  created_at: isoTimestamp,
  /** Universal link that opens/claims this plan in the consumption app. */
  player_link: z.string().url().max(2000).optional(),
  /**
   * Total runtime of the non-removed recommendations, in seconds (0.3:
   * promoted from the tool-result envelope into the protocol object).
   * Optional — a timeless medium may not have one; the reference server
   * always populates it (SPEC.md §11).
   */
  total_duration_seconds: z.number().int().nonnegative().optional(),
});
export type ConsumptionPlan = z.infer<typeof ConsumptionPlanSchema>;

/**
 * PlanUpdateOp (SPEC.md §13) — discriminated union on `op`, applied as an atomic
 * batch. Ops arrive by two paths that carry the actor implicitly: the MCP tool
 * `update_plan` (actor = assistant) and the implementation's own user-facing
 * edit path (actor = user); see SPEC.md §13 "Actor attribution".
 * `lock` / `unlock` are user-only; the server must reject them on the
 * assistant path, and must reject assistant `remove` / `replace` / `reorder`
 * against locked recommendations.
 */
export const PlanUpdateOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    recommendation: NewRecommendationSchema,
    /** Insertion position; appends when omitted. */
    position: positionSchema.optional(),
  }),
  z.object({
    op: z.literal("remove"),
    recommendation_id: idSchema(ID_PREFIXES.recommendation),
  }),
  z.object({
    op: z.literal("reorder"),
    recommendation_id: idSchema(ID_PREFIXES.recommendation),
    position: positionSchema,
  }),
  z.object({
    op: z.literal("replace"),
    recommendation_id: idSchema(ID_PREFIXES.recommendation),
    recommendation: NewRecommendationSchema,
  }),
  z.object({
    op: z.literal("lock"),
    recommendation_id: idSchema(ID_PREFIXES.recommendation),
  }),
  z.object({
    op: z.literal("unlock"),
    recommendation_id: idSchema(ID_PREFIXES.recommendation),
  }),
]);
export type PlanUpdateOp = z.infer<typeof PlanUpdateOpSchema>;
