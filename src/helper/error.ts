import { HttpStatus } from "../enum";
import { Sapling } from "./sapling";

/**
 * Ensure that you define a middleware that can handle this error.
 *
 * @see {@link Sapling.loadResponseStatusErrorMiddleware}
 */
export class ResponseStatusError extends Error {
  public readonly status: HttpStatus;

  constructor(status: HttpStatus, message?: string) {
    super(message ?? "Something went wrong.");
    this.status = status;

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = `HttpError(${HttpStatus[status]})`;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResponseStatusError);
    }
  }
}
