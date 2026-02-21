import "dotenv/config";
import app from "../src/app";
import { connectDB } from "../src/config/connectDB";

export default async function handler(req: any, res: any): Promise<void> {
  try {
    await connectDB({ exitOnFailure: false });
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: error?.message || "Unknown database error",
    });
  }

  return app(req, res);
}
