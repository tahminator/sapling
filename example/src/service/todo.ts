import { Todo } from "@/model/todo";
import { TodoRepository } from "@/repository/todo";
import { Injectable } from "@tahminator/sapling";

@Injectable([TodoRepository])
export class TodoManager {
  constructor(private todoRepository: TodoRepository) {}

  async getTodos(): Promise<Todo[]> {
    const todos = await this.todoRepository.getTodos();

    return todos;
  }

  async getTodoById(id: number): Promise<Todo | null> {
    const todo = await this.todoRepository.getTodoById(id);

    return todo;
  }

  async createTodo(
    name: string,
    description?: string | null,
  ): Promise<boolean> {
    return await this.todoRepository.createTodo(name, description ?? undefined);
  }

  async toggleTodoById(id: number): Promise<boolean> {
    const todo = await this.getTodoById(id);

    if (!todo) {
      throw new Error("Todo does not exist");
    }

    return await this.todoRepository.updateTodoById({
      ...todo,
      completed: !todo.completed,
    });
  }
}
