import type { NextFunction, Request, Response } from "express";

import { Middleware, MiddlewareClass } from "../../../annotation";
import { ResponseEntity } from "../../../helper";

/**
 * This should be registered last in the middleware chain.
 *
 * All exception messages are hidden from the request by default.
 * If the default is not suitable, you may also easily write your own.
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

    // no next(), should be last in chain
  }
}
