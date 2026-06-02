# [`@tahminator/sapling`](https://www.npmjs.com/package/@tahminator/sapling)

[![BACKEND COVERAGE](https://img.shields.io/sonar/coverage/tahminator_sapling?server=https%3A%2F%2Fsonarcloud.io&style=flat&label=TEST%20COVERAGE)](https://sonarcloud.io/dashboard?id=tahminator_sapling)
[![NPM Version](https://img.shields.io/npm/v/%40tahminator%2Fsapling?label=NPM%20LATEST)](https://www.npmjs.com/package/@tahminator/sapling)

A lightweight Express.js dependency injection & route abstraction library.

## Table of Contents

<!-- toc -->

- [Why?](#why)
- [Examples](#examples)
- [Install](#install)
- [Quick Start](#quick-start)
- [Features](#features)
  * [Controllers](#controllers)
  * [HTTP Methods](#http-methods)
  * [Responses](#responses)
  * [Error Handling](#error-handling)
  * [Middleware](#middleware)
  * [Request/Response Validation](#requestresponse-validation)
  * [Redirects](#redirects)
  * [Dependency Injection](#dependency-injection)
  * [OpenAPI Support](#openapi-support)
    + [Automatic Spec Generation](#automatic-spec-generation)
    + [Adding Documentation with Decorators](#adding-documentation-with-decorators)
    + [Customizing Paths](#customizing-paths)
  * [Health Checks](#health-checks)
    + [Liveness and Readiness Probes](#liveness-and-readiness-probes)
    + [Registering Custom Readiness Checks](#registering-custom-readiness-checks)
    + [Customizing Health Paths](#customizing-health-paths)
  * [Custom Serialization](#custom-serialization)
- [Advanced Setup](#advanced-setup)
  * [Automatically import controllers](#automatically-import-controllers)
- [License](#license)

<!-- tocstop -->

<!-- if toc does not update automatically, `markdown-toc -i README.md` -->

## Why?

1. Express is a fantastic way to build server-side apps in JavaScript, but wiring can get messy very quickly. Sapling abstracts away complicated wiring of controllers & routes, allowing you to focus on business logic & write unit tests in a painless way.

2. Sapling is inspired by Spring, but without losing the developer experience, speed & simplicity of Express.js / TypeScript.
    - The best reason to use Sapling is that you can opt-in or opt-out as much as you would like; run any traditional & functional Express.js without having to hack around the library.

3. Sapling DI & routing is designed to be very light. This may be preferable to other libraries like Nest.js that provide a much heavier abstraction. Get what would be helpful to your improve development speed, ignore anything else that may get in your way.

## Examples

Check the [`/example`](./example) folder for a basic todo app with database integration.

Sapling is also powering one of my more complex projects with 660+ users in production, which you can view at [instalock-web/apps/server](https://github.com/tahminator/instalock-web/blob/main/apps/server/src/index.ts).

## Install

```bash
# we <3 pnpm
pnpm install @tahminator/sapling
```

## Quick Start

```typescript
import express from "express";
import { Sapling, Controller, GET, POST, ResponseEntity, Class, HttpStatus, MiddlewareClass, Middleware } from "@tahminator/sapling";

@MiddlewareClass()
class LoggingMiddleware {
  @Middleware()
  loggingMiddleware(
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ): void {
    console.log(request.path);
    next();
  }
}

@Controller({ prefix: "/api" })
class HelloController {
  @GET()
  getHello(): ResponseEntity<string> {
    return ResponseEntity.ok().body("Hello world");
  }
}

@Controller({ prefix: "/api/users" })
class UserController {
  @GET()
  getUsers(): ResponseEntity<string[]> {
    return ResponseEntity.ok().body(["Alice", "Bob"]);
  }

  @POST()
  createUser(): ResponseEntity<{ success: boolean }> {
    return ResponseEntity.status(HttpStatus.CREATED).body({ success: true });
  }
}

// registerApp returns the app back to you - use the returned app instance
// so Sapling can inject some post-startup hooks into the app.
// BUT, you still have full access of app to do whatever you want!
const app = Sapling.registerApp(express());

// @MiddlewareClass should be registered first before @Controller and should be registered in order
// @Injectable classes will automatically be formed into singletons by Sapling behind the scenes!
const middlewares: Class<any>[] = [LoggingMiddleware];
middlewares.map(Sapling.resolve).forEach((r) => app.use(r));

// @Controller can be registered in any order.
// @Injectable classes will automatically be formed into singletons by Sapling behind the scenes!
const controllers: Class<any>[] = [HelloController, UserController];
controllers.map(Sapling.resolve).forEach((r) => app.use(r));

// @MiddlewareClass handling custom errors should be handled after everything else.
// Sapling includes basic `DefaultResponseStatusErrorMiddleware` & `BaseErrorMiddleware`
// but you may write your own, even to replace these defaults!
const errorMiddlewares: Class<any>[] = [
  DefaultParserErrorMiddleware,
  DefaultResponseStatusErrorMiddleware,
  DefaultBaseErrorMiddleware,
];
errorMiddlewares.map(Sapling.resolve).forEach((r) => app.use(r));

app.listen(3000);
```

Hit `GET /api` for "Hello world" or `GET /api/users` for the user list.

## Features

### Controllers

Use `@Controller()` to mark a class as a controller. Routes inside get a shared prefix if you want:

```typescript
@Controller({ prefix: "/users" })
class UserController {
  @GET("/:id")
  getUser() {
    /* ... */
  }

  @POST()
  createUser() {
    /* ... */
  }
}
```

### HTTP Methods

Sapling supports the usual suspects:

- `@GET(path?)`
- `@POST(path?)`
- `@PUT(path?)`
- `@DELETE(path?)`
- `@PATCH(path?)`
- `@Middleware(path?)` (alias of `@USE(path?)`) - for middleware

Path defaults to `"/"` if you don't pass one.

### Responses

`ResponseEntity` gives you a builder pattern for responses:

```typescript
@Controller({ prefix: "/users" })
class UserController {
  @GET("/:id")
  getUser(): ResponseEntity<User> {
    const user = findUser(id);
    return ResponseEntity.ok().setHeader("X-Custom", "value").body(user);
  }
}
```

For status codes you can use `.ok()` (200) or `.status()` to define a specific status with the `HttpStatus` enum.

You can also set custom status codes:

```typescript
@Controller({ prefix: "/api" })
class CustomController {
  @GET("/teapot")
  teapot(): ResponseEntity<string> {
    return ResponseEntity.status(HttpStatus.I_AM_A_TEAPOT).body("I'm a teapot");
  }
}
```

### Error Handling

Use `ResponseStatusError` to handle bad control paths:

```typescript
@Controller({ prefix: "/users" })
class UserController {
  constructor(private readonly userService: UserService) {}

  @GET("/:id")
  async getUser(request: Request): ResponseEntity<User> {
    const user = await this.userService.findById(request.params.id);

    if (!user) {
      throw new ResponseStatusError(HttpStatus.NOT_FOUND, "User not found");
    }

    return ResponseEntity.ok().body(user);
  }
}
```

Sapling ships with default error middlewares, and you can also write your own.
Register error middlewares after your regular middlewares and controllers:

```typescript
import {
  DefaultBaseErrorMiddleware,
  DefaultResponseStatusErrorMiddleware,
} from "@tahminator/sapling";

// regular middlewares & controllers first
const middlewares: Class<any>[] = [CookieParserMiddleware];
middlewares.map(Sapling.resolve).forEach((r) => app.use(r));

const controllers: Class<any>[] = [UserController];
controllers.map(Sapling.resolve).forEach((r) => app.use(r));

// error middlewares last
const errorMiddlewares: Class<any>[] = [
  DefaultParserErrorMiddleware,
  DefaultResponseStatusErrorMiddleware,
  DefaultBaseErrorMiddleware,
];
errorMiddlewares.map(Sapling.resolve).forEach((r) => app.use(r));
```

You can also write your own error middlewares. A specific handler should call
`next(err)` when it does not handle the error, and a base handler should be last
and return a response:

```typescript
@MiddlewareClass()
class ResponseStatusErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    next: NextFunction,
  ) {
    if (err instanceof ResponseStatusError) {
      return ResponseEntity.status(err.status).body({ message: err.message });
    }

    // MUST call next(err) to continue the chain
    next(err);
  }
}

@MiddlewareClass()
class BaseErrorMiddleware {
  @Middleware()
  handle(
    err: unknown,
    _request: Request,
    _response: Response,
    _next: NextFunction,
  ) {
    console.error("[Error]", err);

    return ResponseEntity.status(500).body({
      message: "Internal Server Error",
    });

    // no next(err) since last middleware in chain, we are done propagating
  }
}
```

### Middleware

Load Express middleware plugins using `@Middleware()`:

```typescript
import { MiddlewareClass, Middleware } from "@tahminator/sapling";
import cookieParser from "cookie-parser";
import { NextFunction, Request, Response } from "express";

@MiddlewareClass() // @MiddlewareClass is an alias of @Controller, provides better semantics
class CookieParserMiddleware {
  private readonly plugin: ReturnType<typeof cookieParser>;

  constructor() {
    this.plugin = cookieParser();
  }

  @Middleware()
  register(request: Request, response: Response, next: NextFunction) {
    return this.plugin(request, response, next);
  }
}

// Register it like any controller
app.use(Sapling.resolve(CookieParserMiddleware));

// Register middlewares before controllers
app.use(Sapling.resolve(UserController));

// You can also still choose to load plugins the Express.js way
app.use(cookieParser());
```

You can also write custom middlewares as well. It is functionally the same way as Express: call `next()` explicitly to
continue down the chain:

```typescript
import { MiddlewareClass, Middleware } from "@tahminator/sapling";
import { NextFunction, Request, Response } from "express";

@MiddlewareClass()
class RequestTimerMiddleware {
  @Middleware()
  handle(request: Request, _response: Response, next: NextFunction) {
    const start = Date.now();

    request.on("finish", () => {
      const elapsedMs = Date.now() - start;
      console.log(`[Request] ${request.method} ${request.path} ${elapsedMs}ms`);
    });

    // MUST call next() to continue the chain
    next();
  }
}

// Register middlewares before controllers
app.use(Sapling.resolve(RequestTimerMiddleware));
app.use(Sapling.resolve(UserController));
```

### Request/Response Validation

Validate and transform request request & response inputs / outputs.

- `@RequestBody(schema)` - validate & parse the request body
- `@RequestParam(schema)` - validate & parse route params
- `@RequestQuery(schema)` - validate & parse the query string
- `@ResponseBody(schema)` - validate & parse the response body

These decorators accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible validation library (Zod, Valibot, ArkType, etc.).

If validation fails, a `ParserError` is thrown. You may register `DefaultParserErrorMiddleware` for default error handling or write your own:

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({ name: z.string(), age: z.number() });
const UserParamsSchema = z.object({ id: z.string() });
const ListUsersQuerySchema = z.object({ page: z.coerce.number() });
const ListUserIdsResponseSchema = z.array(z.object({ id: z.int() }));

@Controller({ prefix: "/users" })
class UserController {
  @RequestBody(CreateUserSchema)
  @POST()
  createUser(request: Request): ResponseEntity<User> {
    // request.body has been fully validated and rewritten. you can safely assert the type!
    const requestBody = request.body as unknown as z.infer<CreateUserSchema>;
  
    const user = this.database.user.create(requestBody.name, requestBody.age)

    return ResponseEntity.ok().body(user);
  }

  @RequestParam(UserParamsSchema)
  @GET("/:id")
  getUser(request: Request): ResponseEntity<z.infer<typeof UserParamsSchema>> {
    // request.params has been fully validated and rewritten. you can safely assert the type!
    const params = request.params as unknown as z.infer<typeof UserParamsSchema>;

    const user = this.database.user.findById(params.id);

    return ResponseEntity.ok().body(user);
  }

  @RequestQuery(ListUsersQuerySchema)
  @ResponseBody(ListUserIdsResponseSchema) // since we have this annotation, it will a) strip all extra fields & b) throw if we are missing any expected fields.
  @GET()
  listUserIds(request: Request): ResponseEntity<z.infer<typeof ListUserIdsResponseSchema>> {
    // request.query has been fully validated and rewritten. you can safely assert the type!
    const query = request.query as unknown as z.infer<typeof ListUsersQuerySchema>;

    const userIds = this.database.user.findAll({ page: query.page }).map(u => u.id);

    return ResponseEntity.ok().body(userIds);
  }
}
```

### Redirects

```typescript
@Controller({ prefix: "/api" })
class RedirectController {
  @GET("/old-route")
  redirect() {
    return RedirectView.redirect("/new-route");
  }
}
```

### Dependency Injection

Mark services with `@Injectable()` and inject them into controllers:

```typescript
@Injectable()
class UserService {
  getUsers() { ... }
}

@Controller({
  prefix: "/users",
  deps: [UserService]
})
class UserController {
  constructor(private readonly userService: UserService) {}

  @GET()
  getAll() {
    return ResponseEntity.ok().body(this.userService.getUsers());
  }
}
```

Injectables can also depend on other injectables:

```typescript
@Injectable()
class Database {
  query() { ... }
}

@Injectable([Database])
class UserRepository {
  constructor(private readonly db: Database) {}

  findAll() {
    return this.db.query("SELECT * FROM users");
  }
}
```

### OpenAPI Support

Sapling automatically generates OpenAPI 3.0 specifications from your controllers and serves them with Swagger UI.

#### Automatic Spec Generation

Configure your API metadata and serve the OpenAPI spec:

```typescript
import {
  Sapling,
  DefaultOpenApiMiddleware,
  DefaultSwaggerMiddleware,
} from "@tahminator/sapling";

// Configure API metadata
Sapling.Extras.swaggerAndOpenApi.setMetadata({
  title: "My API",
  version: "1.0.0",
  description: "API documentation for my application",
});

// Serve OpenAPI spec at /openapi.json and Swagger UI at /swagger.html
// modify default routes with `Sapling.Extras.swaggerAndOpenApi`
const middlewares = [
  DefaultOpenApiMiddleware,
  DefaultSwaggerMiddleware.Serve,
  DefaultSwaggerMiddleware.Setup,
];
middlewares.map(Sapling.resolve).forEach((r) => app.use(r));

// Register your controllers after the OpenAPI middlewares
const controllers = [BaseController, UserController];
controllers.map(Sapling.resolve).forEach((r) => app.use(r));
```

The OpenAPI spec is automatically generated from your `@RequestBody`, `@RequestParam`, `@RequestQuery`, and `@ResponseBody` decorators.

#### Adding Documentation with Decorators

Use `@ControllerSchema` and `@RouteSchema` to add rich documentation:

```typescript
import {
  Controller,
  ControllerSchema,
  RouteSchema,
  GET,
  POST,
  RequestBody,
  ResponseBody,
  HttpStatus,
} from "@tahminator/sapling";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().describe("User ID"),
  name: z.string().describe("User's full name"),
  email: z.string().email().describe("User's email address"),
});

const CreateUserSchema = z.object({
  name: z.string().min(1).describe("User's full name"),
  email: z.string().email().describe("User's email address"),
});

const ErrorSchema = z.object({
  message: z.string().describe("Error message"),
});

@ControllerSchema({
  title: "Users",
  description: "User management endpoints",
})
@Controller({ prefix: "/users" })
class UserController {
  @RouteSchema({
    summary: "List all users",
    description: "Returns a paginated list of all users in the system",
    responses: [
      {
        statusCode: HttpStatus.OK,
        description: "List of users",
        schema: z.array(UserSchema),
      },
    ],
  })
  @ResponseBody(z.array(UserSchema))
  @GET()
  listUsers(): ResponseEntity<z.infer<typeof UserSchema>[]> {
    return ResponseEntity.ok().body([...]);
  }

  @RouteSchema({
    summary: "Create a new user",
    description: "Creates a new user with the provided information",
    responses: [
      {
        statusCode: HttpStatus.CREATED,
        description: "User created successfully",
        schema: UserSchema,
      },
      {
        statusCode: HttpStatus.BAD_REQUEST,
        description: "Invalid request data",
        schema: ErrorSchema,
      },
    ],
  })
  @RequestBody(CreateUserSchema)
  @ResponseBody(UserSchema)
  @POST()
  createUser(request: Request): ResponseEntity<z.infer<typeof UserSchema>> {
    const body = request.body as z.infer<typeof CreateUserSchema>;
    return ResponseEntity.status(HttpStatus.CREATED).body({...});
  }
}
```

#### Customizing Paths

By default, OpenAPI spec is served at `/openapi.json` and Swagger UI at `/swagger.html`. Customize these paths:

```typescript
Sapling.Extras.swaggerAndOpenApi.setOpenApiPath("/api-spec.json");
Sapling.Extras.swaggerAndOpenApi.setSwaggerPath("/api-docs");
```

### Health Checks

#### Liveness and Readiness Probes

Register `DefaultHealthMiddleware` to expose two health endpoints:

- `GET /live` — **liveness probe**: returns `{ up: true }` once the server has started listening. Use this to tell your orchestrator the process is alive.
- `GET /ready` — **readiness probe**: returns `{ up: true }` once the server is live *and* all registered readiness checks pass. Use this to gate traffic until your app is fully initialized.

```typescript
import { Sapling, DefaultHealthMiddleware } from "@tahminator/sapling";

const app = Sapling.registerApp(express());

app.use(Sapling.resolve(DefaultHealthMiddleware));

app.listen(3000); // _markLive() is called automatically once the server is listening
```

> [!IMPORTANT]
> `Sapling.registerApp` returns `express.App` - please use that as your `app` object inside of your server. There is a small post-startup hook applied via a proxy, in which the liveness probe is enabled from such.

#### Registering Custom Readiness Checks

Inject `HealthRegistrar` into any `@Injectable` or controller to add readiness checks. A check is any function returning `boolean | Promise<boolean>`. If any check returns `false` (or throws), `/ready` reports `{ up: false }`.

```typescript
import { Injectable, HealthRegistrar } from "@tahminator/sapling";

@Injectable([HealthRegistrar])
class DatabaseService {
  constructor(
    private readonly db: Database,
    private readonly healthRegistrar: HealthRegistrar,
  ) {
    healthRegistrar.add(async () => {
      return this.db.isConnected();
    });
  }
}
```

#### Customizing Health Paths

The default paths are `/live` and `/ready`. Override them before registering `DefaultHealthMiddleware`:

```typescript
Sapling.Extras.health.setLivePath("/healthz/live");
Sapling.Extras.health.setReadyPath("/healthz/ready");
```

### Custom Serialization

By default, Sapling uses `JSON.stringify` and `JSON.parse` for serialization. You can override these with custom serializers like [superjson](https://github.com/flightcontrolhq/superjson#readme) to automatically handle Dates, BigInts, and more:

```typescript
import superjson from "superjson";

Sapling.setSerializeFn(superjson.stringify);
Sapling.setDeserializeFn(superjson.parse);
```

This affects how `ResponseEntity` serializes response bodies and how request bodies are deserialized.

## Advanced Setup

### Automatically import controllers

> [!NOTE]
> You need ESLint (or some alternative build step that has glob-import support)

Controllers can be automatically imported via a glob-import if you ensure that all controller files are:

- `export default` (so one controller per file)
- all controller files are marked as `*.controller.ts`

. The steps below indicate a working example inside of my webapp, [instalock-web/apps/server](https://github.com/tahminator/instalock-web/blob/main/apps/server/src/index.ts).

1. Create a bootstrap file that will glob-import all controller files and export them

[example file](https://github.com/tahminator/instalock-web/blob/main/apps/server/src/bootstrap.ts)

```ts
// file will automatically import any controller files
// it will pull out default exports, so ensure
// 1. one class per file
// 2. `export default XyzController`

// q: wont this break ordering of controller imports?
// a: yes but that's ok - controllers are the last in the dependency graph.
// they import, but are never imported themselves.

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { modules } from "./controller/**/{controller,*.controller}.ts#default";

export const getControllers = (): Class<unknown>[] => {
  return modules.map((mod) => mod.default as Class<unknown>);
};
```

1. Point `Sapling.resolve` to `getControllers`

[example file](https://github.com/tahminator/instalock-web/blob/main/apps/server/src/index.ts#L45-L47)

```ts
const controllers = getControllers();
console.log(`${controllers.length} controllers resolved`);
controllers.map(Sapling.resolve).forEach((r) => app.use(r));
```

1. Configure your ESBuild process to use the `esbuild-plugin-import-pattern` plugin

[example file](https://github.com/tahminator/instalock-web/blob/main/apps/server/build.ts)

```ts
import * as esbuild from "esbuild";
// @ts-expect-error no types
import { importPatternPlugin } from "esbuild-plugin-import-pattern";

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/index.ts"],
    bundle: true,
    sourcemap: true,
    platform: "node",
    outfile: "src/index.js",
    logLevel: "info",
    format: "cjs",
    plugins: [importPatternPlugin()],
  });

  await ctx.rebuild();
  await ctx.dispose();
}

void main();
```

## License

MIT
