import { Router } from "express";
import { _ControllerRegistry } from "./controller";
import { Class } from "./types";

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
}
