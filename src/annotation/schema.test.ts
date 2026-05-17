import { describe, it, expect } from "vitest";

import { HttpStatus } from "../enum";
import {
  ControllerSchema,
  RouteSchema,
  _getControllerSchema,
  _getRouteSchema,
  _setControllerSchema,
  _setRouteSchema,
} from "./schema";

describe("schema decorators", () => {
  describe("@ControllerSchema", () => {
    it("should set controller schema metadata", () => {
      @ControllerSchema({
        title: "Test Controller",
        description: "A test controller",
      })
      class TestController {}

      const schema = _getControllerSchema(TestController);

      expect(schema).toEqual({
        title: "Test Controller",
        description: "A test controller",
      });
    });

    it("should set controller schema with only title", () => {
      @ControllerSchema({
        title: "Minimal Controller",
      })
      class MinimalController {}

      const schema = _getControllerSchema(MinimalController);

      expect(schema).toEqual({
        title: "Minimal Controller",
      });
    });
  });

  describe("@RouteSchema", () => {
    it("should set route schema metadata", () => {
      class TestController {
        @RouteSchema({
          summary: "Get user",
          description: "Retrieves a user by ID",
        })
        getUser() {}
      }

      const schema = _getRouteSchema(TestController, "getUser");

      expect(schema).toEqual({
        summary: "Get user",
        description: "Retrieves a user by ID",
      });
    });

    it("should set route schema with responses", () => {
      class TestController {
        @RouteSchema({
          summary: "Create user",
          responses: [
            {
              statusCode: HttpStatus.CREATED,
              description: "User created successfully",
            },
            {
              statusCode: HttpStatus.BAD_REQUEST,
              description: "Invalid request",
            },
          ],
        })
        createUser() {}
      }

      const schema = _getRouteSchema(TestController, "createUser");

      expect(schema).toEqual({
        summary: "Create user",
        responses: [
          {
            statusCode: HttpStatus.CREATED,
            description: "User created successfully",
          },
          {
            statusCode: HttpStatus.BAD_REQUEST,
            description: "Invalid request",
          },
        ],
      });
    });

    it("should handle multiple routes in same controller", () => {
      class TestController {
        @RouteSchema({ summary: "Get users" })
        getUsers() {}

        @RouteSchema({ summary: "Create user" })
        createUser() {}
      }

      expect(_getRouteSchema(TestController, "getUsers")).toEqual({
        summary: "Get users",
      });
      expect(_getRouteSchema(TestController, "createUser")).toEqual({
        summary: "Create user",
      });
    });
  });

  describe("_setRouteSchema", () => {
    it("should set route schema using internal API", () => {
      class TestController {}

      _setRouteSchema(TestController, "testMethod", {
        summary: "Test summary",
        description: "Test description",
      });

      const schema = _getRouteSchema(TestController, "testMethod");

      expect(schema).toEqual({
        summary: "Test summary",
        description: "Test description",
      });
    });
  });

  describe("_setControllerSchema", () => {
    it("should set controller schema using internal API", () => {
      class TestController {}

      _setControllerSchema(TestController, {
        title: "Test",
        description: "Test description",
      });

      const schema = _getControllerSchema(TestController);

      expect(schema).toEqual({
        title: "Test",
        description: "Test description",
      });
    });
  });

  describe("_getRouteSchema", () => {
    it("should return undefined for non-existent route", () => {
      class TestController {}

      const schema = _getRouteSchema(TestController, "nonExistent");

      expect(schema).toBeUndefined();
    });
  });

  describe("_getControllerSchema", () => {
    it("should return undefined for controller without schema", () => {
      class TestController {}

      const schema = _getControllerSchema(TestController);

      expect(schema).toBeUndefined();
    });
  });
});
