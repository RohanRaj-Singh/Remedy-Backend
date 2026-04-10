import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { buildMongoConnectOptions } from "../config/mongoOptions";

type CliOptions = {
  execute: boolean;
  backup: boolean;
  backupDir: string;
  include: string[];
  exclude: string[];
  confirm?: string;
};

const REQUIRED_CONFIRMATION = "CLEAR_CLIENT_DATA";
const DEFAULT_EXCLUDED_COLLECTIONS = ["questions"];

function parseCsvArg(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    execute: false,
    backup: false,
    backupDir: path.resolve(process.cwd(), "backups", "client-data"),
    include: [],
    exclude: [...DEFAULT_EXCLUDED_COLLECTIONS],
  };

  for (const arg of argv) {
    if (arg === "--execute") {
      options.execute = true;
      continue;
    }

    if (arg === "--backup") {
      options.backup = true;
      continue;
    }

    if (arg.startsWith("--backup-dir=")) {
      options.backupDir = path.resolve(
        process.cwd(),
        arg.slice("--backup-dir=".length)
      );
      continue;
    }

    if (arg.startsWith("--include=")) {
      options.include = parseCsvArg(arg.slice("--include=".length));
      continue;
    }

    if (arg.startsWith("--exclude=")) {
      options.exclude = parseCsvArg(arg.slice("--exclude=".length));
      continue;
    }

    if (arg.startsWith("--confirm=")) {
      options.confirm = arg.slice("--confirm=".length).trim();
    }
  }

  return options;
}

async function exportCollectionBackup(
  collectionName: string,
  backupDir: string
): Promise<number> {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const docs = await db.collection(collectionName).find({}).toArray();
  const filePath = path.join(backupDir, `${collectionName}.json`);

  await fs.writeFile(filePath, JSON.stringify(docs, null, 2), "utf8");

  return docs.length;
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const dbUrl = process.env.DB_URL?.trim();

  if (!dbUrl) {
    throw new Error("Missing required environment variable: DB_URL");
  }

  await mongoose.connect(dbUrl, buildMongoConnectOptions(dbUrl));

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const allCollections = await db.listCollections().toArray();
  const collectionNames = allCollections
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith("system."));

  const excluded = new Set(options.exclude);
  const requestedCollections =
    options.include.length > 0
      ? options.include
      : collectionNames.filter((name) => !excluded.has(name));

  const missingCollections = requestedCollections.filter(
    (name) => !collectionNames.includes(name)
  );

  if (missingCollections.length > 0) {
    throw new Error(
      `Requested collections do not exist: ${missingCollections.join(", ")}`
    );
  }

  if (requestedCollections.length === 0) {
    console.log("No collections matched the current include/exclude filters.");
    return;
  }

  const counts = await Promise.all(
    requestedCollections.map(async (name) => ({
      name,
      count: await db.collection(name).countDocuments(),
    }))
  );

  console.log("Target collections:");
  for (const entry of counts) {
    console.log(`- ${entry.name}: ${entry.count} document(s)`);
  }

  if (!options.execute) {
    console.log("");
    console.log("Preview only. No data was deleted.");
    console.log(
      `Run with --execute --confirm=${REQUIRED_CONFIRMATION} to delete these documents.`
    );
    return;
  }

  if (options.confirm !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Deletion blocked. Re-run with --confirm=${REQUIRED_CONFIRMATION}`
    );
  }

  if (options.backup) {
    await fs.mkdir(options.backupDir, { recursive: true });

    console.log("");
    console.log(`Writing backups to: ${options.backupDir}`);

    for (const collectionName of requestedCollections) {
      const backedUpCount = await exportCollectionBackup(
        collectionName,
        options.backupDir
      );

      console.log(`- Backed up ${collectionName}: ${backedUpCount} document(s)`);
    }
  }

  console.log("");
  console.log("Deleting documents...");

  for (const collectionName of requestedCollections) {
    const result = await db.collection(collectionName).deleteMany({});
    console.log(`- Cleared ${collectionName}: ${result.deletedCount} document(s)`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
