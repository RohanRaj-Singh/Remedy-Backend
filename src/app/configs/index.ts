import "dotenv/config";

export const configs = {
  port: process.env.PORT,
  env: "development",
  db_url: process.env.DB_URL,
 
};
