import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/global_error_handler";
import notFound from "./app/middlewares/not_found_api";
import cookieParser from "cookie-parser";
import appRouter from "./routes";

// define app
const app = express();

const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://remedygcc.com",
  ...envOrigins,
]);

// middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server and non-browser requests
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.has(origin) || /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);

      if (isAllowed) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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
    dbStatus: isDbConnected ? "connected" : "disconnected",
    readyState: mongoose.connection.readyState,
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
  res.send("Remedy Server Is Runnig...");
});

// global error handler
app.use(globalErrorHandler);
app.use(notFound);

// export app
export default app;
