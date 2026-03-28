import "dotenv/config";
import type { Class } from "@tahminator/sapling";
import type { Express } from "express";

import { Sapling } from "@tahminator/sapling";
import express from "express";
import path from "path";

import { HelloWorldController } from "@/controller/hello";
import { TodoController } from "@/controller/todo";
import { ErrorMiddleware } from "@/middleware/error";

export const CONSTANTS = {
  PORT: 3000,
};

export const app: Express = express();

Sapling.registerApp(app);
const controllers: Class<any>[] = [HelloWorldController, TodoController];
controllers.map(Sapling.resolve).forEach((r) => app.use(r));

Sapling.loadResponseStatusErrorMiddleware(
  app,
  ErrorMiddleware.responseStatusErrorMiddleware,
);
app.use(ErrorMiddleware.anyErrorMiddleware);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const server = app.listen(CONSTANTS.PORT, "0.0.0.0");
