import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { trackActivity } from "../repositories/activityRepository.js";
import {
  deleteRoute,
  getRouteById,
  listRoutesByUser
} from "../repositories/routeRepository.js";
import { buildRoutePreview, saveRoute } from "../services/routeService.js";
import { ApiError, asyncHandler } from "../utils/http.js";

const router = Router();

const previewSchema = z.object({
  attractionIds: z.array(z.string().uuid()).min(2),
  optimize: z.boolean().default(true),
  travelMode: z.enum(["walk", "car"]).default("walk")
});

const createRouteSchema = previewSchema.extend({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  routeDate: z.string().optional(),
  isPublic: z.boolean().optional()
});

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const routes = await listRoutesByUser(authReq.user.id);
    res.json({ routes });
  })
);

router.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const body = previewSchema.parse(req.body);
    const preview = await buildRoutePreview(
      body.attractionIds,
      body.optimize,
      body.travelMode
    );
    res.json(preview);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const body = createRouteSchema.parse(req.body);
    const route = await saveRoute({
      userId: authReq.user.id,
      ...body
    });

    if (!route) {
      throw new ApiError(500, "Не удалось сохранить маршрут");
    }

    await trackActivity({
      userId: authReq.user.id,
      activityType: "route_created",
      entityId: route.id,
      metadata: { points: route.points.length }
    });

    res.status(201).json({ route });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const route = await getRouteById(String(req.params.id), authReq.user.id);
    if (!route) throw new ApiError(404, "Маршрут не найден");

    await trackActivity({
      userId: authReq.user.id,
      activityType: "route_view",
      entityId: route.id
    });

    res.json({ route });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const deleted = await deleteRoute(String(req.params.id), authReq.user.id);
    if (!deleted) throw new ApiError(404, "Маршрут не найден");
    res.status(204).send();
  })
);

export default router;
