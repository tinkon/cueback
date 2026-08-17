/**
 * @cueback/core — zod v3 schemas are the source of truth for every
 * media-neutral Cueback wire object (SPEC.md §6 object index); TS types are
 * inferred via z.infer. Wire format is JSON with snake_case keys, mirrored
 * exactly in TS (SPEC.md §2) — no case-mapping layer.
 *
 * This package must never import from an application: it stays extractable.
 */
export * from "./version.js";
export * from "./tolerance.js";
export * from "./ids.js";
export * from "./brief.js";
export * from "./content.js";
export * from "./resolution.js";
export * from "./plan.js";
export * from "./receipt.js";
export * from "./standing.js";
export * from "./feedback.js";
export * from "./handoff.js";
export * from "./permissions.js";
