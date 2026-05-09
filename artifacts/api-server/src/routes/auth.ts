import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, studentsTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import {
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Usuario y contraseña son requeridos" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase().trim()))
    .limit(1);
  if (!user) {
    res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    return;
  }
  setSessionCookie(res, user.id);
  let studentId: number | null = null;
  if (user.role === "student") {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.userId, user.id))
      .limit(1);
    studentId = student?.id ?? null;
  }
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    studentId,
  });
});

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, (req, res) => {
  const u = req.sessionUser!;
  res.json({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    studentId: u.studentId,
  });
});

export default router;
