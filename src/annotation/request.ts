/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { StandardSchemaV1 } from "@standard-schema/spec";

import { ParserError, type ParserErrorLocation } from "../helper";

type RequestSchemaDefinition = {
  body?: StandardSchemaV1;
  param?: StandardSchemaV1;
  query?: StandardSchemaV1;
};

type MethodName = string;

const _requestSchemaStore = new WeakMap<
  Function, // class
  Map<MethodName, RequestSchemaDefinition>
>();

/**
 * Apply to a route method to have `request.body` be parsed by `schema`.
 *
 * This annotation will parse `request.body` & then override `request.body`.
 * You can then just simply cast `request.body` for your use
 *
 * @example
 * ```ts
 *  const CREATE_BOOK_REQUEST_BODY_SCHEMA = z.object({
 *    name: z.string(),
 *    description: z.string().optional(),
 *  });
 *
 * ⠀@Controller({ prefix: "/api/book" })
 *  class BookController {
 *   ⠀@RequestBody(CREATE_BOOK_REQUEST_BODY_SCHEMA)
 *   ⠀@POST()
 *    public createBook(request: e.Request) {
 *      const { name, description } = request.body as unknown as z.infer<
 *        typeof CREATE_BOOK_REQUEST_BODY_SCHEMA
 *      >;
 *    }
 *  }
 * ```
 */
export function RequestBody(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "body", schema, fnName);
  };
}

/**
 * Apply to a route method to have `request.param` be parsed by `schema`.
 *
 * This annotation will parse `request.param` & then override `request.param`.
 * You can then just simply cast `request.param` for your use
 *
 * @example
 * ```ts
 *  const GET_BOOK_REQUEST_PARAM_SCHEMA = z.object({
 *    bookId: z.string(),
 *  });
 *
 * ⠀@Controller({ prefix: "/api/book" })
 *  class BookController {
 *   ⠀@RequestParam(GET_BOOK_REQUEST_PARAM_SCHEMA)
 *   ⠀@GET("/:bookId")
 *    public getBook(request: e.Request) {
 *      const { bookId } = request.param as unknown as z.infer<
 *        typeof GET_BOOK_REQUEST_PARAM_SCHEMA
 *      >;
 *    }
 *  }
 * ```
 */
export function RequestParam(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "param", schema, fnName);
  };
}

/**
 * Apply to a route method to have `request.query` be parsed by `schema`.
 *
 * This annotation will parse `request.query` & then override `request.query`.
 * You can then just simply cast `request.query` for your use
 *
 * @example
 * ```ts
 *  const LIST_BOOKS_REQUEST_QUERY_SCHEMA = z.object({
 *    sort: z.enum(["name", "createdAt"]).optional(),
 *    q: z.string().optional(),
 *  });
 *
 * ⠀@Controller({ prefix: "/api/book" })
 *  class BookController {
 *   ⠀@RequestQuery(LIST_BOOKS_REQUEST_QUERY_SCHEMA)
 *   ⠀@GET()
 *    public listBooks(request: e.Request) {
 *      const { sort, q } = request.query as unknown as z.infer<
 *        typeof LIST_BOOKS_REQUEST_QUERY_SCHEMA
 *      >;
 *    }
 *  }
 * ```
 */
export function RequestQuery(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "query", schema, fnName);
  };
}

function _getOrCreateRequestSchemaDefinition(
  ctor: Function,
  fnName: string,
): RequestSchemaDefinition {
  const byFn = (() => {
    const fn = _requestSchemaStore.get(ctor);
    if (fn) {
      return fn;
    }

    const newFn = new Map<string, RequestSchemaDefinition>();
    _requestSchemaStore.set(ctor, newFn);
    return newFn;
  })();

  const existing = byFn.get(fnName);
  if (existing) return existing;

  const created: RequestSchemaDefinition = {};
  byFn.set(fnName, created);
  return created;
}

function _setOnce(
  def: RequestSchemaDefinition,
  key: keyof RequestSchemaDefinition,
  schema: StandardSchemaV1,
  fnName: string,
) {
  if (def[key]) {
    throw new Error(
      `Duplicate request schema for "${String(key)}" on method "${fnName}"`,
    );
  }
  def[key] = schema;
}

export function _getRequestSchemas(ctor: Function, fnName: string) {
  return _requestSchemaStore.get(ctor)?.get(fnName);
}

export async function _parseOrThrow<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  input: unknown,
  kind: ParserErrorLocation,
): Promise<StandardSchemaV1.InferOutput<TSchema>> {
  const result = await schema["~standard"].validate(input);

  if (result.issues) {
    console.debug(`Failed to parse a schema`);
    throw new ParserError(kind, result.issues, schema["~standard"].vendor);
  }

  return result.value as StandardSchemaV1.InferOutput<TSchema>;
}
