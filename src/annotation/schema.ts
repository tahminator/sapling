/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

import type { HttpStatus } from "../enum";

export type ResponseSchema = {
  statusCode: HttpStatus;
  description?: string;
  schema?: StandardSchemaV1 & StandardJSONSchemaV1;
};

export type RouteSchemaDefinition = {
  summary?: string;
  description?: string;
  responses?: ResponseSchema[];
};

export type ControllerSchemaDefinition = {
  title?: string;
  description?: string;
};

type MethodName = string;

export function ControllerSchema(options: {
  title?: string;
  description?: string;
}): ClassDecorator {
  return (target: Function) => {
    _setControllerSchema(target, options);
  };
}

export function RouteSchema(options: {
  summary?: string;
  description?: string;
  responses?: ResponseSchema[];
}): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const fnName = String(propertyKey);
    _setRouteSchema(ctor, fnName, options);
  };
}

const _routeSchemaStore = new WeakMap<
  Function,
  Map<MethodName, RouteSchemaDefinition>
>();

const _controllerSchemaStore = new WeakMap<
  Function,
  ControllerSchemaDefinition
>();

function getOrCreateRouteSchemaStore<T>(
  store: WeakMap<Function, Map<string, T>>,
  ctor: Function,
): Map<string, T> {
  const existing = store.get(ctor);
  if (existing) return existing;
  const created = new Map<string, T>();
  store.set(ctor, created);
  return created;
}

export function _setRouteSchema(
  ctor: Function,
  fnName: string,
  options: RouteSchemaDefinition,
) {
  const byFn = getOrCreateRouteSchemaStore(_routeSchemaStore, ctor);
  byFn.set(fnName, options);
}

export function _setControllerSchema(
  ctor: Function,
  options: ControllerSchemaDefinition,
) {
  _controllerSchemaStore.set(ctor, options);
}

export function _getRouteSchema(ctor: Function, fnName: string) {
  return _routeSchemaStore.get(ctor)?.get(fnName);
}

export function _getControllerSchema(ctor: Function) {
  return _controllerSchemaStore.get(ctor);
}
