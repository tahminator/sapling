// all exported types

import type { NextFunction, Request, Response } from "express";

export type ExpressRouterMethodKey =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "USE";

export type ExpressRouterMethods = Lowercase<ExpressRouterMethodKey>;

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
  USE: "use",
} as const;

export type RouteDefinition = {
  /**
   * Express.js HTTP method.
   */
  method: ExpressRouterMethodKey;

  /**
   * The path to define the route on. Can be a string or RegExp.
   */
  path: string | RegExp;

  /**
   * The name of the function the `@Route` annotation was applied on.
   */
  fnName: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class<T> = new (...args: any[]) => T;

export type HttpHeaders = Record<string, string>;

export type ExpressMiddlewareFn = (
  $1: Request,
  $2: Response,
  $3: NextFunction,
) => void;

/**
 * Types that {@link TypedRequest} can override. Every key is optional;
 * an omitted key keeps Express's default for that slot.
 */
export type RequestTypes = {
  /** `request.params`. Defaults to `ParamsDictionary`. */
  params?: unknown;
  /** `request.body`. Defaults to `any`. */
  body?: unknown;
  /** `request.query`. Defaults to `ParsedQs`. */
  query?: unknown;
  /** Body type of `request.res`. Defaults to `any`. */
  resBody?: unknown;
  /** `request.res.locals`. Defaults to `Record<string, any>`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locals?: Record<string, any>;
};

type Slot<T, Key extends keyof RequestTypes, Default> =
  Key extends keyof T ? T[Key] : Default;

/**
 * Express `Request` with named slots instead of positional generics.
 *
 * `TypedRequest<{ body: Body }>` is `Request<ParamsDictionary, any, Body, ParsedQs>`.
 * Slots left at Express's defaults are not checked by `@RequestParam`, `@RequestBody`
 * and `@RequestQuery`; overridden slots are. Unknown keys are rejected.
 *
 * @example
 * ```ts
 * @RequestParam(UserParamsSchema)
 * @RequestBody(UpdateUserSchema)
 * @PUT("/:id")
 * updateUser(
 *   request: TypedRequest<{
 *     params: z.infer<typeof UserParamsSchema>;
 *     body: z.infer<typeof UpdateUserSchema>;
 *   }>,
 * ) {}
 * ```
 */
export type TypedRequest<
  T extends RequestTypes & {
    [Key in Exclude<keyof T, keyof RequestTypes>]: never;
  },
> = Request<
  Slot<T, "params", Request["params"]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Slot<T, "resBody", any>,
  Slot<T, "body", Request["body"]>,
  Slot<T, "query", Request["query"]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { locals: infer Locals extends Record<string, any> } ? Locals
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
>;

// THE SAUCE:⠀
