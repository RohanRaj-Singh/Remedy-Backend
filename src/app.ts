import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/global_error_handler";
import cookieParser from "cookie-parser";
import appRouter from "./routes";

// define app
const app = express();

const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  "https://remedygcc.com",
  "https://www.remedygcc.com",
  ...envOrigins,
]);

function isAllowedOrigin(origin: string): boolean {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  if (/^https:\/\/([a-z0-9-]+\.)*remedygcc\.com$/i.test(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return allowedOrigins.has(origin);
}

// middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server and non-browser requests
      if (!origin) return callback(null, true);

      if (isAllowedOrigin(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100mb" }));
app.use(express.raw());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    message: isDbConnected ? "Server healthy" : "Server running without database",
    dbStatus: isDbConnected ? "connected" : "disconnected",
    readyState: mongoose.connection.readyState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", (req: Request, res: Response, next) => {
  const readyState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (readyState !== 1 && readyState !== 2) {
    return res.status(503).json({
      success: false,
      message: "Database is unavailable. Please try again shortly.",
      dbStatus: readyState === 0 ? "disconnected" : "disconnecting",
      readyState,
    });
  }
  next();
});
app.use("/api", appRouter);

// stating point
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server started",
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// global error handler
app.use(globalErrorHandler);

// export app
export default app;
