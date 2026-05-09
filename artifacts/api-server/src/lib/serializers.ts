import type { Evaluation, Student, User } from "@workspace/db";

export interface SerializedEvaluation {
  id: number;
  title: string;
  description: string | null;
  type: string;
  examDate: string;
  maxScore: number;
  weight: number;
  createdAt: string;
  gradedCount: number;
  totalStudents: number;
  averageScore?: number | null;
}

export function serializeEvaluation(
  ev: Evaluation,
  extras: { gradedCount: number; totalStudents: number; averageScore?: number | null },
): SerializedEvaluation {
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    type: ev.type,
    examDate: ev.examDate.toISOString(),
    maxScore: Number(ev.maxScore),
    weight: Number(ev.weight),
    createdAt: ev.createdAt.toISOString(),
    gradedCount: extras.gradedCount,
    totalStudents: extras.totalStudents,
    averageScore: extras.averageScore ?? null,
  };
}

export interface SerializedStudent {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  email: string | null;
  grade: string | null;
  createdAt: string;
  averageScore: number | null;
  evaluationsTaken: number;
}

export function serializeStudent(
  student: Student,
  user: User,
  extras: { averageScore: number | null; evaluationsTaken: number },
): SerializedStudent {
  return {
    id: student.id,
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    grade: student.grade,
    createdAt: student.createdAt.toISOString(),
    averageScore: extras.averageScore,
    evaluationsTaken: extras.evaluationsTaken,
  };
}
