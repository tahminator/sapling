import { Controller } from "./controller";

/**
 * Used to define a middleware-only class.
 *
 * __NOTE:__ `@MiddlewareClass` works exactly the same as `@Controller`. As such, you
 * can still register `@Route` and `@Middleware` methods, though you very well should not
 * for the sake of semantics.
 */
export function MiddlewareClass(
  ...args: Parameters<typeof Controller>
): ClassDecorator {
  return Controller(...args);
}
