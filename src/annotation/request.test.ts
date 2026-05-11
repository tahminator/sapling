/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ParserError } from "../exception";
import {
  RequestBody,
  RequestParam,
  RequestQuery,
  _getRequestSchemas,
  _parseOrThrow,
} from "./request";

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

    const schemas = _getRequestSchemas(C, "foo");
    expect(schemas).toBeDefined();
    expect(schemas!.body).toBe(bodySchema);
    expect(schemas!.param).toBe(paramSchema);

    expect(() => {
      class D {
        @RequestBody(z.string())
        @RequestBody(z.string())
        bar(_req: unknown) {
          return;
        }
      }
      void D;
    }).toThrow(/Duplicate request schema for "body"/);
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

    expect(_getRequestSchemas(C, "a")).toBeUndefined();
    const bSchemas = _getRequestSchemas(C, "b");
    expect(bSchemas).toBeDefined();
    expect(bSchemas!.query).toBe(querySchema);
  });
});
