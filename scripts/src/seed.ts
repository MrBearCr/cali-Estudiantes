import bcrypt from "bcryptjs";
import {
  db,
  pool,
  usersTable,
  studentsTable,
  evaluationsTable,
  gradesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const TEACHER = {
  username: "profesor",
  password: "profesor123",
  fullName: "Prof. Andrea Salinas",
  email: "andrea@notas.local",
};

const STUDENT_DATA = [
  { username: "lucia", fullName: "Lucía Hernández", grade: "5to A", email: "lucia@notas.local" },
  { username: "mateo", fullName: "Mateo González", grade: "5to A", email: "mateo@notas.local" },
  { username: "sofia", fullName: "Sofía Ramírez", grade: "5to A", email: "sofia@notas.local" },
  { username: "diego", fullName: "Diego Torres", grade: "5to A", email: "diego@notas.local" },
  { username: "valentina", fullName: "Valentina Pérez", grade: "5to A", email: "valentina@notas.local" },
];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(13, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function ensureUser(args: {
  username: string;
  password: string;
  fullName: string;
  role: "teacher" | "student";
  email: string | null;
}) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, args.username))
    .limit(1);
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(args.password, 10);
  const [created] = await db
    .insert(usersTable)
    .values({
      username: args.username,
      passwordHash,
      fullName: args.fullName,
      role: args.role,
      email: args.email,
    })
    .returning();
  if (!created) throw new Error("No se pudo crear usuario");
  return created;
}

async function main() {
  console.log("Seed: profesor...");
  await ensureUser({
    username: TEACHER.username,
    password: TEACHER.password,
    fullName: TEACHER.fullName,
    role: "teacher",
    email: TEACHER.email,
  });

  console.log("Seed: estudiantes...");
  const studentRows: Array<{ id: number; userId: number; fullName: string }> = [];
  for (const s of STUDENT_DATA) {
    const user = await ensureUser({
      username: s.username,
      password: "alumno123",
      fullName: s.fullName,
      role: "student",
      email: s.email,
    });
    const [existingStudent] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.userId, user.id))
      .limit(1);
    let student = existingStudent;
    if (!student) {
      const [created] = await db
        .insert(studentsTable)
        .values({ userId: user.id, grade: s.grade })
        .returning();
      if (!created) throw new Error("No se pudo crear estudiante");
      student = created;
    }
    studentRows.push({ id: student.id, userId: user.id, fullName: s.fullName });
  }

  console.log("Seed: evaluaciones...");
  const existingEvaluations = await db.select().from(evaluationsTable);
  if (existingEvaluations.length === 0) {
    const seedEvaluations = [
      {
        title: "Primer Parcial - Matemática",
        description: "Funciones lineales, ecuaciones y sistemas.",
        type: "parcial",
        examDate: daysFromNow(-21),
        maxScore: "100",
        weight: "25",
      },
      {
        title: "Quiz de Geometría",
        description: "Triángulos, cuadriláteros y áreas.",
        type: "quiz",
        examDate: daysFromNow(-7),
        maxScore: "20",
        weight: "10",
      },
      {
        title: "Tarea: Álgebra Aplicada",
        description: "Resolución de problemas en grupo.",
        type: "tarea",
        examDate: daysFromNow(-3),
        maxScore: "50",
        weight: "15",
      },
      {
        title: "Segundo Parcial - Matemática",
        description: "Trigonometría y radicales.",
        type: "parcial",
        examDate: daysFromNow(2),
        maxScore: "100",
        weight: "25",
      },
      {
        title: "Recuperativo Primer Parcial",
        description: "Para quienes no aprobaron el primer parcial.",
        type: "recuperativo",
        examDate: daysFromNow(6),
        maxScore: "100",
        weight: "25",
      },
      {
        title: "Examen Final",
        description: "Cubre toda la materia del ciclo.",
        type: "examen_final",
        examDate: daysFromNow(20),
        maxScore: "100",
        weight: "40",
      },
      {
        title: "Rezagado: Quiz de Geometría",
        description: "Sólo para estudiantes que faltaron al quiz original.",
        type: "rezagado",
        examDate: daysFromNow(11),
        maxScore: "20",
        weight: "10",
      },
    ];
    for (const ev of seedEvaluations) {
      await db.insert(evaluationsTable).values(ev);
    }
  }

  const allEvaluations = await db.select().from(evaluationsTable);
  console.log("Seed: notas...");
  const existingGrades = await db.select().from(gradesTable);
  if (existingGrades.length === 0) {
    // Para evaluaciones pasadas, generar notas para todos (con algunas faltas)
    const now = new Date();
    const scoresByUsername: Record<string, number[]> = {
      lucia: [92, 19, 47, 0, 0, 0, 0],
      mateo: [78, 16, 41, 0, 0, 0, 0],
      sofia: [85, 18, 45, 0, 0, 0, 0],
      diego: [55, 11, 30, 0, 0, 0, 0],
      valentina: [88, 17, 0, 0, 0, 0, 0],
    };
    const usernameByUserId = new Map(
      STUDENT_DATA.map((s, i) => {
        const row = studentRows[i];
        return [row?.userId ?? -1, s.username];
      }),
    );
    let evIdx = 0;
    for (const ev of allEvaluations) {
      if (ev.examDate > now) {
        evIdx++;
        continue;
      }
      for (const s of studentRows) {
        const username = usernameByUserId.get(s.userId) ?? "";
        const arr = scoresByUsername[username];
        let score: number | null = null;
        if (arr) {
          const v = arr[evIdx];
          if (typeof v === "number" && v > 0) score = v;
        }
        await db.insert(gradesTable).values({
          evaluationId: ev.id,
          studentId: s.id,
          score: score == null ? null : String(score),
          gradedAt: score == null ? null : daysFromNow(-1),
          comment: null,
        });
      }
      evIdx++;
    }
  }

  console.log("Seed completo.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
