/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ParserError } from "../helper";
import {
  RequestBody,
  RequestParam,
  RequestQuery,
  _getValidatorSchema,
  _parseOrThrow,
} from "./validator";

describe("request annotation + parsing", () => {
  it("stores schemas per method and rejects duplicates", () => {
    const bodySchema = z.object({ name: z.string() });
    const paramSchema = z.object({ id: z.string() });

    class C {
      @RequestBody(bodySchema)
      @RequestParam(paramSchema)
      foo(_req: unknown) {
        return;
      }
    }

    const schemas = _getValidatorSchema(C, "foo");
    expect(schemas).toBeDefined();
    expect(schemas!.requestBody).toBe(bodySchema);
    expect(schemas!.requestParam).toBe(paramSchema);

    expect(() => {
      class D {
        @RequestBody(z.string())
        @RequestBody(z.string())
        bar(_req: unknown) {
          return;
        }
      }
      void D;
    }).toThrow(/Duplicate schema for "requestBody"/);
  });

  it("_parseOrThrow returns parsed value when valid", async () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = await _parseOrThrow(
      schema,
      { name: "Alice", age: 30 },
      "reqbody",
    );
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("_parseOrThrow throws ParserError with formatted message when invalid", async () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
      }),
    });

    try {
      await _parseOrThrow(schema, { user: { name: 123 } }, "reqbody");
      throw new Error("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ParserError);
      const msg = String((e as Error).message);
      expect(msg).toContain("zod failed to parse request body");
      expect(msg).toContain("user.name");
    }
  });

  it("RequestQuery stores schema for another method independently", () => {
    const querySchema = z.object({ page: z.number() });

    class C {
      a(_req: unknown) {
        return;
      }

      @RequestQuery(querySchema)
      b(_req: unknown) {
        return;
      }
    }

    expect(_getValidatorSchema(C, "a")).toBeUndefined();
    const bSchemas = _getValidatorSchema(C, "b");
    expect(bSchemas).toBeDefined();
    expect(bSchemas!.requestQuery).toBe(querySchema);
  });
});
