/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { NextFunction, Request, Response } from "express";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ParserError, RedirectView, ResponseEntity } from "../helper";
import {
  RequestBody,
  RequestParam,
  RequestQuery,
  ResponseBody,
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
      "",
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
      await _parseOrThrow(schema, { user: { name: 123 } }, "reqbody", "");
      throw new Error("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ParserError);
      const msg = String((e as Error).message);
      expect(msg).toContain("Failed to parse request body with zod");
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

// These cases are enforced by `pnpm typecheck` (tsc -b includes test files):
// each `@ts-expect-error` fails the build if the decorator stops rejecting that handler,
// and each unannotated case fails it if the decorator starts rejecting a valid handler.
describe("compile-time schema checks", () => {
  const Params = z.object({ id: z.coerce.number() });
  const Query = z.object({ page: z.coerce.number() });
  const Body = z.object({ name: z.string() });
  const Out = z.object({ id: z.string() });

  type Params = z.infer<typeof Params>;
  type Query = z.infer<typeof Query>;
  type Body = z.infer<typeof Body>;
  type Out = z.infer<typeof Out>;

  it("accepts request types that match the schema output", () => {
    class C {
      @RequestParam(Params)
      @RequestQuery(Query)
      @RequestBody(Body)
      handle(_req: Request<Params, unknown, Body, Query>) {}
    }

    const schemas = _getValidatorSchema(C, "handle")!;
    expect(schemas.requestParam).toBe(Params);
    expect(schemas.requestQuery).toBe(Query);
    expect(schemas.requestBody).toBe(Body);
  });

  it("rejects request types that disagree with the schema output", () => {
    class C {
      // @ts-expect-error schema coerces id to number, handler reads a string
      @RequestParam(Params)
      params(_req: Request<{ id: string }>) {}

      // @ts-expect-error schema coerces page to number, handler reads a string
      @RequestQuery(Query)
      query(_req: Request<{}, unknown, unknown, { page: string }>) {}

      // @ts-expect-error handler reads `age`, which the schema never produces
      @RequestBody(Body)
      body(_req: Request<{}, unknown, Body & { age: number }>) {}
    }
    void C;
  });

  it("does not check a request left at Express defaults", () => {
    class C {
      @RequestParam(Params)
      @RequestQuery(Query)
      @RequestBody(Body)
      handle(_req: Request) {}
    }
    void C;
  });

  it("checks the request of a (request, response, next) route", () => {
    class C {
      @RequestParam(Params)
      ok(_req: Request<Params>, _res: Response, _next: NextFunction) {}

      // @ts-expect-error params mismatch is caught with extra parameters present
      @RequestParam(Params)
      bad(_req: Request<{ id: string }>, _res: Response, _next: NextFunction) {}
    }
    void C;
  });

  it("checks the request in the second position of an error middleware", () => {
    class C {
      @RequestBody(Body)
      ok(
        _err: unknown,
        _req: Request<{}, unknown, Body>,
        _res: Response,
        _next: NextFunction,
      ) {}

      // @ts-expect-error body mismatch is caught after the `err` parameter
      @RequestBody(Body)
      bad(
        _err: unknown,
        _req: Request<{}, unknown, { name: number }>,
        _res: Response,
        _next: NextFunction,
      ) {}
    }
    void C;
  });

  it("accepts returned bodies the schema accepts, including extra fields it strips", () => {
    class C {
      @ResponseBody(Out)
      exact(): ResponseEntity<Out> {
        return ResponseEntity.ok().body({ id: "1" });
      }

      @ResponseBody(Out)
      async extra(): Promise<ResponseEntity<Out & { secret: string }>> {
        return ResponseEntity.ok().body({ id: "1", secret: "s" });
      }

      @ResponseBody(Out)
      orRedirect(): ResponseEntity<Out> | RedirectView {
        return RedirectView.redirect("/");
      }
    }

    expect(_getValidatorSchema(C, "exact")!.responseBody).toBe(Out);
  });

  it("rejects returned bodies the schema does not accept", () => {
    class C {
      // @ts-expect-error schema wants id: string
      @ResponseBody(Out)
      sync(): ResponseEntity<{ id: number }> {
        return ResponseEntity.ok().body({ id: 1 });
      }

      // @ts-expect-error mismatch is found through the Promise
      @ResponseBody(Out)
      async promised(): Promise<ResponseEntity<{ id: number }>> {
        return ResponseEntity.ok().body({ id: 1 });
      }

      // @ts-expect-error mismatch is found inside a union with RedirectView
      @ResponseBody(Out)
      orRedirect(): ResponseEntity<{ id: number }> | RedirectView {
        return RedirectView.redirect("/");
      }
    }
    void C;
  });

  it("does not check handlers that return no ResponseEntity or return any", () => {
    class C {
      @ResponseBody(Out)
      nothing() {}

      @ResponseBody(Out)
      redirect(): RedirectView {
        return RedirectView.redirect("/");
      }

      @ResponseBody(Out)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      untyped(): any {
        return null;
      }
    }
    void C;
  });
});
