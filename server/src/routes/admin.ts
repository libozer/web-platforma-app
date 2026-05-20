import { Router } from "express";
import { z } from "zod";
import {
  authenticate,
  requireAdmin,
  type AuthenticatedRequest
} from "../middleware/auth.js";
import { trackActivity } from "../repositories/activityRepository.js";
import {
  deleteRouteForAdmin,
  listRoutesForAdmin
} from "../repositories/routeRepository.js";
import { listUsersForAdmin } from "../repositories/userRepository.js";
import { ApiError, asyncHandler } from "../utils/http.js";

const router = Router();

const routeFiltersSchema = z.object({
  userId: z.string().uuid().optional()
});

router.use(authenticate, requireAdmin);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await listUsersForAdmin();
    res.json({ users });
  })
);

router.get(
  "/routes",
  asyncHandler(async (req, res) => {
    const filters = routeFiltersSchema.parse(req.query);
    const routes = await listRoutesForAdmin(filters.userId);
    res.json({ routes });
  })
);

router.delete(
  "/routes/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const deleted = await deleteRouteForAdmin(String(req.params.id));

    if (!deleted) {
      throw new ApiError(404, "Маршрут не найден");
    }

    await trackActivity({
      userId: authReq.user.id,
      activityType: "admin_route_deleted",
      entityId: String(req.params.id)
    });

    res.status(204).send();
  })
);

export default router;
