import mongoose from 'mongoose';
import { features } from '../../app.js';
import { config } from '../config.js';
import { connectDb, disconnectDb } from '../db.js';
import { DEMO_PASSWORDS, seedCore } from './coreSeed.js';

/** Resets the database, seeds the core data, then runs the seed of every enabled feature. */
async function main() {
  await connectDb(config.mongoUri);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  const ctx = await seedCore();
  console.log(`core: ${ctx.providers.length} prestataires, ${ctx.clients.length} clients, ${ctx.pros.length} pros, 1 admin`);

  for (const feature of features) {
    if (!feature.seed) continue;
    await feature.seed(ctx);
    console.log(`${feature.name}: seed OK`);
  }

  console.log('\nComptes de démo :');
  console.log(`  admin  admin@carloop.tn / ${DEMO_PASSWORDS.admin}`);
  console.log(`  client client1@carloop.tn ... client5@carloop.tn / ${DEMO_PASSWORDS.client}`);
  console.log(`  pro    pro1@carloop.tn ... pro6@carloop.tn / ${DEMO_PASSWORDS.pro} (pro6 en attente de validation)`);
  await disconnectDb();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDb();
  process.exit(1);
});
