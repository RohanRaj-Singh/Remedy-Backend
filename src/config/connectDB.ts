import mongoose from "mongoose";

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 15_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45_000;

export async function connectDB(): Promise<void> {
  const uri = process.env.DB_URL;

  if (!uri) {
    console.error("[MongoDB] DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      family: 4,
      tls: true,
      serverSelectionTimeoutMS:
        Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) ||
        DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS:
        Number(process.env.MONGO_SOCKET_TIMEOUT_MS) ||
        DEFAULT_SOCKET_TIMEOUT_MS,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 2,
      retryWrites: true,
    });

    console.log("[MongoDB] Connected successfully.");
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    process.exit(1);
  }
}

