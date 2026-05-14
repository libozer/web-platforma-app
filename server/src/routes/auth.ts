import { Router } from "express";
import { z } from "zod";
import {
  createUser,
  findUserByEmail,
  findUserWithPasswordByEmail
} from "../repositories/userRepository.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { ApiError, asyncHandler } from "../utils/http.js";
import { signAuthToken } from "../middleware/auth.js";

const router = Router();

const preferencesSchema = z
  .object({
    interests: z.array(z.string()).min(1).optional(),
    budget: z.enum(["free", "low", "mid", "high"]).optional(),
    pace: z.enum(["calm", "balanced", "active"]).optional(),
    maxDuration: z.number().int().min(120).max(720).optional()
  })
  .optional();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  preferences: preferencesSchema
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await findUserByEmail(body.email);

    if (existing) {
      throw new ApiError(409, "Пользователь с таким email уже существует");
    }

    const user = await createUser({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      preferences: body.preferences
    });

    res.status(201).json({
      user,
      token: signAuthToken(user)
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await findUserWithPasswordByEmail(body.email);

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "Неверный email или пароль");
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    res.json({
      user: publicUser,
      token: signAuthToken(publicUser)
    });
  })
);

export default router;
