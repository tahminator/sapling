import type { NextFunction, Request, Response } from "express";

import { Middleware, MiddlewareClass } from "../../../annotation";
import { ResponseEntity, ResponseStatusError } from "../../../helper";

@MiddlewareClass()
export class DefaultResponseStatusErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    next: NextFunction,
  ) {
    if (err instanceof ResponseStatusError) {
      return ResponseEntity.status(err.status).body({ message: err.message });
    }

    // YOU MUST CALL `next(err)` EXPLICITLY IN ORDER TO CONTINUE CHAIN
    next(err);
  }
}
