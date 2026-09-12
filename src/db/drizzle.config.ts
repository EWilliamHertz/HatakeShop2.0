import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig(process.env.DATABASE_URL ? {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} : {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    host: process.env.SQL_HOST || "",
    user: process.env.SQL_USER || "",
    password: process.env.SQL_PASSWORD || "",
    database: process.env.SQL_DB_NAME || "",
    ssl: true,
  },
});