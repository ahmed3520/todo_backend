import { Router } from 'express';

import { todoController } from '../controllers/todo.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authGuard } from '../middleware/authGuard';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTodoSchema,
  listTodosSchema,
  todoIdSchema,
  updateTodoSchema,
} from '../validators/todo.validator';

const router = Router();

router.use(authGuard);

router.get('/', validateRequest(listTodosSchema), asyncHandler(todoController.list));
router.get('/:id', validateRequest(todoIdSchema), asyncHandler(todoController.get));
router.post('/', validateRequest(createTodoSchema), asyncHandler(todoController.create));
router.put('/:id', validateRequest(updateTodoSchema), asyncHandler(todoController.update));
router.delete('/:id', validateRequest(todoIdSchema), asyncHandler(todoController.remove));

export default router;
