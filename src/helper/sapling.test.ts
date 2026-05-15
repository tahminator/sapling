/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import superjson from "superjson";
import request from "supertest";

import { Controller, GET, POST } from "../annotation";
import { HttpStatus } from "../enum";
import { ResponseStatusError } from "../helper";
import { ResponseEntity, Sapling } from "../helper";
import { DefaultResponseStatusErrorMiddleware } from "../middleware/default/error/responsestatus";

type Res = {
  x: number;
  a: string;
  c: {
    e: boolean;
  };
  d: Date;
};

const testObj: Res = {
  x: 4,
  a: "",
  c: {
    e: false,
  },
  d: new Date(),
};

describe("sapling serialize/deserialize logic", () => {
  let app: ReturnType<typeof e> | null = null;

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

describe("sapling response status middleware logic", () => {
  let app: ReturnType<typeof e> | null = null;

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
    Sapling.setDeserializeFn(JSON.parse);
    Sapling.setSerializeFn(JSON.stringify);
  });

  it("test default response status middleware GET /", async () => {
    @Controller()
    class BaseController {
      @GET()
      public getAbc(): ResponseEntity<Res> {
        throw new ResponseStatusError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Something went wrong",
        );
      }
    }

    app!.use(Sapling.resolve(BaseController));
    app!.use(Sapling.resolve(DefaultResponseStatusErrorMiddleware));

    const response = await request(app!)
      .get("/")
      .set("Content-Type", "application/json")
      .send();

    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    const body = response.body as {
      message: string;
    };
    expect(body.message).toBe("Something went wrong");
  });

  it("resolve controller not registered", () => {
    try {
      class E {}
      Sapling.resolve(E);
    } catch (e) {
      expect(e!.toString()).toContain("Error: Controller cannot be found");
    }
  });
});

describe("Sapling.json", () => {
  let app: ReturnType<typeof e> | null = null;

  beforeEach(() => {
    app = e();
    app.use(e.text({ type: "application/json" }));
  });

  const registerApp = () => {
    const json = vi.spyOn(Sapling, "json");
    // calls Sapling.json under the hood
    app!.use(Sapling.json());
    return json;
  };

  it("content-type is not json", async () => {
    const jsonSpy = registerApp();
    const deserializeSpy = vi.spyOn(Sapling, "deserialize");

    @Controller()
    class BaseController {
      @POST()
      public post(request: e.Request): ResponseEntity<Res> {
        return ResponseEntity.ok().body(request.body);
      }
    }

    app!.use(Sapling.resolve(BaseController));

    await request(app!)
      .get("/")
      .set("Content-Type", "application/xml")
      .send("<hi></hi>");

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(deserializeSpy).not.toHaveBeenCalled();
  });

  it("request was serialized already", async () => {
    // pre-stringify to avoid messing with mock
    const BODY = JSON.stringify({ hi: 1 });

    const jsonParseSpy = vi.spyOn(JSON, "parse");
    const jsonStringifySpy = vi.spyOn(JSON, "stringify");

    app!.use((req, _, next) => {
      req.body = JSON.parse(req.body);
      next();
    });

    const jsonSpy = registerApp();
    const deserializeSpy = vi.spyOn(Sapling, "deserialize");

    @Controller()
    class BaseController {
      @POST()
      public post(request: e.Request): ResponseEntity<Res> {
        return ResponseEntity.ok().body(request.body);
      }
    }

    app!.use(Sapling.resolve(BaseController));

    await request(app!)
      .post("/")
      .set("Content-Type", "application/json")
      .send(BODY);

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(deserializeSpy).toHaveBeenCalledTimes(1);
    expect(deserializeSpy).toHaveBeenCalledAfter(jsonParseSpy);
    expect(deserializeSpy).toHaveBeenCalledAfter(jsonStringifySpy);
    expect(jsonStringifySpy).toHaveBeenCalledTimes(1);
  });
});
