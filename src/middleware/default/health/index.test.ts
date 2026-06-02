/* eslint-disable @typescript-eslint/no-non-null-assertion */

import e from "express";
import request from "supertest";

import { _InjectableRegistry } from "../../../annotation/injectable";
import { Sapling, _settings } from "../../../helper/sapling";
import { HealthRegistrar } from "../../health/registrar";
import { DefaultHealthMiddleware } from "./index";

describe("DefaultHealthMiddleware", () => {
  let app: ReturnType<typeof e>;
  let registrar: HealthRegistrar;

  beforeEach(() => {
    app = e();
    Sapling.registerApp(app);
    app.use(Sapling.resolve(DefaultHealthMiddleware));
    registrar = _InjectableRegistry.get(HealthRegistrar)!;
  });

  describe("GET /readyz", () => {
    it("returns { up: false } before _markLive()", async () => {
      vi.spyOn(registrar, "_readiness").mockResolvedValue(false);
      const res = await request(app).get("/readyz");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ up: false });
    });

    it("returns { up: true } when all checks pass", async () => {
      vi.spyOn(registrar, "_readiness").mockResolvedValue(true);
      const res = await request(app).get("/readyz");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ up: true });
    });
  });

  describe("GET /livez", () => {
    it("returns { up: false } before _markLive()", async () => {
      vi.spyOn(registrar, "_liveness").mockResolvedValue(false);
      const res = await request(app).get("/livez");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ up: false });
    });

    it("returns { up: true } after _markLive()", async () => {
      vi.spyOn(registrar, "_liveness").mockResolvedValue(true);
      const res = await request(app).get("/livez");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ up: true });
    });
  });
});

describe("Sapling._onPostStartup", () => {
  it("calls _markLive on HealthRegistrar when instantiated", () => {
    const app = e();
    Sapling.registerApp(app);
    app.use(Sapling.resolve(DefaultHealthMiddleware));

    const registrar = _InjectableRegistry.get(HealthRegistrar)!;
    const spy = vi.spyOn(registrar, "_markLive");

    Sapling._onPostStartup();

    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("Sapling.registerApp listen hook", () => {
  it("triggers _onPostStartup when app.listen() fires", async () => {
    const app = Sapling.registerApp(e());
    const spy = vi.spyOn(Sapling, "_onPostStartup");

    await new Promise<void>((resolve, reject) => {
      const server = app.listen(0, () => {
        setImmediate(() => server.close(() => resolve()));
      });
      server.on("error", reject);
    });

    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("Sapling.Extras.health", () => {
  afterEach(() => {
    Sapling.Extras.health.setReadyPath("/readyz");
    Sapling.Extras.health.setLivePath("/livez");
  });

  it("setReadyPath updates _settings.health.ready.path", () => {
    Sapling.Extras.health.setReadyPath("/healthz/ready");
    expect(_settings.health.ready.path).toBe("/healthz/ready");
  });

  it("setLivePath updates _settings.health.live.path", () => {
    Sapling.Extras.health.setLivePath("/healthz/live");
    expect(_settings.health.live.path).toBe("/healthz/live");
  });
});
