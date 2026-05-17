/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

import { ParserError, type ParserErrorLocation } from "../helper";

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
    _saveValidatorSchema(def, "responseBody", schema, fnName);
  };
}

export function RequestBody(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "requestBody", schema, fnName);
  };
}

export function RequestParam(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "requestParam", schema, fnName);
  };
}

export function RequestQuery(
  schema: StandardSchemaV1 & StandardJSONSchemaV1,
): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "requestQuery", schema, fnName);
  };
}

function getOrCreateValidatorSchemaStore<T>(
  store: WeakMap<Function, Map<string, T>>,
  ctor: Function,
): Map<string, T> {
  const existing = store.get(ctor);
  if (existing) return existing;
  const created = new Map<string, T>();
  store.set(ctor, created);
  return created;
}

export function _getOrCreateSchemaDefinition(
  ctor: Function,
  fnName: string,
): ValidatorSchema {
  const byFn = getOrCreateValidatorSchemaStore(_validatorSchemaStore, ctor);
  const existing = byFn.get(fnName);
  if (existing) return existing;
  const created: ValidatorSchema = {};
  byFn.set(fnName, created);
  return created;
}

export async function _parseOrThrow<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  input: unknown,
  location: ParserErrorLocation,
  fnName: string,
): Promise<StandardSchemaV1.InferOutput<TSchema>> {
  const result = await schema["~standard"].validate(input);

  if (result.issues) {
    throw new ParserError(
      location,
      result.issues,
      schema["~standard"].vendor,
      fnName,
    );
  }

  return result.value as StandardSchemaV1.InferOutput<TSchema>;
}

export function _saveValidatorSchema(
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

export function _getValidatorSchema(ctor: Function, fnName: string) {
  return _validatorSchemaStore.get(ctor)?.get(fnName);
}
