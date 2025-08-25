// @ts-expect-error
import * as controllers from "**/*.controller.ts";

export const getControllers = () => {
  return controllers;
};
