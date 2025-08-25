import { HttpHeaders } from "../types";
import { HttpStatus } from "../enum";

/**
 * Generic HTTP response wrapper modeled after Spring's `ResponseEntity`.
 *
 * Provides status code, headers, and an optional typed body.
 * The body is serialized through `Spring.serialize`.
 *
 * @typeParam T - the type of the response body
 */
export class ResponseEntity<T> {
  private _statusCode: number;
  private _headers: HttpHeaders = {};
  private _body: T;

  constructor(body: T, headers: HttpHeaders = {}, statusCode: number = 200) {
    this._body = body;
    this._headers = headers;
    this._statusCode = statusCode;
  }

  /**
   * Create a builder with a 200 status code.
   *
   * @example```ts
   * return ResponseEntity.ok().body({ success: true });
   * ```
   */
  static ok(): ResponseEntityBuilder {
    return new ResponseEntityBuilder(200);
  }

  /**
   * Create a builder with a custom status code.
   *
   * @example```ts
   * return ResponseEntity.status(HttpStatus.BAD_REQUEST).body({ success: false });
   * ```
   *
   * @see {@link HttpStatus}
   */
  static status(statusCode: number): ResponseEntityBuilder {
    return new ResponseEntityBuilder(statusCode);
  }

  /**
   * Return status code.
   */
  getStatusCode(): number {
    return this._statusCode;
  }

  /**
   * Return headers.
   */
  getHeaders(): HttpHeaders {
    return this._headers;
  }

  /**
   * Return the response body.
   */
  getBody(): T {
    return this._body;
  }
}

/**
 * Builder for {@link ResponseEntity}.
 *
 * Forces the status code to be set first, then headers and body,
 * ensuring type safety when constructing the response.
 */
export class ResponseEntityBuilder {
  private _statusCode: number;
  private _headers: HttpHeaders = {};

  constructor(statusCode: number) {
    this._statusCode = statusCode;
  }

  /**
   * Set all headers as an object with keys and values.
   */
  headers(headers: HttpHeaders): this {
    this._headers = headers;
    return this;
  }

  /**
   * Add/override a single key and value to the headers.
   */
  setHeader(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  /**
   * Set the response body.
   */
  body<T>(body: T): ResponseEntity<T> {
    return new ResponseEntity<T>(body, this._headers, this._statusCode);
  }
}
