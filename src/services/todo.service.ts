import { Error as MongooseError, Types } from 'mongoose';

import { PAGINATION } from '../config/constants';
import { TaskModel, type TaskDocument, type TaskResponse } from '../models/task.model';
import type {
  CreateTodoPayload,
  ListTodosQuery,
  PaginatedResult,
  UpdateTodoPayload,
} from '../types/todo.types';
import { ApiError } from '../utils/ApiError';

function handleMongooseValidationError(error: unknown): never {
  if (error instanceof MongooseError.ValidationError) {
    const details = Object.values(error.errors).map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));

    throw new ApiError({
      message: 'Todo validation failed',
      statusCode: 400,
      details,
    });
  }

  throw error;
}

function toObjectId(id: string, notFoundMessage: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError({
      message: notFoundMessage,
      statusCode: 404,
    });
  }

  return new Types.ObjectId(id);
}

function toTaskResponse(task: TaskDocument): TaskResponse {
  return task.toJSON() as TaskResponse;
}

interface ParsedDueDate {
  shouldApply: boolean;
  value?: Date;
}

function parseDueDate(
  dueDate: CreateTodoPayload['dueDate'] | UpdateTodoPayload['dueDate']
): ParsedDueDate {
  if (dueDate === undefined) {
    return { shouldApply: false };
  }

  if (dueDate === null) {
    return { shouldApply: true, value: undefined };
  }

  if (dueDate instanceof Date) {
    return { shouldApply: true, value: dueDate };
  }

  const parsed = new Date(dueDate);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError({
      message: 'Invalid due date',
      statusCode: 400,
    });
  }

  return { shouldApply: true, value: parsed };
}

export async function listTodos(
  userId: string,
  query: ListTodosQuery
): Promise<PaginatedResult<TaskResponse>> {
  const objectUserId = toObjectId(userId, 'User not found');

  const rawPage = query.page ?? PAGINATION.defaultPage;
  const rawLimit = query.limit ?? PAGINATION.defaultLimit;

  const page = Math.max(rawPage, PAGINATION.defaultPage);
  const limit = Math.min(Math.max(rawLimit, 1), PAGINATION.maxLimit);
  const skip = (page - 1) * limit;

  const filters: Record<string, unknown> = {
    userId: objectUserId,
  };

  if (!query.includeDeleted) {
    filters.deletedAt = null;
  }

  if (query.status) {
    filters.status = query.status;
  }

  if (query.priority) {
    filters.priority = query.priority;
  }

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filters.$or = [{ title: regex }, { desc: regex }];
  }

  const [records, total] = await Promise.all([
    TaskModel.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    TaskModel.countDocuments(filters),
  ]);

  const data = records.map(toTaskResponse);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getTodo(userId: string, todoId: string): Promise<TaskResponse> {
  const objectUserId = toObjectId(userId, 'Todo not found');
  const objectTodoId = toObjectId(todoId, 'Todo not found');

  const todo = await TaskModel.findOne({
    _id: objectTodoId,
    userId: objectUserId,
    deletedAt: null,
  }).exec();

  if (!todo) {
    throw new ApiError({
      message: 'Todo not found',
      statusCode: 404,
    });
  }

  return toTaskResponse(todo);
}

export async function createTodo(
  userId: string,
  payload: CreateTodoPayload
): Promise<TaskResponse> {
  const objectUserId = toObjectId(userId, 'User not found');

  const { dueDate: rawDueDate, ...rest } = payload;
  const dueDate = parseDueDate(rawDueDate);

  const todo = new TaskModel({
    ...rest,
    userId: objectUserId,
    ...(dueDate.shouldApply && dueDate.value !== undefined ? { dueDate: dueDate.value } : {}),
  });

  try {
    await todo.save();
  } catch (error) {
    handleMongooseValidationError(error);
  }

  return toTaskResponse(todo);
}

export async function updateTodo(
  userId: string,
  todoId: string,
  payload: UpdateTodoPayload
): Promise<TaskResponse> {
  const objectUserId = toObjectId(userId, 'Todo not found');
  const objectTodoId = toObjectId(todoId, 'Todo not found');

  const todo = await TaskModel.findOne({
    _id: objectTodoId,
    userId: objectUserId,
    deletedAt: null,
  }).exec();

  if (!todo) {
    throw new ApiError({
      message: 'Todo not found',
      statusCode: 404,
    });
  }

  const { dueDate: rawDueDate, deletedAt: _ignoredDeletedAt, ...rest } = payload;
  const dueDate = parseDueDate(rawDueDate);

  if (dueDate.shouldApply) {
    todo.dueDate = dueDate.value;
  }

  if (rest.title !== undefined) {
    todo.title = rest.title;
  }

  if (rest.desc !== undefined) {
    todo.desc = rest.desc;
  }

  if (rest.priority !== undefined) {
    todo.priority = rest.priority;
  }

  if (rest.status !== undefined) {
    todo.status = rest.status;
  }

  if (rest.image !== undefined) {
    todo.image = rest.image ?? undefined;
  }

  try {
    await todo.save();
  } catch (error) {
    handleMongooseValidationError(error);
  }

  return toTaskResponse(todo);
}

export async function deleteTodo(userId: string, todoId: string): Promise<void> {
  const objectUserId = toObjectId(userId, 'Todo not found');
  const objectTodoId = toObjectId(todoId, 'Todo not found');

  const todo = await TaskModel.findOne({
    _id: objectTodoId,
    userId: objectUserId,
    deletedAt: null,
  }).exec();

  if (!todo) {
    throw new ApiError({
      message: 'Todo not found',
      statusCode: 404,
    });
  }

  todo.deletedAt = new Date();

  await todo.save();
}
