import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { pool } from './db.js';
import { currentUser, errorHandler } from './http.js';
import { ai } from './routes/ai.js';
import { catalogue } from './routes/catalogue.js';
import { setupDatabase } from './seed.js';

try {
  const { seeded } = await setupDatabase(pool);
  console.log(seeded ? 'Database created and seeded.' : 'Database ready.');
} catch (err) {
  console.error(
    `Cannot reach Postgres at ${config.databaseUrl.replace(/:[^:@/]*@/, ':***@')}`,
    err,
  );
  process.exit(1);
}

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '50kb' }));
app.use(currentUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: Boolean(config.openrouter.apiKey) });
});
app.use('/api', catalogue);
app.use('/api/ai', ai);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`CarLoop API on http://localhost:${config.port}`);
  if (!config.openrouter.apiKey) console.warn('OPENROUTER_API_KEY is not set: AI endpoints return 503.');
});
