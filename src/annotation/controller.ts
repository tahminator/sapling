/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Router,
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";

import type { Class, ExpressRouterMethodKey, RouteDefinition } from "../types";

import { ResponseEntity, RedirectView } from "../helper";
import { _registerController } from "../helper/openapi";
import { Sapling } from "../helper/sapling";
import { Html404ErrorPage } from "../html/404";
import { methodResolve } from "../types";
import { _InjectableDeps, _resolve } from "./injectable";
import { _getRoutes } from "./route";
import { _getValidatorSchema, _parseOrThrow } from "./validator";

export const _ControllerRegistry: WeakMap<
  Function,
  Router | ErrorRequestHandler
> = new WeakMap<Function, Router | ErrorRequestHandler>();

type ControllerProps =
  | {
      /**
       * Optional URL prefix applied to all routes in the controller. Defaults to "".
       */
      prefix?: string;

      /**
       * Optional array of dependencies to be injected into the constructor that are `@Injectable`
       */
      deps?: Array<Class<any>>;
    }
  | undefined;

/**
 * Registers a class as an HTTP controller and registers its routes.
 *
 * @param [prefix] Optional URL prefix applied to all routes in the controller. Defaults to "".
 * @param [deps] Optional array of dependencies to be injected into the constructor that are `@Injectable`
 */
export function Controller({
  prefix = "",
  deps = [],
}: ControllerProps = {}): ClassDecorator {
  return (target: Function) => {
    const targetClass = target as Class<any>;

    _registerController(target, prefix);

    const router = Router();
    const routes: readonly RouteDefinition[] = _getRoutes(target);

    const usedRoutes = new Set<string>();

    _InjectableDeps.set(targetClass, deps);
    const controllerInstance = _resolve(targetClass);

    const errorMiddlewares = routes.reduce((prev, r) => {
      if (r.method !== "USE") return prev;
      const fn = controllerInstance[r.fnName];
      return typeof fn === "function" && fn.length >= 4 ? prev + 1 : prev;
    }, 0);

    if (errorMiddlewares > 1) {
      throw new Error(
        `Invalid @MiddlewareClass class "${targetClass.name}":
Multiple 4-arg @Middleware() error handlers were found.
Express will not enter routers in error mode, so an error-middleware class must expose exactly one error handler.
Split these into separate @MiddlewareClass classes, or merge the logic into a single method.`,
      );
    }

    for (const { method, path, fnName } of routes) {
      const fn: Function = controllerInstance[fnName];
      if (typeof fn !== "function") continue;

      // When path is a RegExp, use it directly without prefix
      // When path is a string, prepend the prefix
      const fp = path instanceof RegExp ? path : prefix + path;
      const routeKey =
        method + " " + (path instanceof RegExp ? path.source : fp);

      // Only check for duplicates on non-middleware routes
      // Middleware (USE) can have duplicate paths, and different HTTP methods can share paths
      if (method !== "USE" && usedRoutes.has(routeKey)) {
        throw new Error(
          `Duplicate route [${method}] "${path instanceof RegExp ? path.source : fp}" detected in controller "${target.name}"`,
        );
      }
      if (method !== "USE") {
        usedRoutes.add(routeKey);
      }

      const methodName = methodResolve[method];

      if (method === "USE" && fn.length >= 4) {
        const middlewareFn: ErrorRequestHandler = async (
          err,
          request,
          response,
          next,
        ) => {
          try {
            await validate({
              target,
              fnName,
              request,
            });

            const result = fn.bind(controllerInstance)(
              err,
              request,
              response,
              next,
            );

            await handleResult({
              result,
              response,
              target,
              fnName,
              method,
              path: path instanceof RegExp ? path.source : (fp as string),
              isErrorMiddleware: true,
            });
          } catch (e) {
            console.error(e);
            next(e);
          }
        };
        _ControllerRegistry.set(targetClass, middlewareFn);
        return;
      }

      router[methodName](fp, async (request, response, next) => {
        await validate({
          target,
          fnName,
          request,
        });

        const result = await fn.bind(controllerInstance)(
          request,
          response,
          next,
        );

        await handleResult({
          result,
          response,
          target,
          fnName,
          method,
          path: path instanceof RegExp ? path.source : (fp as string),
        });
      });
    }

    _ControllerRegistry.set(targetClass, router);
  };
}

async function handleResult({
  result,
  target,
  fnName,
  response,
  method,
  path,
  isErrorMiddleware = false,
}: {
  result: any;
  target: Function;
  fnName: string;
  response: Response;
  method: ExpressRouterMethodKey;
  path: string;
  isErrorMiddleware?: boolean;
}) {
  const schemas = _getValidatorSchema(target, fnName);

  if (result instanceof ResponseEntity) {
    const body =
      schemas && schemas.responseBody ?
        await _parseOrThrow(
          schemas.responseBody,
          result.getBody(),
          "resbody",
          fnName,
        )
      : result.getBody();
    response
      .contentType("application/json")
      .status(result.getStatusCode())
      .set(result.getHeaders())
      .send(Sapling.serialize(body));
    return;
  }

  if (result instanceof RedirectView) {
    response.redirect(result.getUrl());
    return;
  }

  if (!isErrorMiddleware && method !== "USE" && !response.writableEnded) {
    response.status(404).send(Html404ErrorPage(`Cannot ${method} ${path}`));
  }
}

async function validate({
  target,
  fnName,
  request,
}: {
  target: Function;
  fnName: string;
  request: Request;
}) {
  const schemas = _getValidatorSchema(target, fnName);
  if (schemas) {
    if (schemas.requestBody) {
      request.body = await _parseOrThrow(
        schemas.requestBody,
        request.body,
        "reqbody",
        fnName,
      );
    }
    if (schemas.requestParam) {
      request.params = (await _parseOrThrow(
        schemas.requestParam,
        request.params,
        "reqparams",
        fnName,
      )) as Record<string, string>;
    }
    if (schemas.requestQuery) {
      const parsedQuery = await _parseOrThrow(
        schemas.requestQuery,
        request.query,
        "reqquery",
        fnName,
      );

      // Express 5 exposes `request.query` as a readonly getter.
      // Override it at the instance level so parsed values persist.
      Object.defineProperty(request, "query", {
        value: parsedQuery,
        writable: true,
        configurable: true,
      });
    }
  }
}
