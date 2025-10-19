import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';

import app from '../src/app';

declare global {
  // eslint-disable-next-line no-var
  var testRequest: ReturnType<typeof supertest>;
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000,
    },
  });
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);

  global.testRequest = supertest(app);
});

afterEach(async () => {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  const collections = await db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

export {};
