declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mongoose: { conn: any; promise: any } | undefined;
}

import mongoose from "mongoose";

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGO_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (globalThis as any).mongoose;

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

export async function connect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
