export type ExpressRouterMethodKey =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export type ExpressRouterMethods =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "patch"
  | "head";

export const methodResolve: Record<
  ExpressRouterMethodKey,
  ExpressRouterMethods
> = {
  GET: "get",
  PUT: "put",
  POST: "post",
  DELETE: "delete",
  OPTIONS: "options",
  PATCH: "patch",
  HEAD: "head",
} as const;

export type RouteDefinition = {
  /**
   * Express.js HTTP method
   */
  method: ExpressRouterMethodKey;

  /**
   * The path to define the route on.
   */
  path: string;

  /**
   * The name of the function the `@Route` annotation was applied on.
   */
  fnName: string;
};

export type Class<T> = new (...args: any[]) => T;
