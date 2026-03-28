// WIP

// @ts-expect-error glob import
import * as controllers from "**/*.controller.ts";

export const getControllers = () => {
  return controllers;
};
