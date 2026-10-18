import { MongoMemoryServer } from 'mongodb-memory-server';
import type { GlobalSetupContext } from 'vitest/node';

let server: MongoMemoryServer | undefined;

/** Starts one in-memory MongoDB for the whole test run; each test file uses its own database. */
export async function setup({ provide }: GlobalSetupContext) {
  server = await MongoMemoryServer.create();
  provide('mongoUri', server.getUri());
}

export async function teardown() {
  await server?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
