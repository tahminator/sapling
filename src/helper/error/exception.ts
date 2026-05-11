import type { StandardSchemaV1 } from "@standard-schema/spec";

import { ResponseStatusError } from "..";
import { HttpStatus } from "../../enum";

export type ParserErrorLocation = "reqbody" | "reqparams" | "reqquery";

/**
 * This error should be thrown when some data cannot be parsed by a given schema.
 */
export class ParserError extends ResponseStatusError {
  constructor(
    location: ParserErrorLocation,
    issues: readonly StandardSchemaV1.Issue[],
    vendor: string,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ParserError.formatMessage(location, issues, vendor),
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }

  private static formatMessage(
    location: ParserErrorLocation,
    issues: readonly StandardSchemaV1.Issue[],
    vendor?: string,
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

    const prettyLocationString = (() => {
      switch (location) {
        case "reqbody":
          return "request body";
        case "reqparams":
          return "request params";
        case "reqquery":
          return "request query";
      }
    })();

    return `${vendor} failed to parse ${prettyLocationString}: ${formatted}`;
  }
}
