import supertest from 'supertest';
import { Types } from 'mongoose';

describe('Todo API', () => {
  let request: ReturnType<typeof supertest>;

  type RegisterOverrides = Partial<{
    phone: string;
    password: string;
    displayName: string;
  }>;

  type TodoOverrides = Partial<{
    title: string;
    desc: string;
    priority: string;
    status: string;
    dueDate: string | null;
    image: string;
  }>;

  const makePhone = () => `+1${Math.floor(100000000 + Math.random() * 900000000)}`;

  const makeTodoPayload = (overrides: TodoOverrides = {}) => {
    const base = {
      title: 'Test Todo',
      desc: 'Test description',
      priority: 'high',
      status: 'waiting',
      dueDate: new Date().toISOString(),
      image: 'https://example.com/image.png',
    };

    return { ...base, ...overrides };
  };

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  const registerUser = async (overrides: RegisterOverrides = {}) => {
    const payload = {
      phone: overrides.phone ?? makePhone(),
      password: overrides.password ?? 'Password123!',
      displayName: overrides.displayName ?? 'Todo Tester',
    };

    const response = await request.post('/api/auth/register').send(payload).expect(201);
    const { data } = response.body;

    return {
      payload,
      body: response.body,
      user: {
        id: data.id,
        displayName: data.displayName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    };
  };

  const createTodo = async (
    accessToken: string,
    overrides: TodoOverrides = {}
  ): Promise<{ payload: ReturnType<typeof makeTodoPayload>; data: any; body: any }> => {
    const payload = makeTodoPayload(overrides);
    const response = await request
      .post('/api/todos')
      .set(authHeader(accessToken))
      .send(payload)
      .expect(201);

    return {
      payload,
      data: response.body.data,
      body: response.body,
    };
  };

  beforeAll(() => {
    request = global.testRequest;
  });

  describe('Authentication guards', () => {
    it('rejects unauthenticated listing', async () => {
      const response = await request.get('/api/todos').expect(401);

      expect(response.body).toMatchObject({ success: false, message: 'Unauthorized' });
    });

    it('rejects unauthenticated creation', async () => {
      const response = await request.post('/api/todos').send(makeTodoPayload()).expect(401);

      expect(response.body).toMatchObject({ success: false, message: 'Unauthorized' });
    });

    it('rejects unauthenticated updates and deletes', async () => {
      const todoId = new Types.ObjectId().toString();

      const [updateResponse, deleteResponse] = await Promise.all([
        request.put(`/api/todos/${todoId}`).send({ title: 'Nope' }).expect(401),
        request.delete(`/api/todos/${todoId}`).expect(401),
      ]);

      expect(updateResponse.body).toMatchObject({ success: false, message: 'Unauthorized' });
      expect(deleteResponse.body).toMatchObject({ success: false, message: 'Unauthorized' });
    });

    it('rejects requests with invalid token', async () => {
      const response = await request
        .get('/api/todos')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({ success: false, message: 'Unauthorized' });
    });
  });

  describe('POST /api/todos', () => {
    it('creates a todo for the authenticated user', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const { payload, body } = await createTodo(accessToken, {
        priority: 'medium',
        status: 'inprogress',
      });

      expect(body).toMatchObject({
        success: true,
        message: 'Todo created successfully.',
        data: {
          id: expect.any(String),
          title: payload.title,
          desc: payload.desc,
          priority: 'medium',
          status: 'inprogress',
          dueDate: expect.any(String),
          image: payload.image,
        },
      });
    });

    it('rejects invalid due dates', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const response = await request
        .post('/api/todos')
        .set(authHeader(accessToken))
        .send(makeTodoPayload({ dueDate: 'not-a-date' }))
        .expect(400);

      expect(response.body).toMatchObject({ success: false, message: 'Invalid due date' });
    });

    it('rejects invalid priority values', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const response = await request
        .post('/api/todos')
        .set(authHeader(accessToken))
        .send(makeTodoPayload({ priority: 'urgent' }))
        .expect(422);

      expect(response.body).toMatchObject({ success: false, message: 'Validation failed' });
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'priority' })])
      );
    });
  });

  describe('GET /api/todos', () => {
    it('returns paginated todos for the user', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      await createTodo(accessToken, { title: 'Todo A' });
      await createTodo(accessToken, { title: 'Todo B' });
      await createTodo(accessToken, { title: 'Todo C' });

      const response = await request.get('/api/todos').set(authHeader(accessToken)).expect(200);

      expect(response.body).toMatchObject({ success: true, message: 'Todos retrieved successfully.' });
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        pagination: {
          total: 3,
          page: 1,
          limit: expect.any(Number),
          totalPages: 1,
        },
      });
    });

    it('applies status filter and pagination parameters', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      await createTodo(accessToken, { title: 'Waiting 1', status: 'waiting' });
      await createTodo(accessToken, { title: 'Finished 1', status: 'finished' });
      await createTodo(accessToken, { title: 'Finished 2', status: 'finished' });

      const response = await request
        .get('/api/todos')
        .set(authHeader(accessToken))
        .query({ status: 'finished', limit: 1, page: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('finished');
      expect(response.body.meta.pagination).toMatchObject({
        total: 2,
        page: 2,
        limit: 1,
        totalPages: 2,
      });
    });

    it('includes soft-deleted todos when requested', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken, { title: 'Soft Delete Me' });

      await request.delete(`/api/todos/${id}`).set(authHeader(accessToken)).expect(200);

      const response = await request
        .get('/api/todos')
        .set(authHeader(accessToken))
        .query({ includeDeleted: 'true' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({ id, title: 'Soft Delete Me' });
      expect(response.body.data[0].deletedAt).toEqual(expect.any(String));
    });
  });

  describe('GET /api/todos/:id', () => {
    it('retrieves a todo by id', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken, { title: 'Fetch Me' });

      const response = await request
        .get(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Todo retrieved successfully.',
        data: { id, title: 'Fetch Me' },
      });
    });

    it('returns 404 when todo does not exist', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const missingId = new Types.ObjectId().toString();

      const response = await request
        .get(`/api/todos/${missingId}`)
        .set(authHeader(accessToken))
        .expect(404);

      expect(response.body).toMatchObject({ success: false, message: 'Todo not found' });
    });

    it('prevents access to another user\'s todo', async () => {
      const {
        user: owner,
      } = await registerUser({ displayName: 'Owner' });
      const {
        user: intruder,
      } = await registerUser({ displayName: 'Intruder' });

      const {
        data: { id },
      } = await createTodo(owner.accessToken, { title: 'Private Todo' });

      const response = await request
        .get(`/api/todos/${id}`)
        .set(authHeader(intruder.accessToken))
        .expect(404);

      expect(response.body).toMatchObject({ success: false, message: 'Todo not found' });
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('updates existing todo fields', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken, { title: 'Initial Title', status: 'waiting' });

      const response = await request
        .put(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .send({ title: 'Updated Title', status: 'finished', dueDate: null })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Todo updated successfully.',
        data: {
          id,
          title: 'Updated Title',
          status: 'finished',
        },
      });
      expect(response.body.data).not.toHaveProperty('dueDate');
    });

    it('rejects invalid due date on update', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken);

      const response = await request
        .put(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .send({ dueDate: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({ success: false, message: 'Invalid due date' });
    });

    it('rejects empty update payloads', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken);

      const response = await request
        .put(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .send({})
        .expect(422);

      expect(response.body).toMatchObject({ success: false, message: 'Validation failed' });
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ message: 'At least one field must be provided' })])
      );
    });

    it('prevents updating another user\'s todo', async () => {
      const {
        user: owner,
      } = await registerUser({ displayName: 'Owner' });
      const {
        user: intruder,
      } = await registerUser({ displayName: 'Intruder' });

      const {
        data: { id },
      } = await createTodo(owner.accessToken, { title: 'Do not touch' });

      const response = await request
        .put(`/api/todos/${id}`)
        .set(authHeader(intruder.accessToken))
        .send({ title: 'Hacked' })
        .expect(404);

      expect(response.body).toMatchObject({ success: false, message: 'Todo not found' });
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('soft deletes a todo', async () => {
      const {
        user: { accessToken },
      } = await registerUser();

      const {
        data: { id },
      } = await createTodo(accessToken, { title: 'Delete Me' });

      const response = await request
        .delete(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .expect(200);

      expect(response.body).toMatchObject({ success: true, message: 'Todo deleted successfully.' });

      const listResponse = await request.get('/api/todos').set(authHeader(accessToken)).expect(200);
      expect(listResponse.body.data).toHaveLength(0);

      await request
        .get(`/api/todos/${id}`)
        .set(authHeader(accessToken))
        .expect(404);
    });

    it('prevents deleting another user\'s todo', async () => {
      const {
        user: owner,
      } = await registerUser({ displayName: 'Owner' });
      const {
        user: intruder,
      } = await registerUser({ displayName: 'Intruder' });

      const {
        data: { id },
      } = await createTodo(owner.accessToken, { title: 'Owner todo' });

      const response = await request
        .delete(`/api/todos/${id}`)
        .set(authHeader(intruder.accessToken))
        .expect(404);

      expect(response.body).toMatchObject({ success: false, message: 'Todo not found' });
    });
  });
});
