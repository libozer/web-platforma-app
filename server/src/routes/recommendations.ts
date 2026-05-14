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
    res.json(buildRecommendations(attractions, user.preferences));
  })
);

export default router;
