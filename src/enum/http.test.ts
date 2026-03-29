/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import request from "supertest";

import { Controller, GET } from "../annotation";
import { HttpStatus } from "../enum";
import { ResponseEntity, Sapling } from "../helper";

describe("middleware logic", () => {
  let app: ReturnType<typeof e> | null = null;

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
  });

  it.each(
    Object.values(HttpStatus)
      .filter((v) => typeof v === "number")
      .filter((v) => v >= 199) // skip 1xx because they require specific testing logic & Sapling may not support them currently at this time
      .map((n) => [n]),
  )("test all http status %i on / route", async (n) => {
    @Controller({ prefix: "/" })
    class BaseController {
      @GET()
      public get(): ResponseEntity<string> {
        return ResponseEntity.status(n).body("ok");
      }
    }

    app!.use(Sapling.resolve(BaseController));

    const response = await request(app!).get("/").send();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(response.statusCode).toBe(n);
  });
});
