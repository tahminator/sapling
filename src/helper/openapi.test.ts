/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";

import {
  Controller,
  ControllerSchema,
  GET,
  POST,
  RequestBody,
  RequestParam,
  RequestQuery,
  ResponseBody,
  RouteSchema,
} from "../annotation";
import { HttpStatus } from "../enum";
import {
  _clearOpenApiRegistry,
  _registerController,
  generateOpenApiSpec,
} from "./openapi";

describe("openapi", () => {
  beforeEach(() => {
    _clearOpenApiRegistry();
  });
  describe("_registerController", () => {
    it("should register controller with prefix", () => {
      @Controller({ prefix: "/api" })
      class TestController {
        @GET()
        test() {}
      }

      // registration happens automatically via @Controller decorator
      const spec = generateOpenApiSpec();

      expect(spec.paths).toBeDefined();
      expect(spec.paths["/api"]).toBeDefined();
    });
  });

  describe("generateOpenApiSpec", () => {
    describe("basic spec generation", () => {
      it("should generate spec with default metadata", () => {
        const spec = generateOpenApiSpec();

        expect(spec.openapi).toBe("3.0.0");
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBe("API");
        expect(spec.info.version).toBe("1.0.0");
        expect(spec.paths).toBeDefined();
      });

      it("should include all registered controllers", () => {
        @Controller({ prefix: "/users" })
        class UserController {
          @GET()
          getUsers() {}
        }

        @Controller({ prefix: "/posts" })
        class PostController {
          @GET()
          getPosts() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/users"]).toBeDefined();
        expect(spec.paths["/posts"]).toBeDefined();
      });
    });

    describe("path conversion", () => {
      it("should convert Express path params to OpenAPI format", () => {
        @Controller({ prefix: "/users" })
        class TestController {
          @GET("/:id")
          getUser() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/users/{id}"]).toBeDefined();
        expect(spec.paths["/users/{id}"]?.get).toBeDefined();
      });

      it("should handle multiple path params", () => {
        @Controller({ prefix: "/users" })
        class TestController {
          @GET("/:userId/posts/:postId")
          getUserPost() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/users/{userId}/posts/{postId}"]).toBeDefined();
      });

      it("should throw error for regex paths", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @GET(/^\/admin/)
          test() {}
        }

        expect(() => generateOpenApiSpec()).toThrow(
          "You have a route with a regex path",
        );
      });
    });

    describe("controller schema", () => {
      it("should include controller tags", () => {
        @ControllerSchema({
          title: "Users",
          description: "User management endpoints",
        })
        @Controller({ prefix: "/users" })
        class UserController {
          @GET()
          getUsers() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.tags).toBeDefined();
        expect(spec.tags).toContainEqual({
          name: "Users",
          description: "User management endpoints",
        });
        expect(spec.paths["/users"]?.get?.tags).toEqual(["Users"]);
      });

      it("should handle controller without schema", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @GET()
          test() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/test"]?.get?.tags).toBeUndefined();
      });
    });

    describe("route schema", () => {
      it("should include route summary and description", () => {
        @Controller({ prefix: "/users" })
        class TestController {
          @RouteSchema({
            summary: "Get all users",
            description: "Returns a list of all users",
          })
          @GET()
          getUsers() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users"]?.get;
        expect(operation?.summary).toBe("Get all users");
        expect(operation?.description).toBe("Returns a list of all users");
      });

      it("should include custom response schemas", () => {
        @Controller({ prefix: "/users" })
        class TestController {
          @RouteSchema({
            responses: [
              {
                statusCode: HttpStatus.OK,
                description: "Success",
                schema: z.array(z.object({ id: z.string() })),
              },
              {
                statusCode: HttpStatus.NOT_FOUND,
                description: "Not found",
              },
            ],
          })
          @GET()
          getUsers() {}
        }

        const spec = generateOpenApiSpec();

        const responses = spec.paths["/users"]?.get?.responses;
        expect(responses?.["200"]).toBeDefined();
        const response200 = responses?.["200"];
        if (response200 && "$ref" in response200) {
          expect.fail("Expected ResponseObject, got ReferenceObject");
        }
        expect(response200?.description).toBe("Success");
        expect(responses?.["404"]).toBeDefined();
        const response404 = responses?.["404"];
        if (response404 && "$ref" in response404) {
          expect.fail("Expected ResponseObject, got ReferenceObject");
        }
        expect(response404?.description).toBe("Not found");
      });
    });

    describe("request body", () => {
      it("should include request body schema", () => {
        const CreateUserSchema = z.object({
          name: z.string().describe("User name"),
          email: z.string().email().describe("User email"),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @RequestBody(CreateUserSchema)
          @POST()
          createUser() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users"]?.post;
        expect(operation?.requestBody).toBeDefined();
        const requestBody = operation?.requestBody;
        if (requestBody && "$ref" in requestBody) {
          expect.fail("Expected RequestBodyObject, got ReferenceObject");
        }
        expect(requestBody?.required).toBe(true);
        expect(requestBody?.content?.["application/json"]).toBeDefined();
      });
    });

    describe("response body", () => {
      it("should include response body schema", () => {
        const UserSchema = z.object({
          id: z.string(),
          name: z.string(),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @ResponseBody(UserSchema)
          @GET()
          getUsers() {}
        }

        const spec = generateOpenApiSpec();

        const responses = spec.paths["/users"]?.get?.responses;
        expect(responses?.["200"]).toBeDefined();
        const response = responses?.["200"];
        if (response && "$ref" in response) {
          expect.fail("Expected ResponseObject, got ReferenceObject");
        }
        expect(response?.content?.["application/json"]?.schema).toBeDefined();
      });
    });

    describe("path parameters", () => {
      it("should include path parameters", () => {
        const ParamsSchema = z.object({
          id: z.string().describe("User ID"),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @RequestParam(ParamsSchema)
          @GET("/:id")
          getUser() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users/{id}"]?.get;
        expect(operation?.parameters).toBeDefined();
        expect(operation?.parameters).toHaveLength(1);
        expect(operation?.parameters?.[0]).toMatchObject({
          name: "id",
          in: "path",
          required: true,
          description: "User ID",
        });
      });

      it("should handle multiple path parameters", () => {
        const ParamsSchema = z.object({
          userId: z.string(),
          postId: z.string(),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @RequestParam(ParamsSchema)
          @GET("/:userId/posts/:postId")
          getUserPost() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users/{userId}/posts/{postId}"]?.get;
        expect(operation?.parameters).toHaveLength(2);
      });
    });

    describe("query parameters", () => {
      it("should include query parameters", () => {
        const QuerySchema = z.object({
          page: z.number().describe("Page number"),
          limit: z.number().optional().describe("Items per page"),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @RequestQuery(QuerySchema)
          @GET()
          getUsers() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users"]?.get;
        expect(operation?.parameters).toBeDefined();
        expect(operation?.parameters?.length).toBeGreaterThanOrEqual(1);

        const pageParam = operation?.parameters?.find((p) => {
          if ("$ref" in p) return false;
          return p.name === "page";
        });
        if (pageParam && "$ref" in pageParam) {
          expect.fail("Expected ParameterObject, got ReferenceObject");
        }
        expect(pageParam).toMatchObject({
          name: "page",
          in: "query",
          required: true,
          description: "Page number",
        });

        const limitParam = operation?.parameters?.find((p) => {
          if ("$ref" in p) return false;
          return p.name === "limit";
        });
        if (limitParam && "$ref" in limitParam) {
          expect.fail("Expected ParameterObject, got ReferenceObject");
        }
        expect(limitParam).toMatchObject({
          name: "limit",
          in: "query",
          required: false,
          description: "Items per page",
        });
      });
    });

    describe("combined schemas", () => {
      it("should handle all schema types together", () => {
        const ParamsSchema = z.object({
          id: z.string(),
        });

        const QuerySchema = z.object({
          include: z.string().optional(),
        });

        const BodySchema = z.object({
          name: z.string(),
        });

        const ResponseSchema = z.object({
          id: z.string(),
          name: z.string(),
        });

        @Controller({ prefix: "/users" })
        class TestController {
          @RouteSchema({
            summary: "Update user",
            description: "Updates a user by ID",
          })
          @RequestParam(ParamsSchema)
          @RequestQuery(QuerySchema)
          @RequestBody(BodySchema)
          @ResponseBody(ResponseSchema)
          @POST("/:id")
          updateUser() {}
        }

        const spec = generateOpenApiSpec();

        const operation = spec.paths["/users/{id}"]?.post;
        expect(operation?.summary).toBe("Update user");
        expect(operation?.parameters).toBeDefined();
        expect(operation?.requestBody).toBeDefined();
        const response = operation?.responses?.["200"];
        if (response && "$ref" in response) {
          expect.fail("Expected ResponseObject, got ReferenceObject");
        }
        expect(response?.content).toBeDefined();
      });
    });

    describe("HTTP methods", () => {
      it("should handle GET requests", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @GET()
          test() {}
        }

        const spec = generateOpenApiSpec();
        expect(spec.paths["/test"]?.get).toBeDefined();
      });

      it("should handle POST requests", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @POST()
          test() {}
        }

        const spec = generateOpenApiSpec();
        expect(spec.paths["/test"]?.post).toBeDefined();
      });

      it("should skip middleware routes", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @GET()
          getTest() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/test"]?.get).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("should throw error for regex paths", () => {
        @Controller({ prefix: "/test" })
        class TestController {
          @GET(/^\/admin/)
          test() {}
        }

        expect(() => generateOpenApiSpec()).toThrow(
          "You have a route with a regex path",
        );
      });
    });

    describe("edge cases", () => {
      it("should handle empty controller", () => {
        @Controller({ prefix: "/empty" })
        class EmptyController {}

        const spec = generateOpenApiSpec();

        expect(spec.paths["/empty"]).toBeUndefined();
      });

      it("should handle controller with no prefix", () => {
        @Controller()
        class RootController {
          @GET("/")
          root() {}
        }

        const spec = generateOpenApiSpec();

        expect(spec.paths["/"]).toBeDefined();
      });
    });
  });
});
