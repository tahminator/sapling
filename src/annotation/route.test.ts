/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";

import {
  DELETE,
  GET,
  HEAD,
  Middleware,
  OPTIONS,
  PATCH,
  POST,
  PUT,
  _getRoutes,
} from "./route";

describe("route decorators", () => {
  describe("@GET", () => {
    it("should register GET route with default path", () => {
      class TestController {
        @GET()
        getAll() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([{ method: "GET", path: "", fnName: "getAll" }]);
    });

    it("should register GET route with custom path", () => {
      class TestController {
        @GET("/users")
        getUsers() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "GET", path: "/users", fnName: "getUsers" },
      ]);
    });

    it("should register GET route with regex path", () => {
      class TestController {
        @GET(/^\/admin/)
        getAdmin() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes[0]!.method).toBe("GET");
      expect(routes[0]!.path).toBeInstanceOf(RegExp);
      expect(routes[0]!.fnName).toBe("getAdmin");
    });
  });

  describe("@POST", () => {
    it("should register POST route", () => {
      class TestController {
        @POST("/users")
        createUser() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "POST", path: "/users", fnName: "createUser" },
      ]);
    });
  });

  describe("@PUT", () => {
    it("should register PUT route", () => {
      class TestController {
        @PUT("/users/:id")
        updateUser() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "PUT", path: "/users/:id", fnName: "updateUser" },
      ]);
    });
  });

  describe("@DELETE", () => {
    it("should register DELETE route", () => {
      class TestController {
        @DELETE("/users/:id")
        deleteUser() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "DELETE", path: "/users/:id", fnName: "deleteUser" },
      ]);
    });
  });

  describe("@PATCH", () => {
    it("should register PATCH route", () => {
      class TestController {
        @PATCH("/users/:id")
        patchUser() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "PATCH", path: "/users/:id", fnName: "patchUser" },
      ]);
    });
  });

  describe("@OPTIONS", () => {
    it("should register OPTIONS route", () => {
      class TestController {
        @OPTIONS("/users")
        optionsUsers() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "OPTIONS", path: "/users", fnName: "optionsUsers" },
      ]);
    });
  });

  describe("@HEAD", () => {
    it("should register HEAD route", () => {
      class TestController {
        @HEAD("/users")
        headUsers() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toEqual([
        { method: "HEAD", path: "/users", fnName: "headUsers" },
      ]);
    });
  });

  describe("@Middleware", () => {
    it("should register middleware with default path", () => {
      class TestMiddleware {
        @Middleware()
        handle() {}
      }

      const routes = _getRoutes(TestMiddleware);

      expect(routes).toEqual([{ method: "USE", path: "", fnName: "handle" }]);
    });

    it("should register middleware with custom path", () => {
      class TestMiddleware {
        @Middleware("/admin")
        handleAdmin() {}
      }

      const routes = _getRoutes(TestMiddleware);

      expect(routes).toEqual([
        { method: "USE", path: "/admin", fnName: "handleAdmin" },
      ]);
    });

    it("should register middleware with regex path", () => {
      class TestMiddleware {
        @Middleware(/^\/api/)
        handleApi() {}
      }

      const routes = _getRoutes(TestMiddleware);

      expect(routes[0]!.method).toBe("USE");
      expect(routes[0]!.path).toBeInstanceOf(RegExp);
      expect(routes[0]!.fnName).toBe("handleApi");
    });
  });

  describe("multiple routes", () => {
    it("should register multiple routes on same controller", () => {
      class TestController {
        @GET("/users")
        getUsers() {}

        @POST("/users")
        createUser() {}

        @GET("/users/:id")
        getUser() {}
      }

      const routes = _getRoutes(TestController);

      expect(routes).toHaveLength(3);
      expect(routes).toEqual([
        { method: "GET", path: "/users", fnName: "getUsers" },
        { method: "POST", path: "/users", fnName: "createUser" },
        { method: "GET", path: "/users/:id", fnName: "getUser" },
      ]);
    });
  });

  describe("_getRoutes", () => {
    it("should return empty array for controller without routes", () => {
      class EmptyController {}

      const routes = _getRoutes(EmptyController);

      expect(routes).toEqual([]);
    });

    it("should not share routes between controllers", () => {
      class Controller1 {
        @GET("/one")
        one() {}
      }

      class Controller2 {
        @GET("/two")
        two() {}
      }

      const routes1 = _getRoutes(Controller1);
      const routes2 = _getRoutes(Controller2);

      expect(routes1).toEqual([{ method: "GET", path: "/one", fnName: "one" }]);
      expect(routes2).toEqual([{ method: "GET", path: "/two", fnName: "two" }]);
    });
  });
});
