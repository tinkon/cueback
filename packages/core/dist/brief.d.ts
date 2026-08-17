/**
 * Brief (SPEC.md §7).
 *
 * The Brief is the ONLY inbound context object an assistant may send when
 * creating a plan — never full conversation history or memory (SPEC.md §7,
 * §21 rule 1). The server stores it with the plan and surfaces it to the app
 * so the user can see what the assistant was told.
 */
import { z } from "zod";
export declare const KnowledgeLevelSchema: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
export type KnowledgeLevel = z.infer<typeof KnowledgeLevelSchema>;
/**
 * How long the server may retain the brief (SPEC.md §7, "Retention semantics"):
 * - `playlist_lifetime` — purged when the plan is archived,
 * - `session` — purged when the creating session/link flow completes,
 * - `persistent` — kept until the user deletes it.
 */
export declare const RetentionSchema: z.ZodEnum<["playlist_lifetime", "session", "persistent"]>;
export type Retention = z.infer<typeof RetentionSchema>;
export declare const BriefSchema: z.ZodObject<{
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
    goal: z.ZodString;
    /** Consumption time available for this plan (briefs use minutes; SPEC.md §2). */
    available_minutes: z.ZodOptional<z.ZodNumber>;
    knowledge_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    /** Free-form curation preferences, e.g. "prefer practitioners". Bounded 0.4: ≤ 50 × 2000. */
    preferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    retention: z.ZodEnum<["playlist_lifetime", "session", "persistent"]>;
}, "strip", z.ZodTypeAny, {
    goal: string;
    retention: "playlist_lifetime" | "session" | "persistent";
    available_minutes?: number | undefined;
    knowledge_level?: "beginner" | "intermediate" | "advanced" | undefined;
    preferences?: string[] | undefined;
}, {
    goal: string;
    retention: "playlist_lifetime" | "session" | "persistent";
    available_minutes?: number | undefined;
    knowledge_level?: "beginner" | "intermediate" | "advanced" | undefined;
    preferences?: string[] | undefined;
}>;
export type Brief = z.infer<typeof BriefSchema>;
/**
 * Brief as a CONSUMER reads it back inside a `ConsumptionPlan` (SPEC.md §3):
 * a newer minor may add `knowledge_level` / `retention` values, and a plan
 * echoing such a brief must still parse under 0.3. Producers (`create_plan`
 * callers) validate against the strict `BriefSchema` above.
 */
export declare const TolerantBriefSchema: z.ZodObject<{
    goal: z.ZodString;
    available_minutes: z.ZodOptional<z.ZodNumber>;
    knowledge_level: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced">>>;
    preferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    retention: z.ZodType<import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">>;
}, "strip", z.ZodTypeAny, {
    goal: string;
    retention: import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">;
    available_minutes?: number | undefined;
    knowledge_level?: import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced"> | undefined;
    preferences?: string[] | undefined;
}, {
    goal: string;
    retention: import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">;
    available_minutes?: number | undefined;
    knowledge_level?: import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced"> | undefined;
    preferences?: string[] | undefined;
}>;
export type TolerantBrief = z.infer<typeof TolerantBriefSchema>;
