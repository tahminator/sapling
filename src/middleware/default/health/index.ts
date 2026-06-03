import type { NextFunction, Request, Response } from "express";

import { MiddlewareClass, GET } from "../../../annotation";
import { HttpStatus } from "../../../enum";
import { _settings, ResponseEntity } from "../../../helper";
import { HealthRegistrar } from "../../health/registrar";

/**
 * Enable the serving of `ready` and `live` endpoints.
 *
 * `live` and `ready` endpoint returns 200 with `{ up: true }`, else 503 with `{ up: false }`
 *
 * Customize endpoint paths with `Sapling.Extras.health`.
 * Register readiness checks via {@link HealthRegistrar}.
 *
 * explanation of `liveness` vs. `readiness`
 * @see https://kubernetes.io/docs/concepts/workloads/pods/probes/#liveness-probe
 * @see https://kubernetes.io/docs/concepts/workloads/pods/probes/#readiness-probe
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
    return ResponseEntity.status(
      up ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    ).body({ up });
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
    return ResponseEntity.status(
      up ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    ).body({ up });
  }
}
