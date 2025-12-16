// all exported types

import { NextFunction, Request, Response } from "express";

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

export type Class<T> = new (...args: any[]) => T;

export type HttpHeaders = Record<string, string>;

export type ExpressMiddlewareFn = (
  $1: Request,
  $2: Response,
  $3: NextFunction,
) => void;
