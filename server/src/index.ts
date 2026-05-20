import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { ZodError } from "zod";
import { config } from "./config.js";
import { pool } from "./db.js";
import adminRoutes from "./routes/admin.js";
import attractionRoutes from "./routes/attractions.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import recommendationRoutes from "./routes/recommendations.js";
import routeRoutes from "./routes/routes.js";
import { ApiError } from "./utils/http.js";

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "tour-route-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attractions", attractionRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, "Маршрут API не найден"));
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Ошибка валидации данных",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Внутренняя ошибка сервера" });
};

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`API server is running on http://127.0.0.1:${config.port}`);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
