import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { AuthUser, PublicUser } from "../types.js";
import { ApiError } from "../utils/http.js";

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export function signAuthToken(user: Pick<PublicUser, "id" | "email" | "role">) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    next(new ApiError(401, "Требуется авторизация"));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
      role: string;
    };

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    next(new ApiError(401, "Сессия истекла или токен недействителен"));
  }
}
