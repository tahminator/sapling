import type { NextFunction, Request, Response } from "express";

import { MiddlewareClass, GET } from "../../../annotation";
import { _settings, ResponseEntity } from "../../../helper";
import { HealthRegistrar } from "../../health/registrar";

/**
 * Enable the serving of `ready` and `live` endpoints.
 *
 * Configure any middleware-specific settings with `Sapling.Extras.health`
 */
@MiddlewareClass({
  deps: [HealthRegistrar],
})
export class DefaultHealthMiddleware {
  constructor(private readonly healthRegistrar: HealthRegistrar) {}

  @GET(_settings.health.ready.path)
  async readiness(
    _request: Request,
    _response: Response,
    _next: NextFunction,
  ): Promise<
    ResponseEntity<{
      up: boolean;
    }>
  > {
    const up = await this.healthRegistrar._readiness();
    return ResponseEntity.ok().body({
      up,
    });
  }

  @GET(_settings.health.live.path)
  async liveness(
    _request: Request,
    _response: Response,
    _next: NextFunction,
  ): Promise<
    ResponseEntity<{
      up: boolean;
    }>
  > {
    const up = await this.healthRegistrar._liveness();
    return ResponseEntity.ok().body({
      up,
    });
  }
}
