import mongoose from "mongoose";
import { getEnv } from "./env";

let listenersRegistered = false;

export async function connectDB(): Promise<void> {
  const env = getEnv();

  const readyState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  if (readyState === 1 || readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(env.dbUrl, {
      family: 4,
      tls: true,
      serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
      socketTimeoutMS: env.mongoSocketTimeoutMs,
      maxPoolSize: env.mongoMaxPoolSize,
      minPoolSize: env.mongoMinPoolSize,
      retryWrites: true,
    });

    if (!listenersRegistered) {
      const conn = mongoose.connection;

      conn.on("error", (err) => {
        console.error("[DB] Connection error:", err);
      });
      conn.on("disconnected", () => {
        console.warn("[DB] Disconnected.");
      });
      conn.on("reconnected", () => {
        console.log("DB connected");
      });

      listenersRegistered = true;
    }
  } catch (error) {
    throw error;
  }
}
