import { Db, DbConn } from "@/common/db";
import { Todo } from "@/model/todo";
import { Injectable } from "@tahminator/sapling";

@Injectable([DbConn])
export class TodoRepository {
  private readonly db: Db;
  constructor(db: DbConn) {
    this.db = db.get;
  }

  public async getTodos(): Promise<Todo[]> {
    const todos = await this.db<Todo[]>`
      SELECT
        *
      FROM
        "Todo"
      ORDER BY id ASC
    `;

    return todos;
  }

  public async getTodoById(id: number): Promise<Todo | null> {
    const todo = await this.db<Todo[]>`
      SELECT
        *
      FROM
        "Todo"
      WHERE
        id = ${id}
    `;

    return todo[0] ?? null;
  }

  public async createTodo(
    name: string,
    description?: string,
  ): Promise<boolean> {
    try {
      await this.db`
        INSERT INTO "Todo"
          ("name", "description")
        VALUES
          (${name}, ${description ?? null})
      `;
      return true;
    } catch (e) {
      console.error("Failed to create todo:", e);
      return false;
    }
  }

  public async updateTodoById(todo: Todo): Promise<boolean> {
    try {
      await this.db`
        UPDATE 
          "Todo"
        SET
          description = ${todo.description},
          completed = ${todo.completed}
        WHERE
          id = ${todo.id}
      `;
      return true;
    } catch (e) {
      console.error("Failed to update todo by name:", e);
      return false;
    }
  }
}
