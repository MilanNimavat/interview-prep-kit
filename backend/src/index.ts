import app from './server.js';
import { initDatabase } from './services/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`[Apex Backend] Express server running on port ${PORT}`);
    console.log(`[Apex Backend] Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  console.error('[Apex Backend] Fatal startup error:', err);
  process.exit(1);
});
