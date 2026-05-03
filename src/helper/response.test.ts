import { ResponseEntity, ResponseEntityBuilder } from "./response";

describe("ResponseEntity", () => {
  it("initialize with constructor values", () => {
    const body = { data: "test" };
    const headers = { "Content-Type": "application/json" };
    const status = 201;
    const response = new ResponseEntity(body, headers, status);

    expect(response.getBody()).toBe(body);
    expect(response.getHeaders()).toEqual(headers);
    expect(response.getStatusCode()).toBe(status);
  });

  it("default values in constructor", () => {
    const body = "hello";
    const response = new ResponseEntity(body);

    expect(response.getStatusCode()).toBe(200);
    expect(response.getHeaders()).toEqual({});
  });

  it("200 status builder using ok()", () => {
    const response = ResponseEntity.ok().body("ok");
    expect(response.getStatusCode()).toBe(200);
    expect(response.getBody()).toBe("ok");
  });

  it("custom status builder using status()", () => {
    const response = ResponseEntity.status(404).body("not found");
    expect(response.getStatusCode()).toBe(404);
  });
});

describe("ResponseEntityBuilder", () => {
  it("set multiple headers", () => {
    const headers = { "X-Test": "1", "X-Custom": "2" };
    const response = new ResponseEntityBuilder(200).headers(headers).body(null);

    expect(response.getHeaders()).toEqual(headers);
  });

  it("set individual headers via setHeader", () => {
    const response = new ResponseEntityBuilder(200)
      .setHeader("Content-Type", "text/plain")
      .setHeader("X-Version", "1.0")
      .body({});

    expect(response.getHeaders()).toEqual({
      "Content-Type": "text/plain",
      "X-Version": "1.0",
    });
  });

  it("overwrite headers when using setHeader with same key", () => {
    const response = new ResponseEntityBuilder(200)
      .setHeader("Cache-Control", "no-store")
      .setHeader("Cache-Control", "public")
      .body({});

    expect(response.getHeaders()["Cache-Control"]).toBe("public");
  });

  it("happy path, maintain chain & return correctly", () => {
    const response = ResponseEntity.status(202)
      .setHeader("Location", "/api/v1/resource")
      .body({ id: 123 });

    expect(response).toBeInstanceOf(ResponseEntity);
    expect(response.getStatusCode()).toBe(202);
    expect(response.getBody()).toEqual({ id: 123 });
  });
});
