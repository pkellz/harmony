import mongoose from "mongoose";
import { logger } from "./Logger";

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  interface Global {
    mongoose: GlobalMongoose | undefined;
  }
}

const cached: GlobalMongoose = (globalThis as unknown as Global).mongoose || {
  conn: null,
  promise: null,
};

if (!(globalThis as unknown as Global).mongoose) {
  (globalThis as unknown as Global).mongoose = cached;
}

function mongoUri(): string {
  return (
    process.env.DATABASE_CONNECTION_STRING ||
    "mongodb://127.0.0.1:27017/harmony"
  );
}

async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoUri(), {
        bufferCommands: true,
        maxPoolSize: 10,
        minPoolSize: 1,
        socketTimeoutMS: 45000,
        family: 4,
      })
      .then((instance) => {
        logger.info("Connected to MongoDB");
        return instance;
      })
      .catch((error) => {
        logger.error("MongoDB connection error:", { error });
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
