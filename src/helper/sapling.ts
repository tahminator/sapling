import { Router } from "express";
import { _ControllerRegistry } from "../annotation/controller";
import { Class, ExpressMiddlewareFn } from "../types";

type Settings = {
  serialize: (value: any) => string;
  deserialize: (value: string) => any;
};

let settings: Settings = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
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
  static resolve<TClass>(clazz: Class<TClass>): Router {
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
  static json(): ExpressMiddlewareFn {
    return (request, _response, next) => {
      try {
        if (!request.body) {
          next();
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
   * Serialize a value into a JSON string.
   *
   * This function is used in {@link ResponseEntity} to serialize the `body`.
   *
   * Use `setSerializeFn` to override underlying implementation.
   *
   * @defaultValue `JSON.stringify`
   */
  static serialize(value: any): string {
    return settings.serialize(value);
  }

  /**
   * Replace the function used for `serialize`.
   */
  static setSerializeFn(fn: (value: any) => string): void {
    settings.serialize = fn;
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
  static deserialize<T = any>(value: string): T {
    return settings.deserialize(value);
  }

  /**
   * Replace the function used for `deserialize`
   */
  static setDeserializeFn(fn: (value: string) => any): void {
    settings.deserialize = fn;
  }
}
