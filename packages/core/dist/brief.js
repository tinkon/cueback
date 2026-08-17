/**
 * Brief (SPEC.md §7).
 *
 * The Brief is the ONLY inbound context object an assistant may send when
 * creating a plan — never full conversation history or memory (SPEC.md §7,
 * §21 rule 1). The server stores it with the plan and surfaces it to the app
 * so the user can see what the assistant was told.
 */
import { z } from "zod";
import { tolerantEnum } from "./tolerance.js";
export const KnowledgeLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
/**
 * How long the server may retain the brief (SPEC.md §7, "Retention semantics"):
 * - `playlist_lifetime` — purged when the plan is archived,
 * - `session` — purged when the creating session/link flow completes,
 * - `persistent` — kept until the user deletes it.
 */
export const RetentionSchema = z.enum(["playlist_lifetime", "session", "persistent"]);
export const BriefSchema = z.object({
    /**
     * What the user is trying to learn / decide, in the assistant's words — and
     * user-facing display text: it is the headline a client shows for the plan,
     * set large (SPEC.md §7, "Display"). Write ONE scannable line,
     * aim ≤ ~60 characters. Everything else the plan is *about* — what it covers,
     * why, constraints — belongs in `preferences` or in a recommendation's `why`,
     * not packed into `goal`: a paragraph here is truncated by whatever renders
     * the headline. The `.max(2000)` (0.4) is a payload ceiling, not the display
     * guidance — the ~60-char aim stays advisory, in the `.describe()` below.
     */
    goal: z
        .string()
        .min(1)
        .max(2000)
        .describe("The user's objective in the assistant's words, AND the headline a client displays for this plan. ONE scannable line (aim ≤ ~60 chars) — put coverage, rationale, and constraints in preferences or a recommendation's why, never in goal"),
    /** Consumption time available for this plan (briefs use minutes; SPEC.md §2). */
    available_minutes: z.number().int().positive().optional(),
    knowledge_level: KnowledgeLevelSchema.optional().describe("OMIT unless the user stated their level or their words clearly imply " +
        "it. Never guess a default: an invented 'intermediate' steers every " +
        "future edition off what the user actually said. Absent is the honest " +
        "value for an unstated level."),
    /** Free-form curation preferences, e.g. "prefer practitioners". Bounded 0.4: ≤ 50 × 2000. */
    preferences: z.array(z.string().max(2000)).max(50).optional(),
    retention: RetentionSchema,
});
/**
 * Brief as a CONSUMER reads it back inside a `ConsumptionPlan` (SPEC.md §3):
 * a newer minor may add `knowledge_level` / `retention` values, and a plan
 * echoing such a brief must still parse under 0.3. Producers (`create_plan`
 * callers) validate against the strict `BriefSchema` above.
 */
export const TolerantBriefSchema = z.object({
    // No .min(1): a purged playlist_lifetime brief reads back with goal "".
    goal: z.string().max(2000),
    available_minutes: z.number().int().positive().optional(),
    knowledge_level: tolerantEnum(KnowledgeLevelSchema).optional(),
    preferences: z.array(z.string().max(2000)).max(50).optional(),
    retention: tolerantEnum(RetentionSchema),
});
//# sourceMappingURL=brief.js.map