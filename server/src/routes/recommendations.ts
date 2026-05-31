import { Router } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { findAttractions } from "../repositories/attractionRepository.js";
import { findUserById } from "../repositories/userRepository.js";
import { buildRecommendations } from "../services/recommendationService.js";
import { ApiError, asyncHandler } from "../utils/http.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await findUserById(authReq.user.id);
    if (!user) throw new ApiError(404, "Профиль не найден");

    const attractions = await findAttractions();
    const variant = Number(req.query.variant ?? 0);

    res.json(
      buildRecommendations(attractions, user.preferences, {
        variant: Number.isFinite(variant) ? variant : 0
      })
    );
  })
);

export default router;
