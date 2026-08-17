/**
 * Per-assistant permissions (SPEC.md §19; privacy rule 5 at §21).
 *
 * Every MCP call is authenticated as exactly one AssistantConnection; scopes
 * gate what that assistant may do. Connections are independently revocable:
 * a user can disconnect one assistant without touching another, and
 * revocation takes effect immediately.
 *
 * STATUS: the *semantics* govern the whole tool surface — one connection per
 * MCP session, every call authorized against that connection's scopes. As of
 * 0.4 the `AssistantConnection` *wire document* is normative too: the
 * reference implementation serializes it on its connections listing
 * (SPEC.md §19).
 */
import { z } from "zod";
/**
 * Which assistant a connection belongs to (SPEC.md §19).
 *
 * 0.3: an OPEN slug (`^[a-z0-9_-]{1,32}$`), no longer a closed enum — the
 * protocol is vendor-neutral and new assistants must not need a core release.
 * The four `KNOWN_ASSISTANT_NAMES` are documented conventions clients may
 * render prettily ("chatgpt" → "ChatGPT"); any other slug is legal and
 * SHOULD be rendered by capitalizing the slug. `"other"` remains the
 * convention for a deliberately unnamed assistant.
 */
export declare const AssistantNameSchema: z.ZodString;
export type AssistantName = z.infer<typeof AssistantNameSchema>;
/** Conventional assistant slugs with well-known display names. */
export declare const KNOWN_ASSISTANT_NAMES: readonly ["chatgpt", "claude", "gemini", "other"];
/**
 * Permission scopes (SPEC.md §19):
 * - `plans:read` — get_plan
 * - `plans:write` — create_plan / update_plan / import_feed / create_player_link
 * - `receipts:read` — get_recent_receipts, the `already_listened` bit on
 *   resolved content, and the `standing_feedback` envelope keys (SPEC.md §17)
 * - `feedback:write` — record_feedback
 * - `handoffs:read` — receive "Ask assistant" handoffs
 */
export declare const ScopeSchema: z.ZodEnum<["plans:read", "plans:write", "receipts:read", "feedback:write", "handoffs:read"]>;
export type Scope = z.infer<typeof ScopeSchema>;
export declare const AssistantConnectionSchema: z.ZodObject<{
    connection_id: z.ZodEffects<z.ZodString, string, string>;
    assistant_name: z.ZodString;
    /** As read off a document: scopes added by a newer minor parse (SPEC.md §3). */
    scopes: z.ZodArray<z.ZodType<import("./tolerance.js").Tolerant<"plans:read" | "plans:write" | "receipts:read" | "feedback:write" | "handoffs:read">, z.ZodTypeDef, import("./tolerance.js").Tolerant<"plans:read" | "plans:write" | "receipts:read" | "feedback:write" | "handoffs:read">>, "many">;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    connection_id: string;
    assistant_name: string;
    scopes: import("./tolerance.js").Tolerant<"plans:read" | "plans:write" | "receipts:read" | "feedback:write" | "handoffs:read">[];
}, {
    created_at: string;
    connection_id: string;
    assistant_name: string;
    scopes: import("./tolerance.js").Tolerant<"plans:read" | "plans:write" | "receipts:read" | "feedback:write" | "handoffs:read">[];
}>;
export type AssistantConnection = z.infer<typeof AssistantConnectionSchema>;
