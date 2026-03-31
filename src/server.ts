import app from "./app";
import { connectDB } from "./config/connectDB";
import { getEnv } from "./config/env";

const DB_RETRY_DELAY_MS = 5_000;

process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled promise rejection:", reason);
});

async function maintainDatabaseConnection(): Promise<void> {
  try {
    await connectDB();
    console.log("DB connected");
  } catch (error) {
    console.error(
      `[Startup] Database connection failed. Retrying in ${DB_RETRY_DELAY_MS / 1000}s...`,
      error
    );

    setTimeout(() => {
      void maintainDatabaseConnection();
    }, DB_RETRY_DELAY_MS);
  }
}

async function bootstrap(): Promise<void> {
  const { port } = getEnv();

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server started on port ${port}`);
      resolve();
    });

    server.on("error", reject);
  });

  void maintainDatabaseConnection();
}

bootstrap().catch((error) => {
  console.error("[Startup] Failed to start server:", error);
  process.exit(1);
});
