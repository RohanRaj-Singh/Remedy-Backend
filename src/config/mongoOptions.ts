import { ConnectOptions } from "mongoose";

function parseBooleanEnv(value?: string): boolean | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error("Environment variable DB_TLS must be a boolean value.");
}

export function resolveMongoTls(dbUrl: string): boolean {
  const explicit = parseBooleanEnv(process.env.DB_TLS);

  if (explicit !== undefined) {
    return explicit;
  }

  const normalizedUrl = dbUrl.trim().toLowerCase();
  return (
    normalizedUrl.startsWith("mongodb+srv://") ||
    normalizedUrl.includes("tls=true") ||
    normalizedUrl.includes("ssl=true")
  );
}

export function buildMongoConnectOptions(
  dbUrl: string,
  overrides: Partial<ConnectOptions> = {}
): ConnectOptions {
  return {
    family: 4,
    tls: resolveMongoTls(dbUrl),
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 5,
    minPoolSize: 1,
    retryWrites: true,
    ...overrides,
  };
}
