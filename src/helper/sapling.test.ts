/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import superjson from "superjson";
import request from "supertest";

import { Controller, GET, POST, DELETE, PATCH } from "../annotation";
import { ResponseEntity, Sapling } from "../helper";

type Res = {
  x: number;
  a: string;
  c: {
    e: boolean;
  };
  d: Date;
};

describe("sapling logic", () => {
  let app: ReturnType<typeof e> | null = null;

  const testObj: Res = {
    x: 4,
    a: "",
    c: {
      e: false,
    },
    d: new Date(),
  };

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
    Sapling.setDeserializeFn(JSON.parse);
    Sapling.setSerializeFn(JSON.stringify);
  });

  function expectBody(body: Res) {
    expect(body.a).toBe(testObj.a);
    expect(body.x).toBe(testObj.x);
    expect(body.c.e).toBe(testObj.c.e);
  }

  it("test superjson serializer GET /", async () => {
    @Controller()
    class ABCController {
      @GET()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    Sapling.setSerializeFn(superjson.stringify);
    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).get("/");

    expect(response.statusCode).toBe(200);

    const body = response.body as {
      json: unknown;
      meta: { values: { d: Array<unknown> } };
    };
    expect(body.meta).toBeDefined();

    expectBody(superjson.parse(response.text) as Res);
  });

  it("test superjson de-serializer GET /", async () => {
    @Controller()
    class ABCController {
      @POST()
      public async sendAbc(request: Request): Promise<ResponseEntity<unknown>> {
        return ResponseEntity.ok().body(request.body);
      }
    }

    Sapling.setDeserializeFn(superjson.parse);
    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!)
      .post("/")
      .set("Content-Type", "application/json")
      .send(
        superjson.stringify({
          ...testObj,
        }),
      );

    expect(response.statusCode).toBe(200);

    // real type is Res
    const body = response.body as {
      json: unknown;
      meta: { values: { d: Array<unknown> } };
    };
    expect(body.meta).toBeUndefined();
    expect(body.json).toBeUndefined();

    expectBody(response.body as Res);
  });
});
