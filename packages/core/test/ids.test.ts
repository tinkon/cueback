import { describe, expect, it } from "vitest";
import { ID_PREFIXES, idSchema, newId } from "../src/index.js";

describe("ids", () => {
  it("newId produces the requested prefix followed by a UUIDv7", () => {
    for (const prefix of Object.values(ID_PREFIXES)) {
      const id = newId(prefix);
      expect(id.startsWith(prefix)).toBe(true);
      const body = id.slice(prefix.length);
      // UUIDv7: version nibble "7" in the third group.
      expect(body).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it("newId produces distinct ids", () => {
    expect(newId(ID_PREFIXES.episode)).not.toBe(newId(ID_PREFIXES.episode));
  });

  it("carries the Cueback 0.2 plan/recommendation prefixes", () => {
    expect(ID_PREFIXES.plan).toBe("pl_");
    expect(ID_PREFIXES.recommendation).toBe("rec_");
  });

  it("idSchema accepts ids with the right prefix", () => {
    const schema = idSchema(ID_PREFIXES.plan);
    expect(schema.safeParse(newId(ID_PREFIXES.plan)).success).toBe(true);
  });

  it("idSchema rejects wrong prefixes and bare prefixes", () => {
    const schema = idSchema(ID_PREFIXES.episode);
    expect(schema.safeParse(newId(ID_PREFIXES.plan)).success).toBe(false);
    expect(schema.safeParse("ep_").success).toBe(false);
    expect(schema.safeParse("0190f7a2-6a3e-7cc0-9f6e-2b1c5d8e4a10").success).toBe(false);
  });
});
