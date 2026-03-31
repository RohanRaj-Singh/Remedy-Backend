import "dotenv/config";

export const configs = {
  port: process.env.PORT,
  env: process.env.NODE_ENV || "development",
  db_url: process.env.DB_URL,
 
};
