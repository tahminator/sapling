# Sapling

A lightweight library that brings some structure to Express.js

## Table of Contents

- [Why?](#why)
- [Examples](#examples)
- [Install](#install)
- [Quick Start](#quick-start)
- [Features](#features)
  - [Controllers](#controllers)
  - [HTTP Methods](#http-methods)
  - [Responses](#responses)
  - [Error Handling](#error-handling)
  - [Middleware](#middleware)
  - [Redirects](#redirects)
  - [Dependency Injection](#dependency-injection)
  - [Custom Serialization](#custom-serialization)

## Why?

Express is great, but it can get really messy really quickly. Sapling lets you define controllers and routes using decorators instead of manually wiring everything up.

I took a lot of inspiration from Spring, but I don't believe that it would be correct to try to force Express.js or Typescript to adopt OOP entirely, which leads me to my next point:

- The best reason to use Sapling is that you can also eject out of the object oriented environment and run regular functional Express.js without having to do anything extra or hacky.

## Examples

Check the `/example` folder for a basic todo app with database integration.

Sapling is also powering one of my more complex projects with 400+ users in production, which you can view at [instalock-web](https://github.com/tahminator/instalock-web).

## Install

```bash
# we <3 pnpm
pnpm install @tahminator/sapling
```

## Quick Start

```typescript
import express from "express";
import {
  Sapling,
  Controller,
  GET,
  POST,
  ResponseEntity,
  Class,
} from "@tahminator/sapling";

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

// you still have full access of app to do whatever you want!
const app = express();
Sapling.registerApp(app);

const controllers: Class<any>[] = [HelloController, UserController];
controllers.map(Sapling.resolve).forEach((r) => app.use(r));

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
- `@Middleware(path?)` - for middleware

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

Make sure to register an error handler middleware:

```typescript
Sapling.loadResponseStatusErrorMiddleware(app, (err, req, res, next) => {
  res.status(err.status).json({ error: err.message });
});
```

### Middleware

Load Express middleware plugins using `@Middleware()`:

```typescript
import { Controller, Middleware } from "@tahminator/sapling";
import cookieParser from "cookie-parser";
import { NextFunction, Request, Response } from "express";

@Controller()
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

// You can also still choose to load plugins the Express.js way
app.use(cookieParser());
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

### Custom Serialization

By default, Sapling uses `JSON.stringify` and `JSON.parse` for serialization. You can override these with custom serializers like [superjson](https://github.com/flightcontrolhq/superjson#readme) to automatically handle Dates, BigInts, and more:

```typescript
import superjson from "superjson";

Sapling.setSerializeFn(superjson.stringify);
Sapling.setDeserializeFn(superjson.parse);
```

This affects how `ResponseEntity` serializes response bodies and how request bodies are deserialized.

## License

ISC
