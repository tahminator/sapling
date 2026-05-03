/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import request from "supertest";

import { RedirectView, ResponseEntity, Sapling } from "../helper";
import { Controller } from "./controller";
import { GET, POST, DELETE, PATCH, HEAD, PUT, OPTIONS, _Route } from "./route";

type Res = {
  x: number;
  a: string;
  c: {
    e: boolean;
  };
};

describe("controller logic", () => {
  let app: ReturnType<typeof e> | null = null;

  const testObj: Res = {
    x: 4,
    a: "",
    c: {
      e: false,
    },
  };

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
  });

  function expectBody(body: Res) {
    expect(body.a).toBe(testObj.a);
    expect(body.x).toBe(testObj.x);
    expect(body.c.e).toBe(testObj.c.e);
  }

  it("test default GET /", async () => {
    @Controller()
    class ABCController {
      @GET()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).get("/");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test GET /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @GET()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).get("/abc");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test POST /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @POST()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).post("/abc").send({});

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test DELETE /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @DELETE()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).delete("/abc");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test PATCH /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @PATCH()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).patch("/abc");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test PUT /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @PUT()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).put("/abc");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test HEAD /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @HEAD()
      public getAbc(): ResponseEntity<undefined> {
        return ResponseEntity.ok().body(undefined);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).head("/abc");

    expect(response.statusCode).toBe(200);
  });

  it("test OPTIONS /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @OPTIONS()
      public getAbc(): ResponseEntity<Res> {
        return ResponseEntity.ok().body(testObj);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!).options("/abc");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test POST /abc JSON body", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @POST()
      public getAbc(request: e.Request): ResponseEntity<unknown> {
        return ResponseEntity.ok().body(request.body);
      }
    }

    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!)
      .post("/abc")
      .send(testObj)
      .set("Accept", "application/json");

    expect(response.statusCode).toBe(200);

    const body = response.body as Res;
    expectBody(body);
  });

  it("test POST /abc text body", async () => {
    const STR = "hi";

    @Controller({ prefix: "/abc" })
    class ABCController {
      @POST()
      public getAbc(request: e.Request, response: e.Response): void {
        response.setHeader("Content-Type", "text/plain");
        response.send(request.body);
      }
    }

    app?.use(e.text());
    app?.use(Sapling.resolve(ABCController));

    const response = await request(app!)
      .post("/abc")
      .set("Content-Type", "text/plain")
      .set("Accept", "text/plain")
      .send(STR);

    expect(response.statusCode).toBe(200);

    const resText = response.text as string;
    expect(resText).toBe(STR);
  });

  it("test duplicate non-middleware route /abc text body", async () => {
    try {
      @Controller({ prefix: "/abc" })
      class ABCController {
        @POST()
        public getAbc(request: e.Request, response: e.Response): void {
          response.setHeader("Content-Type", "text/plain");
          response.send(request.body);
        }

        @POST()
        public getAbc2(request: e.Request, response: e.Response): void {
          response.setHeader("Content-Type", "text/plain");
          response.send(request.body);
        }
      }

      app!.use(e.text());
      app!.use(Sapling.resolve(ABCController));
    } catch (e) {
      expect(e!.toString()).toEqual(
        'Error: Duplicate route [POST] "/abc" detected in controller "ABCController"',
      );
    }
  });

  it("test RedirectView /abc", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @GET()
      public goToDEF(): RedirectView {
        return RedirectView.redirect("/def");
      }
    }

    app!.use(e.text());
    app!.use(Sapling.resolve(ABCController));

    const response = await request(app!).get("/abc");

    expect(response.redirect).toBe(true);
    expect(response.header.location).toBe("/def");
  });

  it("test route not found", async () => {
    @Controller({ prefix: "/abc" })
    class ABCController {
      @GET()
      public goToDEF(): RedirectView {
        return RedirectView.redirect("/def");
      }
    }

    app!.use(e.text());
    app!.use(Sapling.resolve(ABCController));

    const response = await request(app!).get("/");

    expect(response.statusCode).toBe(404);
    expect(response.text).toContain("Cannot GET /");
  });
});
