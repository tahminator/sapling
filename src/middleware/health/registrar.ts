import { Injectable } from "../../annotation/injectable";

export type HealthCheck = () => boolean | Promise<boolean>;

@Injectable()
export class HealthRegistrar {
  private _checks: HealthCheck[];
  private _live: boolean;

  constructor() {
    this._checks = [];
    this._live = false;
  }

  /**
   * Add a health check.
   *
   * Health checks will be used to determine whether service can serve traffic or not (a.k.a `readiness`).
   */
  add(healthCheck: HealthCheck) {
    this._checks.push(healthCheck);
  }

  /**
   * @internal used by Sapling library, used to determine once all
   * checks have been registered and server is, at the very least, alive.
   */
  _markLive() {
    this._live = true;
  }

  /**
   * @internal
   */
  async _liveness(): Promise<boolean> {
    return this._live;
  }

  /**
   * @internal
   */
  async _readiness(): Promise<boolean> {
    if (!this._live) {
      return false;
    }

    const res = await Promise.allSettled(this._checks.map((c) => c()));
    return res.every((r) => r.status === "fulfilled" && r.value);
  }
}
