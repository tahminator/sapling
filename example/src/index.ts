import "dotenv/config";
import express, { Express } from "express";
import { Class, Sapling } from "@tahminator/sapling";
import path from "path";
import { TodoController } from "@/controller/todo";
import { ErrorMiddleware } from "@/middleware/error";
import { HelloWorldController } from "@/controller/hello";

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
