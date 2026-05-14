import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/tour_routes",
  jwtSecret: process.env.JWT_SECRET ?? "development-secret",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173",
  openRouteServiceApiKey: process.env.OPENROUTE_SERVICE_API_KEY ?? ""
};
