import "dotenv/config";
import app from "../src/app";
import { connectDB } from "../src/config/connectDB";

export default async function handler(req: any, res: any): Promise<void> {
  await connectDB({ exitOnFailure: false });
  app(req, res);
}
