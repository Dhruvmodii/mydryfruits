import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config";

export type AuthRequest = Request & { adminId?: string; adminEmail?: string };

export function signAdminToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.admin_token;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string; email: string };
    req.adminId = decoded.id;
    req.adminEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
