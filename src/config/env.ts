import "dotenv/config";
import { resolveMongoTls } from "./mongoOptions";

export interface AppEnv {
  port: number;
  nodeEnv: string;
  dbUrl: string;
  dbTls: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  corsOrigin: string;
  mongoServerSelectionTimeoutMs: number;
  mongoSocketTimeoutMs: number;
  mongoMaxPoolSize: number;
  mongoMinPoolSize: number;
}

let cachedEnv: AppEnv | null = null;

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number.`);
  }

  return parsedValue;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const port = process.env.PORT?.trim() ? Number(process.env.PORT) : 5001;
  const dbUrl = readRequiredEnv("DB_URL");

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Environment variable PORT must be a positive integer.");
  }

  cachedEnv = {
    port,
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    dbUrl,
    dbTls: resolveMongoTls(dbUrl),
    jwtSecret: readRequiredEnv("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "1d",
    frontendUrl: readRequiredEnv("FRONTEND_URL"),
    corsOrigin: process.env.CORS_ORIGIN?.trim() || "",
    mongoServerSelectionTimeoutMs: readNumberEnv(
      "MONGO_SERVER_SELECTION_TIMEOUT_MS",
      15_000
    ),
    mongoSocketTimeoutMs: readNumberEnv("MONGO_SOCKET_TIMEOUT_MS", 45_000),
    mongoMaxPoolSize: readNumberEnv("MONGO_MAX_POOL_SIZE", 20),
    mongoMinPoolSize: readNumberEnv("MONGO_MIN_POOL_SIZE", 2),
  };

  return cachedEnv;
}

export function resetEnvForTesting(): void {
  cachedEnv = null;
}
