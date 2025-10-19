import { type NextFunction, type Request, type Response } from 'express';

import type { AuthenticatedUser } from '../types/auth.types';
import type {
  CreateTodoPayload,
  ListTodosQuery,
  UpdateTodoPayload,
} from '../types/todo.types';
import {
  createTodo as createTodoService,
  deleteTodo as deleteTodoService,
  getTodo as getTodoService,
  listTodos as listTodosService,
  updateTodo as updateTodoService,
} from '../services/todo.service';
import { successResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { getValidatedData } from '../middleware/validateRequest';

type RequestWithUser = Request & { user?: AuthenticatedUser };

function requireUser(req: Request): AuthenticatedUser {
  const user = (req as RequestWithUser).user;

  if (!user) {
    throw new ApiError({
      message: 'Unauthorized',
      statusCode: 401,
    });
  }

  return user;
}

async function list(req: Request, res: Response, _next: NextFunction) {
  const user = requireUser(req);
  const { query } = getValidatedData<{ query: ListTodosQuery }>(req);
  const result = await listTodosService(user.id, query);

  res.status(200).json(
    successResponse({
      data: result.data,
      meta: {
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
      message: 'Todos retrieved successfully.',
    })
  );
}

async function get(req: Request, res: Response, _next: NextFunction) {
  const user = requireUser(req);
  const { params } = getValidatedData<{ params: { id: string } }>(req);
  const todo = await getTodoService(user.id, params.id);

  res
    .status(200)
    .json(successResponse({ data: todo, message: 'Todo retrieved successfully.' }));
}

async function create(req: Request, res: Response, _next: NextFunction) {
  const user = requireUser(req);
  const { body } = getValidatedData<{ body: CreateTodoPayload }>(req);
  const todo = await createTodoService(user.id, body);

  res
    .status(201)
    .json(successResponse({ data: todo, message: 'Todo created successfully.' }));
}

async function update(req: Request, res: Response, _next: NextFunction) {
  const user = requireUser(req);
  const { params, body } = getValidatedData<{
    params: { id: string };
    body: UpdateTodoPayload;
  }>(req);
  const todo = await updateTodoService(user.id, params.id, body);

  res
    .status(200)
    .json(successResponse({ data: todo, message: 'Todo updated successfully.' }));
}

async function remove(req: Request, res: Response, _next: NextFunction) {
  const user = requireUser(req);
  const { params } = getValidatedData<{ params: { id: string } }>(req);
  await deleteTodoService(user.id, params.id);

  res.status(200).json(successResponse({ message: 'Todo deleted successfully.' }));
}

export const todoController = {
  list,
  get,
  create,
  update,
  remove,
};

 