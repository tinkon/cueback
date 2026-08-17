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
/**
 * Input shape for adding a recommendation (`create_plan` recommendations and
 * the add/replace update ops, SPEC.md §12, §13). Exactly identifies content via
 * a catalog `content_id` OR an unresolved `ref` the server will resolve
 * (JIT-importing if needed); at least one of the two is required.
 */
export declare const NewRecommendationSchema: z.ZodEffects<z.ZodObject<{
    /**
     * Catalog id of already-resolved content. Any prefixed content id —
     * opaque beyond its prefix (SPEC.md §2); V1 resolves `ep_` ids only,
     * and an unknown id simply fails resolution.
     */
    content_id: z.ZodOptional<z.ZodString>;
    ref: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
        content_type: z.ZodLiteral<"podcast_episode">;
        episode_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        guid: z.ZodOptional<z.ZodString>;
        feed_url: z.ZodOptional<z.ZodString>;
        episode_url: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        show_title: z.ZodOptional<z.ZodString>;
        published_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    }, {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    }>, z.ZodObject<{
        content_type: z.ZodLiteral<"article">;
        url: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        published_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    }, {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    }>]>, {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    }, {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    }>, z.ZodEffects<z.ZodObject<{
        content_type: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>]>>;
    /** Why the assistant selected this content — shown to the user in the app. */
    why: z.ZodString;
    /** Which user goal (from the brief) this recommendation supports. */
    goal_supported: z.ZodOptional<z.ZodString>;
    /** True when included as a contrasting/skeptical perspective. */
    contrasting_perspective: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    why: string;
    content_id?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    ref?: {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    } | z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    goal_supported?: string | undefined;
}, {
    why: string;
    content_id?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    ref?: {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    } | z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    goal_supported?: string | undefined;
}>, {
    why: string;
    content_id?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    ref?: {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    } | z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    goal_supported?: string | undefined;
}, {
    why: string;
    content_id?: string | undefined;
    contrasting_perspective?: boolean | undefined;
    ref?: {
        content_type: "podcast_episode";
        episode_id?: string | undefined;
        guid?: string | undefined;
        feed_url?: string | undefined;
        episode_url?: string | undefined;
        title?: string | undefined;
        show_title?: string | undefined;
        published_at?: string | undefined;
    } | {
        content_type: "article";
        url: string;
        title?: string | undefined;
        published_at?: string | undefined;
        author?: string | undefined;
    } | z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    goal_supported?: string | undefined;
}>;
export type NewRecommendation = z.infer<typeof NewRecommendationSchema>;
/** Per-recommendation consumption summary surfaced by `get_plan` (SPEC.md §12). */
export declare const ConsumptionStateSchema: z.ZodEnum<["not_started", "in_progress", "completed", "removed"]>;
export type ConsumptionState = z.infer<typeof ConsumptionStateSchema>;
/** Who added a recommendation. Consumers read the field tolerantly (SPEC.md §3). */
export declare const RecommendationActorSchema: z.ZodEnum<["assistant", "user"]>;
export type RecommendationActor = z.infer<typeof RecommendationActorSchema>;
export declare const RecommendationSchema: z.ZodObject<{
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
    content: z.ZodUnion<[z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
        content_type: z.ZodLiteral<"podcast_episode">;
        episode_id: z.ZodEffects<z.ZodString, string, string>;
        show_id: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodString;
        show_title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        duration_seconds: z.ZodNumber;
        published_at: z.ZodString;
        artwork_url: z.ZodOptional<z.ZodString>;
        has_publisher_transcript: z.ZodBoolean;
        already_listened: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        content_type: "podcast_episode";
        episode_id: string;
        title: string;
        show_title: string;
        published_at: string;
        show_id: string;
        duration_seconds: number;
        has_publisher_transcript: boolean;
        already_listened: boolean;
        description?: string | undefined;
        artwork_url?: string | undefined;
    }, {
        content_type: "podcast_episode";
        episode_id: string;
        title: string;
        show_title: string;
        published_at: string;
        show_id: string;
        duration_seconds: number;
        has_publisher_transcript: boolean;
        already_listened: boolean;
        description?: string | undefined;
        artwork_url?: string | undefined;
    }>, z.ZodObject<{
        content_type: z.ZodLiteral<"article">;
        url: z.ZodString;
        title: z.ZodString;
        author: z.ZodOptional<z.ZodString>;
        published_at: z.ZodOptional<z.ZodString>;
        word_count: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    }, {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    }>]>, z.ZodEffects<z.ZodObject<{
        content_type: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>]>;
    position: z.ZodNumber;
    /** Why the assistant selected this content. */
    why: z.ZodString;
    goal_supported: z.ZodOptional<z.ZodString>;
    /** Whether the match was based on metadata or a publisher transcript (must be disclosed). */
    match_basis: z.ZodType<import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">>;
    contrasting_perspective: z.ZodBoolean;
    /** Locked recommendations cannot be removed/replaced by assistants (user-only control). */
    locked: z.ZodBoolean;
    added_by: z.ZodType<import("./tolerance.js").Tolerant<"user" | "assistant">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"user" | "assistant">>;
    consumption_state: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress">>>;
}, "strip", z.ZodTypeAny, {
    recommendation_id: string;
    why: string;
    contrasting_perspective: boolean;
    content: z.objectOutputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
        content_type: "podcast_episode";
        episode_id: string;
        title: string;
        show_title: string;
        published_at: string;
        show_id: string;
        duration_seconds: number;
        has_publisher_transcript: boolean;
        already_listened: boolean;
        description?: string | undefined;
        artwork_url?: string | undefined;
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    };
    position: number;
    match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
    locked: boolean;
    added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
    goal_supported?: string | undefined;
    consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
}, {
    recommendation_id: string;
    why: string;
    contrasting_perspective: boolean;
    content: z.objectInputType<{
        content_type: z.ZodString;
    }, z.ZodTypeAny, "passthrough"> | {
        content_type: "podcast_episode";
        episode_id: string;
        title: string;
        show_title: string;
        published_at: string;
        show_id: string;
        duration_seconds: number;
        has_publisher_transcript: boolean;
        already_listened: boolean;
        description?: string | undefined;
        artwork_url?: string | undefined;
    } | {
        content_type: "article";
        title: string;
        url: string;
        published_at?: string | undefined;
        author?: string | undefined;
        word_count?: number | undefined;
    };
    position: number;
    match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
    locked: boolean;
    added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
    goal_supported?: string | undefined;
    consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
}>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export declare const ConsumptionPlanSchema: z.ZodObject<{
    cueback_version: z.ZodString;
    plan_id: z.ZodEffects<z.ZodString, string, string>;
    /**
     * The plan's short name — what a client puts in chrome and in running
     * sentences that refer to the plan. `brief.goal` is the displayed headline;
     * these two are distinct jobs (SPEC.md §11; §7 "Display").
     */
    title: z.ZodString;
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
    user_title: z.ZodOptional<z.ZodString>;
    /** As read back: tolerant of enum values added by a newer minor (SPEC.md §3). */
    brief: z.ZodObject<{
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
    recommendations: z.ZodArray<z.ZodObject<{
        recommendation_id: z.ZodEffects<z.ZodString, string, string>;
        content: z.ZodUnion<[z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
            content_type: z.ZodLiteral<"podcast_episode">;
            episode_id: z.ZodEffects<z.ZodString, string, string>;
            show_id: z.ZodEffects<z.ZodString, string, string>;
            title: z.ZodString;
            show_title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            duration_seconds: z.ZodNumber;
            published_at: z.ZodString;
            artwork_url: z.ZodOptional<z.ZodString>;
            has_publisher_transcript: z.ZodBoolean;
            already_listened: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        }, {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        }>, z.ZodObject<{
            content_type: z.ZodLiteral<"article">;
            url: z.ZodString;
            title: z.ZodString;
            author: z.ZodOptional<z.ZodString>;
            published_at: z.ZodOptional<z.ZodString>;
            word_count: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        }, {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        }>]>, z.ZodEffects<z.ZodObject<{
            content_type: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>]>;
        position: z.ZodNumber;
        /** Why the assistant selected this content. */
        why: z.ZodString;
        goal_supported: z.ZodOptional<z.ZodString>;
        /** Whether the match was based on metadata or a publisher transcript (must be disclosed). */
        match_basis: z.ZodType<import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">>;
        contrasting_perspective: z.ZodBoolean;
        /** Locked recommendations cannot be removed/replaced by assistants (user-only control). */
        locked: z.ZodBoolean;
        added_by: z.ZodType<import("./tolerance.js").Tolerant<"user" | "assistant">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"user" | "assistant">>;
        consumption_state: z.ZodOptional<z.ZodType<import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress">>>;
    }, "strip", z.ZodTypeAny, {
        recommendation_id: string;
        why: string;
        contrasting_perspective: boolean;
        content: z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        } | {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        };
        position: number;
        match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
        locked: boolean;
        added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
        goal_supported?: string | undefined;
        consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
    }, {
        recommendation_id: string;
        why: string;
        contrasting_perspective: boolean;
        content: z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        } | {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        };
        position: number;
        match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
        locked: boolean;
        added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
        goal_supported?: string | undefined;
        consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
    }>, "many">;
    /** Assistant slug of the creating connection (shown in the app). */
    created_by: z.ZodString;
    created_at: z.ZodString;
    /** Universal link that opens/claims this plan in the consumption app. */
    player_link: z.ZodOptional<z.ZodString>;
    /**
     * Total runtime of the non-removed recommendations, in seconds (0.3:
     * promoted from the tool-result envelope into the protocol object).
     * Optional — a timeless medium may not have one; the reference server
     * always populates it (SPEC.md §11).
     */
    total_duration_seconds: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    cueback_version: string;
    plan_id: string;
    created_at: string;
    brief: {
        goal: string;
        retention: import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">;
        available_minutes?: number | undefined;
        knowledge_level?: import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced"> | undefined;
        preferences?: string[] | undefined;
    };
    recommendations: {
        recommendation_id: string;
        why: string;
        contrasting_perspective: boolean;
        content: z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        } | {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        };
        position: number;
        match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
        locked: boolean;
        added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
        goal_supported?: string | undefined;
        consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
    }[];
    created_by: string;
    user_title?: string | undefined;
    player_link?: string | undefined;
    total_duration_seconds?: number | undefined;
}, {
    title: string;
    cueback_version: string;
    plan_id: string;
    created_at: string;
    brief: {
        goal: string;
        retention: import("./tolerance.js").Tolerant<"playlist_lifetime" | "session" | "persistent">;
        available_minutes?: number | undefined;
        knowledge_level?: import("./tolerance.js").Tolerant<"beginner" | "intermediate" | "advanced"> | undefined;
        preferences?: string[] | undefined;
    };
    recommendations: {
        recommendation_id: string;
        why: string;
        contrasting_perspective: boolean;
        content: z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | {
            content_type: "podcast_episode";
            episode_id: string;
            title: string;
            show_title: string;
            published_at: string;
            show_id: string;
            duration_seconds: number;
            has_publisher_transcript: boolean;
            already_listened: boolean;
            description?: string | undefined;
            artwork_url?: string | undefined;
        } | {
            content_type: "article";
            title: string;
            url: string;
            published_at?: string | undefined;
            author?: string | undefined;
            word_count?: number | undefined;
        };
        position: number;
        match_basis: import("./tolerance.js").Tolerant<"metadata" | "publisher_transcript">;
        locked: boolean;
        added_by: import("./tolerance.js").Tolerant<"user" | "assistant">;
        goal_supported?: string | undefined;
        consumption_state?: import("./tolerance.js").Tolerant<"completed" | "removed" | "not_started" | "in_progress"> | undefined;
    }[];
    created_by: string;
    user_title?: string | undefined;
    player_link?: string | undefined;
    total_duration_seconds?: number | undefined;
}>;
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
export declare const PlanUpdateOpSchema: z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
    op: z.ZodLiteral<"add">;
    recommendation: z.ZodEffects<z.ZodObject<{
        /**
         * Catalog id of already-resolved content. Any prefixed content id —
         * opaque beyond its prefix (SPEC.md §2); V1 resolves `ep_` ids only,
         * and an unknown id simply fails resolution.
         */
        content_id: z.ZodOptional<z.ZodString>;
        ref: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
            content_type: z.ZodLiteral<"podcast_episode">;
            episode_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            guid: z.ZodOptional<z.ZodString>;
            feed_url: z.ZodOptional<z.ZodString>;
            episode_url: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
            show_title: z.ZodOptional<z.ZodString>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        }, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        }>, z.ZodObject<{
            content_type: z.ZodLiteral<"article">;
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            author: z.ZodOptional<z.ZodString>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }, {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }>]>, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }>, z.ZodEffects<z.ZodObject<{
            content_type: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>]>>;
        /** Why the assistant selected this content — shown to the user in the app. */
        why: z.ZodString;
        /** Which user goal (from the brief) this recommendation supports. */
        goal_supported: z.ZodOptional<z.ZodString>;
        /** True when included as a contrasting/skeptical perspective. */
        contrasting_perspective: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }>, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }>;
    /** Insertion position; appends when omitted. */
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    recommendation: {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    };
    op: "add";
    position?: number | undefined;
}, {
    recommendation: {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    };
    op: "add";
    position?: number | undefined;
}>, z.ZodObject<{
    op: z.ZodLiteral<"remove">;
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    recommendation_id: string;
    op: "remove";
}, {
    recommendation_id: string;
    op: "remove";
}>, z.ZodObject<{
    op: z.ZodLiteral<"reorder">;
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
    position: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    recommendation_id: string;
    position: number;
    op: "reorder";
}, {
    recommendation_id: string;
    position: number;
    op: "reorder";
}>, z.ZodObject<{
    op: z.ZodLiteral<"replace">;
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
    recommendation: z.ZodEffects<z.ZodObject<{
        /**
         * Catalog id of already-resolved content. Any prefixed content id —
         * opaque beyond its prefix (SPEC.md §2); V1 resolves `ep_` ids only,
         * and an unknown id simply fails resolution.
         */
        content_id: z.ZodOptional<z.ZodString>;
        ref: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodDiscriminatedUnion<"content_type", [z.ZodObject<{
            content_type: z.ZodLiteral<"podcast_episode">;
            episode_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            guid: z.ZodOptional<z.ZodString>;
            feed_url: z.ZodOptional<z.ZodString>;
            episode_url: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
            show_title: z.ZodOptional<z.ZodString>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        }, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        }>, z.ZodObject<{
            content_type: z.ZodLiteral<"article">;
            url: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            author: z.ZodOptional<z.ZodString>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }, {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }>]>, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }, {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        }>, z.ZodEffects<z.ZodObject<{
            content_type: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>]>>;
        /** Why the assistant selected this content — shown to the user in the app. */
        why: z.ZodString;
        /** Which user goal (from the brief) this recommendation supports. */
        goal_supported: z.ZodOptional<z.ZodString>;
        /** True when included as a contrasting/skeptical perspective. */
        contrasting_perspective: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }>, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }, {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    recommendation: {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectOutputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    };
    recommendation_id: string;
    op: "replace";
}, {
    recommendation: {
        why: string;
        content_id?: string | undefined;
        contrasting_perspective?: boolean | undefined;
        ref?: {
            content_type: "podcast_episode";
            episode_id?: string | undefined;
            guid?: string | undefined;
            feed_url?: string | undefined;
            episode_url?: string | undefined;
            title?: string | undefined;
            show_title?: string | undefined;
            published_at?: string | undefined;
        } | {
            content_type: "article";
            url: string;
            title?: string | undefined;
            published_at?: string | undefined;
            author?: string | undefined;
        } | z.objectInputType<{
            content_type: z.ZodString;
        }, z.ZodTypeAny, "passthrough"> | undefined;
        goal_supported?: string | undefined;
    };
    recommendation_id: string;
    op: "replace";
}>, z.ZodObject<{
    op: z.ZodLiteral<"lock">;
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    recommendation_id: string;
    op: "lock";
}, {
    recommendation_id: string;
    op: "lock";
}>, z.ZodObject<{
    op: z.ZodLiteral<"unlock">;
    recommendation_id: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    recommendation_id: string;
    op: "unlock";
}, {
    recommendation_id: string;
    op: "unlock";
}>]>;
export type PlanUpdateOp = z.infer<typeof PlanUpdateOpSchema>;
