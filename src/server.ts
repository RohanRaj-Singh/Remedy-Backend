import "dotenv/config";
import http from "http";
import app from "./app";
import { connectDB } from "./config/connectDB";

const PORT = Number(process.env.PORT) || 5001;

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = http.createServer(app);

  const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 10 * 60 * 1000;
  server.setTimeout(requestTimeoutMs);
  server.keepAliveTimeout = requestTimeoutMs;
  server.headersTimeout = requestTimeoutMs + 5000;

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void bootstrap();

