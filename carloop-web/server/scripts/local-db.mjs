// Local-only PostgreSQL for development: no installer, no Docker.
// Data is kept in server/.localdb (gitignored), so it survives restarts.
//   npm run db:local        start it (keep this terminal open, Ctrl+C to stop)
//   npm run db:local:reset  delete the data (the API re-seeds on next start)
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../.localdb', import.meta.url));
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const database = 'carloop';

if (process.argv.includes('--reset')) {
  rmSync(dir, { recursive: true, force: true });
  console.log('Local database deleted.');
  process.exit(0);
}

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
});

if (!existsSync(`${dir}/PG_VERSION`)) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase(database);
} catch {
  // already exists
}

console.log(`\nPostgreSQL ready: postgres://postgres:postgres@localhost:${port}/${database}`);
console.log('Press Ctrl+C to stop.\n');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
