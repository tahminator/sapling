/* eslint-disable @typescript-eslint/no-non-null-assertion */
import e from "express";
import request from "supertest";

import type { Class } from "../types";

import {
  Controller,
  DELETE,
  GET,
  Injectable,
  PATCH,
  POST,
} from "../annotation";
import { ResponseEntity, Sapling } from "../helper";

export type Res = {
  x: number;
  a: string;
  c: {
    e: boolean;
  };
};

describe("controller logic", () => {
  let app: ReturnType<typeof e> | null = null;

  const testObj = {
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
});

describe("injectable logic", () => {
  let app: ReturnType<typeof e> | null = null;

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
  });

  it("test one injected service to one controller", async () => {
    @Injectable()
    class HelloWorldService {
      private readonly STR = "Hello World";

      getString(): string {
        return this.STR;
      }
    }

    @Controller({ deps: [HelloWorldService] })
    class HelloWorldController {
      constructor(private readonly helloWorldService: HelloWorldService) {}

      @GET()
      public getString(): ResponseEntity<string> {
        return ResponseEntity.ok().body(this.helloWorldService.getString());
      }
    }

    app?.use(Sapling.resolve(HelloWorldController));

    const response = await request(app!).get("/");
    expect(response.statusCode).toBe(200);

    const body = response.body as string;
    expect(body).toBe("Hello World");
  });

  it("test singleton service to multiple controller", async () => {
    @Injectable()
    class MagicNumberService {
      private readonly n: number;
      constructor() {
        this.n = Math.random();
      }

      getN(): number {
        return this.n;
      }
    }

    @Controller({ deps: [MagicNumberService], prefix: "/magic/1" })
    class PrimaryMagicNumberController {
      constructor(private readonly magicNumberService: MagicNumberService) {}

      @GET()
      public getN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(this.magicNumberService.getN());
      }
    }

    @Controller({ deps: [MagicNumberService], prefix: "/magic/2" })
    class SecondaryMagicNumberController {
      constructor(private readonly magicNumberService: MagicNumberService) {}

      @GET()
      public getN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(this.magicNumberService.getN());
      }
    }

    const controllers = [
      PrimaryMagicNumberController,
      SecondaryMagicNumberController,
    ] as Class<unknown>[];

    controllers.map(Sapling.resolve).map((r) => app!.use(r));

    const response1 = await request(app!).get("/magic/1");
    expect(response1.statusCode).toBe(200);

    const response2 = await request(app!).get("/magic/2");
    expect(response2.statusCode).toBe(200);

    const body1 = response1.body as number;
    const body2 = response2.body as number;
    expect(body1).toBe(body2);
  });

  it("test chained singleton services to multiple controller", async () => {
    interface Db {
      getN(): number;
    }

    @Injectable()
    class MockDatabase implements Db {
      private readonly n: number;
      constructor() {
        this.n = Math.random();
      }

      getN(): number {
        return this.n;
      }
    }

    @Injectable([MockDatabase])
    class MagicNumberService {
      constructor(private readonly db: Db) {}

      getN(): number {
        return this.db.getN();
      }
    }

    @Controller({ deps: [MagicNumberService], prefix: "/magic/1" })
    class PrimaryMagicNumberController {
      constructor(private readonly magicNumberService: MagicNumberService) {}

      @GET()
      public getN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(this.magicNumberService.getN());
      }
    }

    @Controller({ deps: [MagicNumberService], prefix: "/magic/2" })
    class SecondaryMagicNumberController {
      constructor(private readonly magicNumberService: MagicNumberService) {}

      @GET()
      public getN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(this.magicNumberService.getN());
      }
    }

    const controllers = [
      PrimaryMagicNumberController,
      SecondaryMagicNumberController,
    ] as Class<unknown>[];

    controllers.map(Sapling.resolve).map((r) => app!.use(r));

    const response1 = await request(app!).get("/magic/1");
    expect(response1.statusCode).toBe(200);

    const response2 = await request(app!).get("/magic/2");
    expect(response2.statusCode).toBe(200);

    const body1 = response1.body as number;
    const body2 = response2.body as number;
    expect(body1).toBe(body2);
  });

  it("test diamond pattern service dependencies to multiple controller", async () => {
    interface Db {
      getPrimaryN(): number;
      getSecondaryN(): number;
    }

    @Injectable()
    class MockDatabase implements Db {
      private readonly n1: number;
      private readonly n2: number;
      constructor() {
        this.n1 = 1;
        this.n2 = 2;
      }

      getPrimaryN(): number {
        return this.n1;
      }

      getSecondaryN(): number {
        return this.n2;
      }
    }

    interface MagicNumberService {
      getN(): number;
    }

    @Injectable([MockDatabase])
    class PrimaryMagicNumberService {
      constructor(private readonly db: Db) {}

      getN(): number {
        return this.db.getPrimaryN();
      }
    }

    @Injectable([MockDatabase])
    class SecondaryMagicNumberService {
      constructor(private readonly db: Db) {}

      getN(): number {
        return this.db.getSecondaryN();
      }
    }

    @Controller({
      deps: [PrimaryMagicNumberService, SecondaryMagicNumberService],
      prefix: "/magic",
    })
    class MagicNumberController {
      constructor(
        private readonly primaryMagicNumberService: MagicNumberService,
        private readonly secondaryMagicNumberService: MagicNumberService,
      ) {}

      @GET("/1")
      public getPrimaryN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(this.primaryMagicNumberService.getN());
      }

      @GET("/2")
      public getSecondaryN(): ResponseEntity<number> {
        return ResponseEntity.ok().body(
          this.secondaryMagicNumberService.getN(),
        );
      }
    }

    const controllers = [MagicNumberController] as Class<unknown>[];

    controllers.map(Sapling.resolve).map((r) => app!.use(r));

    const response1 = await request(app!).get("/magic/1");
    expect(response1.statusCode).toBe(200);

    const response2 = await request(app!).get("/magic/2");
    expect(response2.statusCode).toBe(200);

    const body1 = response1.body as number;
    const body2 = response2.body as number;
    expect(body1).toBe(1);
    expect(body2).toBe(2);
  });
});
