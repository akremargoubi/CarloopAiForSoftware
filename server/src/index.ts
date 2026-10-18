import { createApp } from './app.js';
import { config } from './core/config.js';
import { connectDb } from './core/db.js';

async function main() {
  await connectDb(config.mongoUri);
  const app = createApp();
  app.listen(config.port, () => {
    const aiMode = config.ai.apiKey ? `OpenRouter (${config.ai.model})` : config.ai.mock ? 'démo (mock)' : 'non configuré';
    console.log(`CarLoop API listening on http://localhost:${config.port} - IA : ${aiMode}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
