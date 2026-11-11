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

// `never[]` accepts any parameter list
type Handler = (...args: never[]) => unknown;

type IsAny<T> = 0 extends 1 & T ? true : false;

// distributes over unions like `ResponseEntity<A> | RedirectView`
type BodyOf<Result> = Result extends ResponseEntity<infer Body> ? Body : never;

// `never` when the handler returns no `ResponseEntity` (or `any`)
type ResponseBodyOf<Fn extends Handler> =
  IsAny<Awaited<ReturnType<Fn>>> extends true ? never
  : BodyOf<Awaited<ReturnType<Fn>>>;

type RequestLike = { body: unknown; params: unknown; query: unknown };

type AsRequest<T> =
  IsAny<T> extends true ? never
  : T extends RequestLike ? T
  : never;

// first parameter, or second for error middlewares (`err, request, ...`)
type RequestOf<Fn extends Handler> =
  Fn extends (
    (first: infer First, second: infer Second, ...rest: never[]) => unknown
  ) ?
    [AsRequest<First>] extends [never] ?
      AsRequest<Second>
    : AsRequest<First>
  : never;

// left at Express's defaults, so there is nothing to check
type IsUndeclared<Declared> =
  IsAny<Declared> extends true ? true
  : [Declared] extends [never] ? true
  : string extends keyof Declared ? true
  : false;

type Mismatch<Decorator extends string, SchemaType, HandlerType> = [
  `the @${Decorator} schema and the handler type disagree`,
  { schema: SchemaType; handler: HandlerType },
];

// `Fn` if `From` fits `To`, otherwise a type `Fn` can't be assigned to
type Checked<Fn, From, To, Error> = [From] extends [To] ? Fn : Error;

// returned body must be accepted by the schema's input
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

// schema output must fit the handler's declared `request[Key]`
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
