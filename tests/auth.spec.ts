import supertest from 'supertest';
import { UserModel, type UserLevel } from '../src/models/user.model';

describe('Auth API', () => {
  let request: ReturnType<typeof supertest>;

  type RegisterPayloadOverrides = Partial<{
    phone: string;
    password: string;
    displayName: string;
    experienceYears: number;
    address: string;
    level: UserLevel;
  }>;

  const makePhone = () => `+1${Math.floor(100000000 + Math.random() * 900000000)}`;

  const makeRegisterPayload = (overrides: RegisterPayloadOverrides = {}) => {
    const base = {
      phone: makePhone(),
      password: 'Password123!',
      displayName: 'Test User',
    };

    return { ...base, ...overrides };
  };

  const registerUser = async (overrides: RegisterPayloadOverrides = {}) => {
    const payload = makeRegisterPayload(overrides);
    const response = await request.post('/api/auth/register').send(payload).expect(201);

    return { payload, body: response.body };
  };

  beforeAll(() => {
    request = global.testRequest;
  });

  describe('POST /api/auth/register', () => {
    it('registers a user and returns tokens', async () => {
      const overrides = { displayName: 'Registration Tester' };
      const { payload, body } = await registerUser(overrides);
      const { data } = body;

      expect(body).toMatchObject({
        success: true,
        message: 'Account created successfully.',
      });
      expect(data).toMatchObject({
        id: expect.any(String),
        displayName: overrides.displayName,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(payload.phone).toBeDefined();
    });

    it('rejects duplicate phone numbers', async () => {
      const payload = makeRegisterPayload({ phone: '+1987654321', displayName: 'Original User' });

      await request.post('/api/auth/register').send(payload).expect(201);

      const duplicate = await request.post('/api/auth/register').send(payload).expect(409);

      expect(duplicate.body).toMatchObject({
        success: false,
        message: 'Phone number already registered',
      });
    });

    it('rejects invalid phone numbers', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({ phone: '123', password: 'Password123!', displayName: 'Invalid' })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'phone' })])
      );
    });

    it('rejects payloads missing required fields', async () => {
      const response = await request.post('/api/auth/register').send({}).expect(422);

      expect(response.body).toMatchObject({ success: false, message: 'Validation failed' });
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'phone' }),
          expect.objectContaining({ path: 'password' }),
          expect.objectContaining({ path: 'displayName' }),
        ])
      );
    });

    it('rejects passwords below minimum length', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({ phone: '+12345678901', password: 'short', displayName: 'Short Password' })
        .expect(422);

      expect(response.body).toMatchObject({ success: false, message: 'Validation failed' });
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'password' })])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    let credentials: ReturnType<typeof makeRegisterPayload>;

    beforeEach(async () => {
      credentials = makeRegisterPayload({ phone: '+1122334455', displayName: 'Auth Tester' });
      await request.post('/api/auth/register').send(credentials).expect(201);
    });

    it('logs in with valid credentials', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({ phone: credentials.phone, password: credentials.password })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Authentication successful.',
        data: {
          id: expect.any(String),
          displayName: credentials.displayName,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });

    it('rejects invalid credentials', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({ phone: credentials.phone, password: 'WrongPassword!' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('rejects unknown phone numbers', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({ phone: '+10987654321', password: credentials.password })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('validates payload structure', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({ phone: credentials.phone })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'password' })])
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates tokens when refresh token is valid', async () => {
      const { body } = await registerUser({ displayName: 'Refresh User' });
      const { data } = body;
      const { refreshToken } = data;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const response = await request
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tokens refreshed.',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('validates refresh token payload', async () => {
      const response = await request.post('/api/auth/refresh').send({}).expect(422);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'refreshToken' })])
      );
    });

    it('returns 401 when refresh token is invalid', async () => {
      const response = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'refreshToken invalid',
      });
    });

    it('returns 401 when user no longer exists', async () => {
      const { body } = await registerUser();
      const { data } = body;

      await UserModel.deleteOne({ _id: data.id });

      const response = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: data.refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User no longer exists',
      });
    });
  });

  describe('GET /api/auth/profile', () => {
    it('returns user profile for authenticated user', async () => {
      const overrides = {
        displayName: 'Profile User',
        experienceYears: 7,
        address: '123 Test Street',
        level: 'senior' as UserLevel,
      };
      const { payload, body } = await registerUser(overrides);
      const { data } = body;

      const response = await request
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${data.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile retrieved successfully.',
        data: {
          id: data.id,
          phone: payload.phone,
          displayName: overrides.displayName,
          experienceYears: overrides.experienceYears,
          address: overrides.address,
          level: overrides.level,
        },
      });
    });

    it('fails with 401 when no token supplied', async () => {
      const response = await request.get('/api/auth/profile').expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('fails with 401 when token is malformed', async () => {
      const response = await request
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('returns 404 when user no longer exists', async () => {
      const { body } = await registerUser();
      const { data } = body;

      await UserModel.deleteOne({ _id: data.id });

      const response = await request
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${data.accessToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User not found',
      });
    });
  });
});
