import { z } from 'zod';

import { PAGINATION } from '../config/constants';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/task.model';

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

const booleanLike = z
  .union([z.string(), z.boolean()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'Invalid boolean value',
        path: [],
      },
    ]);
  });

const dueDateCreate = z.union([z.string(), z.date()]).optional();
const dueDateUpdate = z.union([z.string(), z.date(), z.null()]).optional();

export const listTodosSchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).optional(),
      status: z
        .enum([...TASK_STATUSES, 'all'] as const)
        .optional()
        .transform((value) => {
          if (!value || value === 'all') {
            return undefined;
          }

          return value;
        }),
      priority: z.enum(TASK_PRIORITIES).optional(),
      search: z.string().trim().min(1).optional(),
      includeDeleted: booleanLike.optional(),
    })
    .transform((value) => ({
      ...value,
      includeDeleted: value.includeDeleted ?? false,
    })),
};

export const createTodoSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(100),
    desc: z.string().trim().max(1000).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: dueDateCreate,
    image: z.string().trim().max(500).optional(),
  }),
};

export const updateTodoSchema = {
  params: z.object({
    id: objectId,
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(100).optional(),
      desc: z.string().trim().max(1000).optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      status: z.enum(TASK_STATUSES).optional(),
      dueDate: dueDateUpdate,
      image: z.string().trim().max(500).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
};

export const todoIdSchema = {
  params: z.object({
    id: objectId,
  }),
};
