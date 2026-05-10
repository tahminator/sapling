import type { NextFunction, Request, Response } from "express";

import { Middleware, MiddlewareClass } from "../../annotation";
import { ResponseEntity, ResponseStatusError } from "../../helper";

@MiddlewareClass()
export class DefaultResponseStatusErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    _next: NextFunction,
  ) {
    if (err instanceof ResponseStatusError) {
      return ResponseEntity.status(err.status).body({ message: err.message });
    }

    // next() is called implicitly, you should avoid doing it yourself.
    // early return in middleware should just be done with `return;`
    // Sapling will call the next error-handling middleware in the chain for you.
  }
}
