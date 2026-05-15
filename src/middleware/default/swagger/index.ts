import type { Request, Response, NextFunction, RequestHandler } from "express";

import swagger from "swagger-ui-express";

import { Middleware, MiddlewareClass } from "../../../annotation";
import { _settings, Sapling } from "../../../helper";

// https://github.com/scottie1984/swagger-ui-express/blob/master/README.md

@MiddlewareClass()
class Serve {
  private readonly handlers: RequestHandler[] = swagger.serve;

  @Middleware(_settings.doc.swaggerPath)
  handle(request: Request, response: Response, next: NextFunction) {
    return Sapling.chainHandlers(this.handlers, request, response, next);
  }
}

@MiddlewareClass()
class Setup {
  private readonly handler: RequestHandler;

  constructor() {
    this.handler = swagger.setup(null, {
      swaggerOptions: { url: _settings.doc.openApiPath },
    });
  }

  @Middleware(_settings.doc.swaggerPath)
  handle(request: Request, response: Response, next: NextFunction) {
    return this.handler(request, response, next);
  }
}

export const DefaultSwaggerMiddleware = {
  Serve,
  Setup,
};
