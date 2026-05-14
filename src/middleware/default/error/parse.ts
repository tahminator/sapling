import type { NextFunction, Request, Response } from "express";

import { Middleware, MiddlewareClass } from "../../../annotation";
import { ParserError, ResponseEntity } from "../../../helper";

@MiddlewareClass()
export class DefaultParserErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    next: NextFunction,
  ) {
    if (err instanceof ParserError) {
      return ResponseEntity.status(err.status).body({ message: err.message });
    }

    // YOU MUST CALL `next(err)` EXPLICITLY IN ORDER TO CONTINUE CHAIN
    next(err);
  }
}
