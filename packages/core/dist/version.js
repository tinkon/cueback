/**
 * Protocol version carried by top-level Cueback objects as `cueback_version`
 * (SPEC.md §3, "Where it appears"). Bump only alongside a protocol revision
 * written into the specification's version history (SPEC.md §4).
 *
 * Producer vs consumer (SPEC.md §3): PRODUCERS stamp `CUEBACK_VERSION` exactly;
 * CONSUMERS accept any 0.x version (`ACCEPTED_CUEBACK_VERSION`), because
 * minor versions are additive and a 0.4 consumer must parse a 0.5 document —
 * and stored 0.3 documents remain legal (mixed versions in one page,
 * SPEC.md §4). A major bump (1.0) is the only version a consumer may reject
 * outright.
 *
 * 0.4 (2026-08-09) is the final pre-publication break: string bounds on every
 * protocol string, and `standing_feedback` promoted into the protocol
 * (standing.ts). Additive-only resumes at publication.
 */
import { z } from "zod";
/** What 0.4 producers stamp on every top-level document they emit. */
export const CUEBACK_VERSION = "0.4";
/** The version range a 0.x consumer accepts: any minor (optionally patched) of the 0 line. */
export const ACCEPTED_CUEBACK_VERSION = /^0\.\d+(\.\d+)?$/;
/**
 * `cueback_version` as document schemas validate it — tolerant of future
 * minors by construction (SPEC.md §3). Not a literal: `ConsumptionPlanSchema`
 * and friends are consumer-side parsers as much as producer-side types.
 */
export const cuebackVersionSchema = z
    .string()
    .max(16)
    .regex(ACCEPTED_CUEBACK_VERSION, "expected a 0.x cueback_version");
//# sourceMappingURL=version.js.map