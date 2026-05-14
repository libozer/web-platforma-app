import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  findAttractionById,
  findAttractions
} from "../repositories/attractionRepository.js";
import { trackActivity } from "../repositories/activityRepository.js";
import { ApiError, asyncHandler } from "../utils/http.js";

const router = Router();

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  budgetLevel: z.enum(["free", "low", "mid", "high"]).optional()
});

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const filters = querySchema.parse(req.query);
    const attractions = await findAttractions(filters);

    if (filters.search) {
      await trackActivity({
        userId: authReq.user.id,
        activityType: "search",
        metadata: { query: filters.search }
      });
    }

    res.json({ attractions });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const attraction = await findAttractionById(String(req.params.id));
    if (!attraction) throw new ApiError(404, "Туристический объект не найден");

    await trackActivity({
      userId: authReq.user.id,
      activityType: "attraction_view",
      entityId: attraction.id
    });

    res.json({ attraction });
  })
);

export default router;
