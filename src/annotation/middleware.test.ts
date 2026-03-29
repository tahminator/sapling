/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import request from "supertest";

import { HttpStatus } from "../enum";
import { ResponseEntity } from "../helper";
import { ResponseStatusError, Sapling } from "../helper";
import { Controller } from "./controller";
import { MiddlewareClass } from "./middleware";
import { Middleware, POST } from "./route";

describe("middleware logic", () => {
  let app: ReturnType<typeof e> | null = null;

  beforeEach(() => {
    app = e();

    Sapling.registerApp(app);
  });

  it("test basic middleware throws before /admin", async () => {
    const SECRET_CODE = "SECRET_CODE";
    const PASSWORD = "123";

    @MiddlewareClass()
    class AuthMiddleware {
      @Middleware()
      public validateAuthentication(
        request: e.Request,
        _: e.Response,
        next: e.NextFunction,
      ) {
        if (request.headers["x-auth"] === PASSWORD) {
          next();
          return;
        }

        throw new ResponseStatusError(
          HttpStatus.UNAUTHORIZED,
          "You are not authorized.",
        );
      }
    }

    @Controller({ prefix: "/admin" })
    class AdminController {
      @POST()
      public getSecrets(): ResponseEntity<string> {
        return ResponseEntity.ok().body(SECRET_CODE);
      }
    }

    app!.use(Sapling.resolve(AuthMiddleware));
    app!.use(Sapling.resolve(AdminController));

    const response = await request(app!).post("/admin").send();

    expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);

    const response2 = await request(app!)
      .post("/admin")
      .set("X-Auth", "1")
      .send();

    expect(response2.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("test basic middleware succeeds for /admin", async () => {
    const SECRET_CODE = "SECRET_CODE";
    const PASSWORD = "123";

    @MiddlewareClass()
    class AuthMiddleware {
      @Middleware()
      public validateAuthentication(
        request: e.Request,
        _: e.Response,
        next: e.NextFunction,
      ) {
        if (request.headers["x-auth"] === PASSWORD) {
          next();
          return;
        }

        throw new ResponseStatusError(
          HttpStatus.UNAUTHORIZED,
          "You are not authorized.",
        );
      }
    }

    @Controller({ prefix: "/admin" })
    class AdminController {
      @POST()
      public getSecrets(): ResponseEntity<string> {
        return ResponseEntity.ok().body(SECRET_CODE);
      }
    }

    app!.use(Sapling.resolve(AuthMiddleware));
    app!.use(Sapling.resolve(AdminController));

    const response = await request(app!)
      .post("/admin")
      .set("X-Auth", PASSWORD)
      .send();

    expect(response.statusCode).toBe(HttpStatus.OK);
  });

  it("test regex middleware for /admin", async () => {
    const SECRET_CODE = "SECRET_CODE";
    const PASSWORD = "123";
    const HELLO_WORLD = "hello world";

    @MiddlewareClass()
    class AuthMiddleware {
      @Middleware(/^\/admin(\/.*)?$/)
      public validateAuthentication(
        request: e.Request,
        _: e.Response,
        next: e.NextFunction,
      ) {
        if (request.headers["x-auth"] === PASSWORD) {
          next();
          return;
        }

        throw new ResponseStatusError(
          HttpStatus.UNAUTHORIZED,
          "You are not authorized.",
        );
      }
    }

    @Controller({ prefix: "/admin" })
    class AdminController {
      @POST()
      public getSecrets(): ResponseEntity<string> {
        return ResponseEntity.ok().body(SECRET_CODE);
      }
    }

    @Controller({ prefix: "/" })
    class UnsafeController {
      @POST()
      public getHelloWorld(): ResponseEntity<string> {
        return ResponseEntity.ok().body(HELLO_WORLD);
      }
    }

    app!.use(Sapling.resolve(AuthMiddleware));
    app!.use(Sapling.resolve(AdminController));
    app!.use(Sapling.resolve(UnsafeController));

    const response1 = await request(app!).post("/admin").send();

    expect(response1.statusCode).toBe(HttpStatus.UNAUTHORIZED);

    const response2 = await request(app!).post("/").send();

    expect(response2.statusCode).toBe(HttpStatus.OK);
    expect(response2.body).toBe(HELLO_WORLD);

    const response3 = await request(app!)
      .post("/admin")
      .set("X-Auth", PASSWORD)
      .send();

    expect(response3.statusCode).toBe(HttpStatus.OK);
  });
});
