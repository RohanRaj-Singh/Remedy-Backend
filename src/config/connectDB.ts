import mongoose from "mongoose";

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 15_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45_000;

interface ConnectDBOptions {
  exitOnFailure?: boolean;
}

export async function connectDB(options: ConnectDBOptions = {}): Promise<void> {
  const { exitOnFailure = true } = options;
  const uri = process.env.DB_URL;

  if (!uri) {
    console.error("[MongoDB] DB_URL is not set in environment variables.");
    if (exitOnFailure) process.exit(1);
    throw new Error("DB_URL is not set in environment variables.");
  }

  const readyState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  if (readyState === 1 || readyState === 2) {
    return;
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

    const conn = mongoose.connection;
    conn.on("error", (err) => {
      console.error("[MongoDB] Connection error:", err);
    });
    conn.on("disconnected", () => {
      console.warn("[MongoDB] Disconnected.");
    });
    conn.on("reconnected", () => {
      console.log("[MongoDB] Reconnected.");
    });
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    if (exitOnFailure) process.exit(1);
    throw error;
  }
}
