import { RouteDefinition, ExpressRouterMethodKey } from "../types";

const _routeStore = new WeakMap<Function, RouteDefinition[]>();

/**
 * Custom annotation that will store all routes inside of a map,
 * which can then be used to initialize all the routes to the router.
 */
export function _Route({
  method,
  path = "",
}: {
  method: ExpressRouterMethodKey;
  path: string | undefined;
}): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = (target as { constructor: Function }).constructor;
    const list = _routeStore.get(ctor) ?? [];
    list.push({ method, path, fnName: String(propertyKey) });
    _routeStore.set(ctor, list);
  };
}

/**
 * Register GET route on the given path (default "") for the given controller.
 */
export const GET = (path: string | undefined = "") =>
  _Route({
    method: "GET",
    path,
  });

/**
 * Register POST route on the given path (default "") for the given controller.
 */
export const POST = (path: string | undefined = "") =>
  _Route({
    method: "POST",
    path,
  });

/**
 * Register PUT route on the given path (default "") for the given controller.
 */
export const PUT = (path: string | undefined = "") =>
  _Route({
    method: "PUT",
    path,
  });

/**
 * Register DELETE route on the given path (default "") for the given controller.
 */
export const DELETE = (path: string | undefined = "") =>
  _Route({
    method: "DELETE",
    path,
  });

/**
 * Register OPTIONS route on the given path (default "") for the given controller.
 */
export const OPTIONS = (path: string | undefined = "") =>
  _Route({
    method: "OPTIONS",
    path,
  });

/**
 * Register PATCH route on the given path (default "") for the given controller.
 */
export const PATCH = (path: string | undefined = "") =>
  _Route({
    method: "PATCH",
    path,
  });

/**
 * Register HEAD route on the given path (default "") for the given controller.
 */
export const HEAD = (path: string | undefined = "") =>
  _Route({
    method: "HEAD",
    path,
  });

/**
 * Register a middleware route on the given path (default "") for the given controller.
 */
export const Middleware = (path: string | undefined = "") =>
  _Route({
    method: "USE",
    path,
  });

/**
 * Given a class constructor, fetch all the routes attached.
 */
export function _getRoutes(ctor: Function): readonly RouteDefinition[] {
  return _routeStore.get(ctor) ?? [];
}
