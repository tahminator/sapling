/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type ErrorRequestHandler } from "express";

import type { Class, RouteDefinition } from "../types";

import { ResponseEntity, RedirectView } from "../helper";
import { Sapling } from "../helper/sapling";
import { Html404ErrorPage } from "../html/404";
import { methodResolve } from "../types";
import { _InjectableDeps, _resolve } from "./injectable";
import { _getRequestSchemas, _parseOrThrow } from "./request";
import { _getRoutes } from "./route";

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
            const result = fn.bind(controllerInstance)(
              err,
              request,
              response,
              next,
            );

            if (result instanceof ResponseEntity) {
              response
                .contentType("application/json")
                .status(result.getStatusCode())
                .set(result.getHeaders())
                .send(Sapling.serialize(result.getBody()));
              return;
            }

            if (result instanceof RedirectView) {
              response.redirect(result.getUrl());
              return;
            }
          } catch (e) {
            console.error(e);
            next(e);
          }
        };
        _ControllerRegistry.set(targetClass, middlewareFn);
        return;
      }

      router[methodName](fp, async (request, response, next) => {
        const schemas = _getRequestSchemas(target, fnName);
        if (schemas) {
          if (schemas.body) {
            request.body = await _parseOrThrow(
              schemas.body,
              request.body,
              "reqbody",
            );
          }
          if (schemas.param) {
            request.params = (await _parseOrThrow(
              schemas.param,
              request.params,
              "reqparams",
            )) as Record<string, string>;
          }
          if (schemas.query) {
            request.query = (await _parseOrThrow(
              schemas.query,
              request.query,
              "reqquery",
            )) as Record<string, any>;
          }
        }

        const result = await fn.bind(controllerInstance)(
          request,
          response,
          next,
        );

        if (result instanceof ResponseEntity) {
          response
            .contentType("application/json")
            .status(result.getStatusCode())
            .set(result.getHeaders())
            .send(Sapling.serialize(result.getBody()));
          return;
        }

        if (result instanceof RedirectView) {
          response.redirect(result.getUrl());
          return;
        }

        if (method !== "USE" && !response.writableEnded) {
          response
            .status(404)
            .send(
              Html404ErrorPage(
                `Cannot ${methodName.toUpperCase()} ${path instanceof RegExp ? path.source : fp}`,
              ),
            );
        }
      });
    }

    _ControllerRegistry.set(targetClass, router);
  };
}
