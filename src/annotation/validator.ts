/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

import { ParserError, type ParserErrorLocation } from "../helper";
import { _getOrCreateMap } from "../utils";

type MethodName = string;

const _validatorSchemaStore = new WeakMap<
  Function,
  Map<MethodName, ValidatorSchema>
>();

export type ValidatorSchema = {
  requestBody?: StandardSchemaV1 & StandardJSONSchemaV1;
  requestParam?: StandardSchemaV1 & StandardJSONSchemaV1;
  requestQuery?: StandardSchemaV1 & StandardJSONSchemaV1;
  responseBody?: StandardSchemaV1 & StandardJSONSchemaV1;
};

export function ResponseBody(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _setOnce(def, "responseBody", schema, fnName);
  };
}

export function RequestBody(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _setOnce(def, "requestBody", schema, fnName);
  };
}

export function RequestParam(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _setOnce(def, "requestParam", schema, fnName);
  };
}

export function RequestQuery(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _setOnce(def, "requestQuery", schema, fnName);
  };
}

export function _getOrCreateSchemaDefinition(
  ctor: Function,
  fnName: string,
): ValidatorSchema {
  const byFn = _getOrCreateMap(_validatorSchemaStore, ctor);
  const existing = byFn.get(fnName);
  if (existing) return existing;
  const created: ValidatorSchema = {};
  byFn.set(fnName, created);
  return created;
}

export async function _parseOrThrow<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  input: unknown,
  kind: ParserErrorLocation,
): Promise<StandardSchemaV1.InferOutput<TSchema>> {
  const result = await schema["~standard"].validate(input);

  if (result.issues) {
    console.debug(
      `Failed to parse ${schema["~standard"].vendor} schema\nissues: ${JSON.stringify(result.issues, null, 2)}`,
    );
    throw new ParserError(kind, result.issues, schema["~standard"].vendor);
  }

  return result.value as StandardSchemaV1.InferOutput<TSchema>;
}

export function _getValidatorSchema(ctor: Function, fnName: string) {
  return _validatorSchemaStore.get(ctor)?.get(fnName);
}

export function _setOnce(
  def: ValidatorSchema,
  key: keyof ValidatorSchema,
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
  fnName: string,
) {
  if (def[key]) {
    throw new Error(
      `Duplicate schema for "${String(key)}" on method "${fnName}"`,
    );
  }
  def[key] = schema;
}
