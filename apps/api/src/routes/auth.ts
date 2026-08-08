import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signAdminToken, requireAdmin, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts" },
});

router.post(
  "/login",
  loginLimiter,
  validateBody(z.object({ email: z.string().email(), password: z.string().min(6) })),
  async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signAdminToken({ id: admin.id, email: admin.email });
    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  }
);

router.post("/logout", (_req, res) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.json({ ok: true });
});

router.get("/me", requireAdmin, async (req: AuthRequest, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.adminId },
    select: { id: true, email: true, name: true },
  });
  res.json({ admin });
});

export default router;
