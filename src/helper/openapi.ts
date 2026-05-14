/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import type { OpenAPIV3 } from "openapi-types";

import { _getValidatorSchema } from "../annotation";
import { _getRoutes } from "../annotation/route";
import { _getControllerSchema, _getRouteSchema } from "../annotation/schema";

type OpenAPIConfig = {
  title: string;
  version: string;
  description?: string;
};

class OpenAPIGenerator {
  private controllers = new Set<{ class: Function; prefix: string }>();
  private config: OpenAPIConfig = { title: "API", version: "1.0.0" };

  setConfig(config: OpenAPIConfig): void {
    this.config = config;
  }

  registerController(controllerClass: Function, prefix: string): void {
    this.controllers.add({ class: controllerClass, prefix });
  }

  generateSpec(): OpenAPIV3.Document {
    const config = this.config;
    const paths: OpenAPIV3.PathsObject = {};
    const tags: OpenAPIV3.TagObject[] = [];

    for (const { class: controllerClass, prefix } of this.controllers) {
      const routes = _getRoutes(controllerClass);
      const controllerSchema = _getControllerSchema(controllerClass);

      if (controllerSchema?.title) {
        tags.push({
          name: controllerSchema.title,
          description: controllerSchema.description,
        });
      }

      for (const route of routes) {
        if (route.method === "USE") continue;

        const schemas = _getValidatorSchema(controllerClass, route.fnName);
        const routeSchema = _getRouteSchema(controllerClass, route.fnName);
        if (route.path instanceof RegExp) {
          throw new Error(
            `You have a route with a regex path of ${route.path.source}. This is not compatible with OpenAPI.`,
          );
        }
        // convert paths from :id -> {id}
        const openApiPath = (prefix + route.path).replace(
          /:([A-Za-z0-9_]+)/g,
          "{$1}",
        );

        if (!paths[openApiPath]) {
          paths[openApiPath] = {};
        }

        const responses: OpenAPIV3.ResponsesObject = {};

        if (schemas?.responseBody) {
          const responseSchema = this.toJsonSchema(
            schemas.responseBody,
            "output",
          ) as OpenAPIV3.SchemaObject;
          responses["200"] = {
            description: responseSchema.description ?? "Successful response",
            content: {
              "application/json": {
                schema: responseSchema,
              },
            },
          };
        } else {
          responses["200"] = { description: "Successful response" };
        }

        if (routeSchema?.responses) {
          for (const resp of routeSchema.responses) {
            const statusCode = String(resp.statusCode);
            const existingResponse = responses[statusCode] as
              | OpenAPIV3.ResponseObject
              | undefined;
            const existingSchema =
              existingResponse && "content" in existingResponse ?
                (existingResponse.content?.["application/json"]?.schema as
                  | OpenAPIV3.SchemaObject
                  | undefined)
              : undefined;
            const responseSchema =
              resp.schema ?
                (this.toJsonSchema(
                  resp.schema,
                  "output",
                ) as OpenAPIV3.SchemaObject)
              : statusCode === "200" ? existingSchema
              : undefined;
            responses[statusCode] = {
              ...existingResponse,
              description:
                resp.description ??
                responseSchema?.description ??
                existingResponse?.description ??
                `Response ${resp.statusCode}`,
              ...(responseSchema ?
                {
                  content: {
                    "application/json": {
                      schema: responseSchema,
                    },
                  },
                }
              : {}),
            };
          }
        }

        const operation: OpenAPIV3.OperationObject = {
          responses,
          summary: routeSchema?.summary,
          description: routeSchema?.description,
          tags: controllerSchema?.title ? [controllerSchema.title] : undefined,
        };

        const parameters: OpenAPIV3.ParameterObject[] = [];

        if (schemas?.requestParam) {
          const paramSchema = this.toJsonSchema(schemas.requestParam, "input");
          if (paramSchema.type === "object" && paramSchema.properties) {
            for (const [name, schema] of Object.entries(
              paramSchema.properties,
            )) {
              const parameterSchema = schema as OpenAPIV3.SchemaObject;
              parameters.push({
                name,
                in: "path",
                required: true,
                description: parameterSchema.description,
                schema: parameterSchema,
              });
            }
          }
        }

        if (schemas?.requestQuery) {
          const querySchema = this.toJsonSchema(schemas.requestQuery, "input");
          if (querySchema.type === "object" && querySchema.properties) {
            for (const [name, schema] of Object.entries(
              querySchema.properties,
            )) {
              const isRequired =
                Array.isArray(querySchema.required) &&
                querySchema.required.includes(name);
              const parameterSchema = schema as OpenAPIV3.SchemaObject;
              parameters.push({
                name,
                in: "query",
                required: isRequired,
                description: parameterSchema.description,
                schema: parameterSchema,
              });
            }
          }
        }

        if (parameters.length > 0) {
          operation.parameters = parameters;
        }

        if (schemas?.requestBody) {
          const requestSchema = this.toJsonSchema(
            schemas.requestBody,
            "input",
          ) as OpenAPIV3.SchemaObject;
          operation.requestBody = {
            required: true,
            description: requestSchema.description,
            content: {
              "application/json": {
                schema: requestSchema,
              },
            },
          };
        }

        const method = route.method.toLowerCase() as Lowercase<
          typeof route.method
        >;
        (paths[openApiPath] as any)[method] = operation;
      }
    }

    return {
      openapi: "3.0.0",
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      tags: tags.length > 0 ? tags : undefined,
      paths,
    };
  }

  private toJsonSchema(
    schema: StandardJSONSchemaV1,
    direction: "input" | "output" = "output",
  ): Record<string, unknown> {
    try {
      const jsonSchema = schema["~standard"].jsonSchema;
      if (direction === "input" && jsonSchema.input) {
        return jsonSchema.input({ target: "openapi-3.0" });
      }
      return jsonSchema.output({ target: "openapi-3.0" });
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("Transforms cannot be represented in JSON Schema")
      ) {
        throw new Error(
          `${e.message}.\nIt appears that you are using z.transform() - it is highly recommended that you use z.codec instead - https://zod.dev/codecs`,
        );
      }
      throw e;
    }
  }
}

export const openApiGenerator = new OpenAPIGenerator();

export function _registerControllerClass(
  controllerClass: Function,
  prefix: string,
): void {
  openApiGenerator.registerController(controllerClass, prefix);
}

export function setOpenApiConfig(config: OpenAPIConfig): void {
  openApiGenerator.setConfig(config);
}

export function generateOpenApiSpec(): OpenAPIV3.Document {
  return openApiGenerator.generateSpec();
}
