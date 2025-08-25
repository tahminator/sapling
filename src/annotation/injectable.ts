import { IterableWeakMap } from "../../lib/weakmap";
import { Class } from "../types";

export const _InjectableRegistry = new WeakMap<Class<any>, any>();
export const _InjectableDeps = new IterableWeakMap<
  Class<any>,
  Array<Class<any>>
>();

/**
 * Mark the class as an injectable to be handled by Sapling. The class can now be
 * be injected into other classes, as well as allow the class to inject other `@Injectable` classes.
 *
 * @argument deps - An optional array to define any dependencies that this class may require.
 */
export function Injectable(deps: Array<Class<any>> = []): ClassDecorator {
  return function (target: any) {
    _InjectableRegistry.set(target, null);
    _InjectableDeps.set(target, deps);
  };
}

/**
 * Resolves and instantiates a class along with all of it's transitive dependencies.
 *
 * Uses topological sort (Kahn's algorithm) to ensure that the dependency graph is created
 * in a correct order.
 *
 * When `resolve` is first called (usually during controller registration),
 * it will compute the dependency graph of all `@Injectable` classes and instantiates
 * them in the correct order.
 *
 * Subsequent calls to dependencies that have already been resolved are cached, so they will
 * re-use the created singletons instead of re-instantiation.
 */
export function _resolve<T>(ctor: Class<T>): T {
  const inDegree = new Map<Class<any>, number>();
  const graph = new Map<Class<any>, Array<Class<any>>>();

  _InjectableDeps.forEach((deps, node) => {
    inDegree.set(node, inDegree.get(node) || 0);
    deps.forEach((dep) => {
      inDegree.set(dep, inDegree.get(dep) || 0);
      inDegree.set(node, inDegree.get(node)! + 1);
      if (!graph.has(dep)) graph.set(dep, []);
      graph.get(dep)!.push(node);
    });
  });

  const queue: Array<Class<any>> = [];
  inDegree.forEach((deg, node) => {
    if (deg === 0) queue.push(node);
  });

  while (queue.length) {
    const current = queue.shift()!;
    if (!_InjectableRegistry.get(current)) {
      const deps = _InjectableDeps.get(current) || [];
      const params = deps.map((dep) => _InjectableRegistry.get(dep));
      const instance = new current(...params);
      _InjectableRegistry.set(current, instance);
    }
    (graph.get(current) || []).forEach((neighbor) => {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    });
  }

  if (!_InjectableRegistry.get(ctor)) {
    throw new Error(
      "Circular dependency detected or injectable not registered",
    );
  }

  return _InjectableRegistry.get(ctor);
}
