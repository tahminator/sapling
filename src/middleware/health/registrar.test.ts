import { HealthRegistrar } from "./registrar";

describe("HealthRegistrar", () => {
  let registrar: HealthRegistrar;

  beforeEach(() => {
    registrar = new HealthRegistrar();
  });

  describe("_liveness()", () => {
    it("returns false before _markLive()", async () => {
      expect(await registrar._liveness()).toBe(false);
    });

    it("returns true after _markLive()", async () => {
      registrar._markLive();
      expect(await registrar._liveness()).toBe(true);
    });
  });

  describe("_readiness()", () => {
    it("returns false before _markLive()", async () => {
      registrar.add(() => true);
      expect(await registrar._readiness()).toBe(false);
    });

    it("returns true when live with no checks registered", async () => {
      registrar._markLive();
      expect(await registrar._readiness()).toBe(true);
    });

    it("returns true when all sync checks pass", async () => {
      registrar.add(() => true);
      registrar.add(() => true);
      registrar._markLive();
      expect(await registrar._readiness()).toBe(true);
    });

    it("returns false when any sync check fails", async () => {
      registrar.add(() => true);
      registrar.add(() => false);
      registrar._markLive();
      expect(await registrar._readiness()).toBe(false);
    });

    it("returns true when all async checks pass", async () => {
      registrar.add(async () => true);
      registrar.add(async () => true);
      registrar._markLive();
      expect(await registrar._readiness()).toBe(true);
    });

    it("returns false when any async check fails", async () => {
      registrar.add(async () => true);
      registrar.add(async () => false);
      registrar._markLive();
      expect(await registrar._readiness()).toBe(false);
    });
  });
});
