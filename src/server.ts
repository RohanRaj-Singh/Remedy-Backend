
import mongoose from "mongoose";
import app from "./app";
import { configs } from "./app/configs";
import { createSuperAdmin } from "./app/modules/user/user.service";

const RETRY_DELAY_MS = 10_000;
let isConnecting = false;

const connectDbWithRetry = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  if (!configs.db_url) {
    console.error("DB_URL is missing. Database connection skipped.");
    return;
  }

  isConnecting = true;
  try {
    await mongoose.connect(configs.db_url, { serverSelectionTimeoutMS: 8000 });
    await createSuperAdmin();
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection failed. Retrying...", error);
    setTimeout(connectDbWithRetry, RETRY_DELAY_MS);
  } finally {
    isConnecting = false;
  }
};

const startServer = () => {
  const port = Number(configs.port || 5001);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();
connectDbWithRetry();
