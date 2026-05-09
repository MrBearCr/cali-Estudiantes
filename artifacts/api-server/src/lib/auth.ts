import type { Request, Response, NextFunction } from "express";
import { db, usersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const SECRET = process.env["SESSION_SECRET"] ?? "dev-insecure-secret";
const COOKIE_NAME = "notas_sid";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function makeSessionToken(userId: number): string {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = `${userId}.${expires}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, expiresStr, sig] = parts;
  if (!userIdStr || !expiresStr || !sig) return null;
  const expected = sign(`${userIdStr}.${expiresStr}`);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId)) return null;
  return userId;
}

export function setSessionCookie(res: Response, userId: number): void {
  const token = makeSessionToken(userId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  role: "teacher" | "student";
  email: string | null;
  studentId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export async function loadSessionUser(req: Request): Promise<SessionUser | null> {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[COOKIE_NAME];
  const userId = verifySessionToken(token);
  if (userId == null) return null;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return null;
  let studentId: number | null = null;
  if (user.role === "student") {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.userId, user.id))
      .limit(1);
    studentId = student?.id ?? null;
  }
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as "teacher" | "student",
    email: user.email,
    studentId,
  };
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionUser = await loadSessionUser(req);
    if (sessionUser) req.sessionUser = sessionUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.sessionUser) {
    res.status(401).json({ message: "No autenticado" });
    return;
  }
  next();
}

export function requireTeacher(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.sessionUser) {
    res.status(401).json({ message: "No autenticado" });
    return;
  }
  if (req.sessionUser.role !== "teacher") {
    res.status(403).json({ message: "Sólo el profesor puede realizar esta acción" });
    return;
  }
  next();
}
