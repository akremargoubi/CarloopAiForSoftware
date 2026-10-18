import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

/** Opens the MongoDB connection used by the whole application. */
export async function connectDb(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

/** Closes the MongoDB connection. */
export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
