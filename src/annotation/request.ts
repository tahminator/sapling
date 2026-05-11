/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { StandardSchemaV1 } from "@standard-schema/spec";

import { ParserError, type ParserErrorLocation } from "../exception";

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

export function RequestBody(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "body", schema, fnName);
  };
}

export function RequestParam(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "param", schema, fnName);
  };
}

export function RequestQuery(schema: StandardSchemaV1): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateRequestSchemaDefinition(ctor, fnName);
    _setOnce(def, "query", schema, fnName);
  };
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
    throw new ParserError(kind, result.issues, schema["~standard"].vendor);
  }

  return result.value as StandardSchemaV1.InferOutput<TSchema>;
}
