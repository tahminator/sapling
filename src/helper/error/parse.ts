import type { StandardSchemaV1 } from "@standard-schema/spec";

import { ResponseStatusError } from "..";
import { HttpStatus } from "../../enum";

export type ParserErrorLocation =
  | "reqbody"
  | "reqparams"
  | "reqquery"
  | "resbody";

/**
 * This error should be thrown when some data cannot be parsed by a given Standard Schema compatible schema.
 */
export class ParserError extends ResponseStatusError {
  constructor(
    location: ParserErrorLocation,
    issues: readonly StandardSchemaV1.Issue[],
    vendor: string,
    functionName: string,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ParserError.formatMessage(location, issues, vendor, functionName),
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }

  private static formatMessage(
    location: ParserErrorLocation,
    issues: readonly StandardSchemaV1.Issue[],
    vendor: string,
    functionName: string,
  ): string {
    const formatted = issues
      .map((i) => {
        const path =
          Array.isArray(i.path) ?
            i.path
              .map((seg) =>
                typeof seg === "object" && seg ? String(seg.key) : String(seg),
              )
              .join(".")
          : "";
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join("; ");

    return `Failed to parse ${this.getPrettyLocationString(location)} with ${vendor} on ${functionName}: ${formatted}`;
  }

  static getPrettyLocationString(location: ParserErrorLocation) {
    switch (location) {
      case "reqbody":
        return "request body";
      case "reqparams":
        return "request params";
      case "reqquery":
        return "request query";
      case "resbody":
        return "response body";
    }
  }
}
