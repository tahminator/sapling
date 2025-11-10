import { Todo } from "@/model/todo";
import { TodoManager } from "@/service/todo";
import {
  Controller,
  GET,
  HttpStatus,
  POST,
  ResponseEntity,
  ResponseStatusError,
} from "@tahminator/sapling";
import { Request } from "express";
import z from "zod";

export namespace TodoControllerResponses {
  export type CreateTodoResponse = {
    success: boolean;
  };

  export type ToggleTodoResponse = CreateTodoResponse;
}

@Controller({
  prefix: "/api/todo",
  deps: [TodoManager],
})
export class TodoController {
  private readonly createTodoRequestSchema = z.object({
    name: z.string(),
    description: z.string().nullish(),
  });
  private readonly getTodoByIdRequestSchema = z.coerce.number();

  constructor(private readonly todoManager: TodoManager) {}

  @GET()
  async getTodos(): Promise<ResponseEntity<Todo[]>> {
    const todos = await this.todoManager.getTodos();

    return ResponseEntity.ok().body(todos);
  }

  @GET("/:id")
  async getTodoById(request: Request): Promise<ResponseEntity<Todo>> {
    const id = await this.parseTodoByIdPath(request.params["id"]);

    const todo = await this.todoManager.getTodoById(id);

    if (!todo) {
      throw new ResponseStatusError(
        HttpStatus.NOT_FOUND,
        "This todo cannot be found",
      );
    }

    return ResponseEntity.ok().body(todo);
  }

  @POST()
  async createTodo(
    request: Request,
  ): Promise<ResponseEntity<TodoControllerResponses.CreateTodoResponse>> {
    const { name, description } = await this.parseCreateTodoBody(request.body);

    const created = await this.todoManager.createTodo(name, description);

    if (!created) {
      throw new ResponseStatusError(
        HttpStatus.CONFLICT,
        "Failed to create todo",
      );
    }

    return ResponseEntity.ok().body({
      success: true,
    });
  }

  @POST("/:id/toggle")
  async toggleTodo(
    request: Request,
  ): Promise<ResponseEntity<TodoControllerResponses.ToggleTodoResponse>> {
    const id = await this.parseTodoByIdPath(request.params["id"]);

    const toggled = await this.todoManager.toggleTodoById(id);

    if (!toggled) {
      throw new ResponseStatusError(
        HttpStatus.CONFLICT,
        "Failed to toggle todo",
      );
    }

    return ResponseEntity.ok().body({
      success: true,
    });
  }

  private async parseCreateTodoBody(body: unknown) {
    const { success, data, error } =
      await this.createTodoRequestSchema.safeParseAsync(body);

    if (!success) {
      const messages = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new ResponseStatusError(
        HttpStatus.BAD_REQUEST,
        `Invalid request body: ${messages}`,
      );
    }

    return data;
  }

  private async parseTodoByIdPath(path: unknown) {
    const {
      success,
      data: id,
      error,
    } = await this.getTodoByIdRequestSchema.safeParseAsync(path);

    if (!success) {
      const messages = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new ResponseStatusError(
        HttpStatus.BAD_REQUEST,
        `Invalid request body: ${messages}`,
      );
    }

    return id;
  }
}
