import { Router } from "express";
import { _InjectableDeps, _resolve } from "./injectable";
import { Class, RouteDefinition, methodResolve } from "../types";
import { _getRoutes } from "./route";
import { Sapling } from "../helper/sapling";
import { Html404ErrorPage } from "../html/404";
import { ResponseEntity, RedirectView } from "../helper";

export const _ControllerRegistry = new WeakMap<Function, Router>();

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
export function Controller(
  { prefix = "", deps = [] }: ControllerProps = {
    prefix: "",
    deps: [],
  },
): ClassDecorator {
  return (target: Function) => {
    const targetClass = target as Class<any>;

    const router = Router();
    const routes: readonly RouteDefinition[] = _getRoutes(target);

    const usedRoutes = new Set<string>();

    _InjectableDeps.set(targetClass, deps);
    const controllerInstance = _resolve(targetClass);

    for (const { method, path, fnName } of routes) {
      const fn = controllerInstance[fnName];
      if (typeof fn !== "function") continue;

      // When path is a RegExp, use it directly without prefix
      // When path is a string, prepend the prefix
      const fp = path instanceof RegExp ? path : prefix + path;
      const routeKey = method + " " + (path instanceof RegExp ? path.source : fp);

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
      router[methodName](fp, async (request, response, next) => {
        const result = await fn.bind(controllerInstance)(
          request,
          response,
          next,
        );

        // Middleware (USE) should not send responses, just call next()
        if (method === "USE") {
          return;
        }

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

        if (!response.writableEnded) {
          response
            .status(404)
            .send(Html404ErrorPage(`Cannot ${methodName.toUpperCase()} ${path instanceof RegExp ? path.source : fp}`));
        }
      });
    }

    _ControllerRegistry.set(targetClass, router);
  };
}
