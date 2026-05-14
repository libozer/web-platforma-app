import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  findUserById,
  updateUserProfile
} from "../repositories/userRepository.js";
import { ApiError, asyncHandler } from "../utils/http.js";

const router = Router();

const profileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  preferences: z
    .object({
      interests: z.array(z.string()).min(1).optional(),
      budget: z.enum(["free", "low", "mid", "high"]).optional(),
      pace: z.enum(["calm", "balanced", "active"]).optional(),
      maxDuration: z.number().int().min(120).max(720).optional()
    })
    .optional()
});

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = await findUserById(authReq.user.id);
    if (!user) throw new ApiError(404, "Профиль не найден");
    res.json({ user });
  })
);

router.patch(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const body = profileSchema.parse(req.body);
    const user = await updateUserProfile(authReq.user.id, body);
    if (!user) throw new ApiError(404, "Профиль не найден");
    res.json({ user });
  })
);

export default router;
