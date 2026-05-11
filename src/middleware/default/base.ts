import type { NextFunction, Request, Response } from "express";

import { Middleware, MiddlewareClass } from "../../annotation";
import { ResponseEntity } from "../../helper";

/**
 * This should be registered last in the middleware chain.
 *
 * All exception messages are hidden from the request by default.
 */
@MiddlewareClass()
export class DefaultBaseErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    _next: NextFunction,
  ) {
    console.error("[Error]", err);

    return ResponseEntity.status(500).body({
      message: "Internal Server Error",
    });

    // next() is called implicitly, you should avoid doing it yourself.
    // early return in middleware should just be done with `return;`
    // Sapling will call the next error-handling middleware in the chain for you.
  }
}
