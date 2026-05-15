import type { NextFunction, Request, Response } from "express";

import { GET, MiddlewareClass } from "../../../annotation";
import { _settings, ResponseEntity } from "../../../helper";
import { generateOpenApiSpec } from "../../../helper/openapi";

@MiddlewareClass()
export class DefaultOpenApiMiddleware {
  @GET(_settings.doc.openApiPath)
  handle(_request: Request, _response: Response, _next: NextFunction) {
    return ResponseEntity.ok().body(generateOpenApiSpec());
  }
}
