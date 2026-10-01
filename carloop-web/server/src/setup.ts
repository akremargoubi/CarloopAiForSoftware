import { pool } from './db.js';
import { setupDatabase } from './seed.js';

const { seeded } = await setupDatabase(pool);
console.log(seeded ? 'Database created and seeded.' : 'Database already initialised.');
await pool.end();
