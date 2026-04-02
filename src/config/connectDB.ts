import mongoose from "mongoose";

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 15_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45_000;

export async function connectDB(): Promise<void> {
  const uri = process.env.DB_URL;

  if (!uri) {
    console.error("[MongoDB] DB_URL is not set in environment variables.");
    process.exit(1);
  }

  const isAtlas = uri.includes("mongodb+srv") || uri.includes("mongodb.net");

  try {
    await mongoose.connect(uri, {
      family: 4,
      tls: isAtlas,
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
    process.exit(1);
  }
}
