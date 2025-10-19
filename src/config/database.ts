import mongoose from 'mongoose';

import { appConfig } from './environment';

const CONNECTION_TIMEOUT_MS = 10_000;

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return mongoose;
  }

  return mongoose.connect(appConfig.mongoUri, {
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
    return;
  }

  await mongoose.disconnect();
}

mongoose.connection.on('connected', () => {
  if (appConfig.isDevelopment) {
    console.info('MongoDB connected');
  }
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  if (appConfig.isDevelopment) {
    console.info('MongoDB disconnected');
  }
});
