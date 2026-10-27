import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { startJobs } from './jobs/cron.js';
import { logger } from './utils/logger.js';
import { User } from './models/index.js';

async function main() {
  const { isMemory } = await connectDB();
  logger.info(isMemory ? 'Connected to in-memory MongoDB (dev)' : 'Connected to MongoDB');

  if (isMemory && !(await User.exists({}))) {
    const { seed } = await import('./seed/seed.js');
    await seed();
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`API on ${env.apiUrl}  |  docs: ${env.apiUrl}/api/docs`);
  });
  startJobs();

  const shutdown = async (sig) => {
    logger.info(`${sig} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  logger.error('Failed to start', e);
  process.exit(1);
});
