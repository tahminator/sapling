import { Router } from "express";
import { _InjectableDeps, _resolve } from "./injectable";
import { Class, RouteDefinition, methodResolve } from "../types";
import { _getRoutes } from "./route";
import { Sapling } from "../helper/sapling";
import { Html404ErrorPage } from "../html/404";
import { ResponseEntity, RedirectView } from "../helper";

const _usedPrefixes = new Set<string>();

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
    console.log("yooo");
    const targetClass = target as Class<any>;

    if (_usedPrefixes.has(prefix)) {
      throw new Error(
        `The prefix "${prefix}" is already in use by another constructor. Please resolve this issue.`,
      );
    }
    _usedPrefixes.add(prefix);

    const router = Router();
    const routes: readonly RouteDefinition[] = _getRoutes(target);

    const usedPaths = new Set<string>();

    _InjectableDeps.set(targetClass, deps);
    const controllerInstance = _resolve(targetClass);

    for (const { method, path, fnName } of routes) {
      const fn = controllerInstance[fnName];
      if (typeof fn !== "function") continue;

      const fp = prefix + path;
      if (usedPaths.has(fp)) {
        throw new Error(
          `Duplicate route path "${fp}" detected in controller "${target.name}"`,
        );
      }

      const methodName = methodResolve[method];
      router[methodName](fp, async (request, response, next) => {
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

        if (!response.writableEnded) {
          response
            .status(404)
            .send(Html404ErrorPage(`Cannot ${methodName.toUpperCase()} ${fp}`));
        }
      });
    }

    _ControllerRegistry.set(targetClass, router);
  };
}
