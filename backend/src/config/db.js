import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer;

/** Connects to MongoDB. With MONGODB_URI=memory, starts an in-memory replica set (transactions need one). */
export async function connectDB(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  let isMemory = false;
  if (uri === 'memory') {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    uri = memoryServer.getUri('propertyhub');
    isMemory = true;
  }
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  return { isMemory };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
