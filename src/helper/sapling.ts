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

import { _ControllerRegistry } from "../annotation/controller";

type Settings = {
  serialize: (value: any) => string;
  deserialize: (value: string) => any;
  doc: {
    openApiPath: string;
    swaggerPath: string;
  };
};

export const _settings: Settings = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
  doc: {
    openApiPath: "/openapi.json",
    swaggerPath: "/swagger.html",
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
   * const app = express();
   *
   * app.registerApp(app);
   * ```
   */
  static registerApp(app: e.Express): void {
    app.use(e.text({ type: "application/json" }));
    app.use(Sapling.json());
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

  static setOpenApiPath(this: void, path: string): void {
    _settings.doc.openApiPath = path;
  }

  static setSwaggerPath(this: void, path: string): void {
    _settings.doc.swaggerPath = path;
  }

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
