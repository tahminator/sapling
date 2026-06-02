/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";

import e from "express";

import type { Class, ExpressMiddlewareFn } from "../types";
import type { OpenAPIMetadata } from "./openapi";

import { _ControllerRegistry } from "../annotation/controller";
import { _InjectableRegistry } from "../annotation/injectable";
import { HealthRegistrar } from "../middleware/health/registrar";

type Settings = {
  serialize: (value: any) => string;
  deserialize: (value: string) => any;
  health: {
    ready: {
      path: string;
    };
    live: {
      path: string;
    };
  };
  doc: {
    openApiPath: string;
    swaggerPath: string;
    metadata: OpenAPIMetadata;
  };
};

export const _settings: Settings = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
  health: {
    ready: {
      path: "/readyz",
    },
    live: {
      path: "/livez",
    },
  },
  doc: {
    openApiPath: "/openapi.json",
    swaggerPath: "/swagger.html",
    metadata: {
      title: "API",
      version: "1.0.0",
    },
  },
};

/**
 * Collection of utility functions which are essential for Sapling to function.
 */
export class Sapling {
  /**
   * If you would prefer to manually resolve your controllers instead, call resolve
   * on the controller class.
   *
   * @example```ts
   * import { Sapling } from "@tahminator/sapling";
   * import TestController from "./path/to/test.controller";
   *
   * const app = express();
   *
   * const router = Sapling.resolve(TestController);
   * app.use(router);
   * ```
   */
  static resolve<TClass>(
    this: void,
    clazz: Class<TClass>,
  ): Router | ErrorRequestHandler {
    const router = _ControllerRegistry.get(clazz);
    if (!router) {
      throw new Error("Controller cannot be found");
    }
    return router;
  }

  /**
   * Register this function as a middleware in order to utilize Sapling's `deserialize` function.
   *
   * @example```ts
   * import { Sapling } from "@tahminator/sapling";
   * import express from "express";
   *
   * const app = express();
   *
   * app.use(Sapling.json());
   * ```
   */
  static json(this: void): ExpressMiddlewareFn {
    return (request, _response, next) => {
      try {
        if (!request.body) {
          return next();
        }

        if (request.headers["content-type"] !== "application/json") {
          return next();
        }

        if (typeof request.body === "string") {
          request.body = Sapling.deserialize(request.body);
        } else if (typeof request.body === "object") {
          // override `express.json()` middleware, if ran, and use Sapling's `deserialize` instead.
          const raw = JSON.stringify(request.body);
          request.body = Sapling.deserialize(raw);
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  /**
   * Register your application with all the necessary middlewares and logics for Sapling to function.
   *
   * @example```ts
   * import { Sapling } from "@tahminator/sapling";
   * import express from "express";
   *
   * // returns the exact same `express.App` type back to you!
   * const app = Sapling.registerApp(express());
   * ```
   */
  static registerApp(app: e.Express): e.Express {
    app.use(e.text({ type: "application/json" }));
    app.use(Sapling.json());

    return new Proxy(app, {
      get(target, prop, receiver) {
        if (prop === "listen") {
          const originalListen = target[prop];
          return function (...args: any[]) {
            const server = originalListen.apply(target, args as any);

            server.once("listening", () => {
              Sapling._onPostStartup();
              console.log(
                "Sapling successfully initialized post-startup hooks on server start",
              );
            });

            return server;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  /**
   * @internal
   * visible for testing
   */
  static _onPostStartup(): void {
    const healthRegistrar: HealthRegistrar | undefined =
      _InjectableRegistry.get(HealthRegistrar);
    healthRegistrar?._markLive();
  }

  /**
   * Serialize a value into a JSON string.
   *
   * This function is used in {@link ResponseEntity} to serialize the `body`.
   *
   * Use `setSerializeFn` to override underlying implementation.
   *
   * @defaultValue `JSON.stringify`
   */
  static serialize(this: void, value: any): string {
    return _settings.serialize(value);
  }

  /**
   * Replace the function used for `serialize`.
   */
  static setSerializeFn(this: void, fn: (value: any) => string): void {
    _settings.serialize = fn;
  }

  /**
   * De-serialize a JSON string back to a JavaScript object.
   *
   * This function is used to de-serialize a string into a `body`.
   *
   * Use `setDeserializeFn` to override underlying implementation.
   *
   * @defaultValue `JSON.parse`
   */
  static deserialize<T = any>(this: void, value: string): T {
    return _settings.deserialize(value);
  }

  /**
   * Replace the function used for `deserialize`
   */
  static setDeserializeFn(this: void, fn: (value: string) => any): void {
    _settings.deserialize = fn;
  }

  /**
   * Modify extra settings
   */
  static Extras = {
    /**
     * Modify default settings applied to OpenAPI & Swagger
     */
    swaggerAndOpenApi: {
      /**
       * Set base OpenAPI metadata values.
       *
       * @default { title: "API", version: "1.0.0" }
       */
      setMetadata(metadata: OpenAPIMetadata): void {
        _settings.doc.metadata = metadata;
      },

      /**
       * change default endpoint that will serve OpenAPI spec.
       * Swagger will also load this endpoint on load.
       *
       * @default `/openapi.json`
       */
      setOpenApiPath(this: void, path: string): void {
        _settings.doc.openApiPath = path;
      },
      /**
       * change Swagger endpoint.
       *
       * @default `/swagger.html`
       */
      setSwaggerPath(this: void, path: string): void {
        _settings.doc.swaggerPath = path;
      },
    },
    /**
     * Modify default settings applied to health / readiness / liveness.
     */
    health: {
      /**
       * change default endpoint that ready endpoint will be served on.
       *
       * @default `/readyz`
       */
      setReadyPath(this: void, path: string): void {
        _settings.health.ready.path = path;
      },
      /**
       * change default endpoint that live endpoint will be served on.
       *
       * @default `/livez`
       */
      setLivePath(this: void, path: string): void {
        _settings.health.live.path = path;
      },
    },
  };

  /**
   * This method can be used in a `@MiddlewareClass` to register any libraries
   * that expect you to register multiple registers at once. An example is `swagger-ui-express`
   *
   * @example
   * ```ts
   * ⠀@MiddlewareClass()
   *  class Serve {
   *    // `swagger.serve` returns multiple Express handlers for all the assets and routes
   *    // that will be served
   *    private readonly handlers: RequestHandler[] = swagger.serve;
   *
   *   ⠀@Middleware(_settings.doc.swaggerPath)
   *    handle(request: Request, response: Response, next: NextFunction) {
   *      return Sapling.chainHandlers(this.handlers, request, response, next);
   *    }
   *  }
   * ```
   */
  static chainHandlers(
    this: void,
    handlers: RequestHandler[],
    request: Request,
    response: Response,
    next: NextFunction,
    index = 0,
  ): void {
    if (index >= handlers.length) {
      next();
      return;
    }
    handlers[index]?.(request, response, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      Sapling.chainHandlers(handlers, request, response, next, index + 1);
    });
  }
}
