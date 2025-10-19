import { TaskPriority, TaskStatus } from '../models/task.model';

export interface CreateTodoPayload {
  title: string;
  desc?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date | string;
  image?: string;
}

export interface UpdateTodoPayload {
  title?: string;
  desc?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date | string | null;
  image?: string | null;
  deletedAt?: Date | string | null;
}

export interface ListTodosQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  includeDeleted?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
