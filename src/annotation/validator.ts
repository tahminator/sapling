/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

import {
  ParserError,
  type ParserErrorLocation,
  type ResponseEntity,
} from "../helper";

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

type Schema = StandardSchemaV1 & StandardJSONSchemaV1;

// `never[]` so a handler with any parameter list is assignable
type Handler = (...args: never[]) => unknown;

type IsAny<T> = 0 extends 1 & T ? true : false;

// distributes, so `ResponseEntity<A> | RedirectView` yields `A`
type BodyOf<Result> = Result extends ResponseEntity<infer Body> ? Body : never;

/**
 * Body type of every `ResponseEntity` the handler can return,
 * or `never` when it returns none (or returns `any`).
 */
type ResponseBodyOf<Fn extends Handler> =
  IsAny<Awaited<ReturnType<Fn>>> extends true ? never
  : BodyOf<Awaited<ReturnType<Fn>>>;

type RequestLike = { body: unknown; params: unknown; query: unknown };

type AsRequest<T> =
  IsAny<T> extends true ? never
  : T extends RequestLike ? T
  : never;

/**
 * The handler's request parameter: the first parameter for routes,
 * the second for error middlewares (`err, request, response, next`).
 */
type RequestOf<Fn extends Handler> =
  Fn extends (
    (first: infer First, second: infer Second, ...rest: never[]) => unknown
  ) ?
    [AsRequest<First>] extends [never] ?
      AsRequest<Second>
    : AsRequest<First>
  : never;

/**
 * `true` when the handler left the type at Express's default
 * (`any` body, `ParamsDictionary` params, `ParsedQs` query) or has no request parameter,
 * in which case there is nothing to compare the schema against.
 */
type IsUndeclared<Declared> =
  IsAny<Declared> extends true ? true
  : [Declared] extends [never] ? true
  : string extends keyof Declared ? true
  : false;

type Mismatch<Decorator extends string, SchemaType, HandlerType> = [
  `the @${Decorator} schema and the handler type disagree`,
  { schema: SchemaType; handler: HandlerType },
];

// the handler if `From` is assignable to `To`. a tuple the handler can't be assigned to if not
type Checked<Fn, From, To, Error> = [From] extends [To] ? Fn : Error;

/**
 * Validates the returned `ResponseEntity` body. Fails to compile if the handler
 * returns a body that the schema does not accept as input.
 */
type CheckedResponseBody<S extends Schema, Fn extends Handler> =
  [ResponseBodyOf<Fn>] extends [never] ? Fn
  : Checked<
      Fn,
      ResponseBodyOf<Fn>,
      StandardSchemaV1.InferInput<S>,
      Mismatch<
        "ResponseBody",
        StandardSchemaV1.InferInput<S>,
        ResponseBodyOf<Fn>
      >
    >;

/**
 * Validates `request[Key]`. Fails to compile if the handler declares a type for it
 * (e.g. `Request<Params, any, Body, Query>`) that the schema output is not assignable to.
 */
type CheckedRequest<
  S extends Schema,
  Fn extends Handler,
  Key extends keyof RequestLike,
  Decorator extends string,
> =
  IsUndeclared<RequestOf<Fn>[Key]> extends true ? Fn
  : Checked<
      Fn,
      StandardSchemaV1.InferOutput<S>,
      RequestOf<Fn>[Key],
      Mismatch<Decorator, StandardSchemaV1.InferOutput<S>, RequestOf<Fn>[Key]>
    >;

export function ResponseBody<S extends Schema>(schema: S) {
  return <Fn extends Handler>(
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<CheckedResponseBody<S, Fn>>,
  ): void => {
    const ctor = target.constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "responseBody", schema, fnName);
  };
}

export function RequestBody<S extends Schema>(schema: S) {
  return <Fn extends Handler>(
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<
      CheckedRequest<S, Fn, "body", "RequestBody">
    >,
  ): void => {
    const ctor = target.constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "requestBody", schema, fnName);
  };
}

export function RequestParam<S extends Schema>(schema: S) {
  return <Fn extends Handler>(
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<
      CheckedRequest<S, Fn, "params", "RequestParam">
    >,
  ): void => {
    const ctor = target.constructor;
    const fnName = String(propertyKey);
    const def = _getOrCreateSchemaDefinition(ctor, fnName);
    _saveValidatorSchema(def, "requestParam", schema, fnName);
  };
}

export function RequestQuery<S extends Schema>(schema: S) {
  return <Fn extends Handler>(
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<
      CheckedRequest<S, Fn, "query", "RequestQuery">
    >,
  ): void => {
    const ctor = target.constructor;
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
