import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth, signOut as firebaseSignOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import type {
  Student, CreateStudentBody, UpdateStudentBody,
  Evaluation, CreateEvaluationBody, UpdateEvaluationBody,
  EvaluationWithGrades, Grade, UpsertGradeBody, StudentGrade, GradeWithEvaluation, Notification,
  StudentDashboard, AdminDashboard, AdminDashboardEvaluationTypeBreakdownItem,
  AdminDashboardTopStudentsItem, LoginBody
} from "./generated/api.schemas";

// Health Check
export function useHealthCheck() {
  return useQuery({ queryKey: ["health"], queryFn: async () => ({ status: "ok" }) });
}

// Students
export const getListStudentsQueryKey = () => ["students"];
export function useListStudents() {
  return useQuery({
    queryKey: getListStudentsQueryKey(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, "students"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Student));
    }
  });
}

export function useGetStudent(id: string | number) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const d = await getDoc(doc(db, "students", String(id)));
      return { id: d.id, ...d.data() } as unknown as Student;
    },
    enabled: !!id
  });
}

export function useGetStudentGrades(id: string | number) {
  return useQuery({
    queryKey: ["students", id, "grades"],
    queryFn: async (): Promise<GradeWithEvaluation[]> => {
      return [];
    },
    enabled: !!id
  });
}

export const useCreateStudent = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: CreateStudentBody }) => {
      const docRef = await addDoc(collection(db, "students"), { ...data, evaluationsTaken: 0, createdAt: new Date().toISOString() });
      return { id: docRef.id, ...data };
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useUpdateStudent = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, data }: { studentId: string | number, data: UpdateStudentBody }) => {
      await updateDoc(doc(db, "students", String(studentId)), data as any);
      return { studentId, ...data };
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useDeleteStudent = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string | number }) => {
      await deleteDoc(doc(db, "students", String(studentId)));
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

// Evaluations
export const getListEvaluationsQueryKey = () => ["evaluations"];
export const getGetEvaluationQueryKey = (id: string | number) => ["evaluations", id];

export function useListEvaluations() {
  return useQuery({
    queryKey: getListEvaluationsQueryKey(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, "evaluations"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Evaluation));
    }
  });
}

export function useGetEvaluation(id: string | number) {
  return useQuery({
    queryKey: getGetEvaluationQueryKey(id),
    queryFn: async () => {
      const d = await getDoc(doc(db, "evaluations", String(id)));
      if (!d.exists()) throw new Error("Not found");
      const evalData = { id: d.id, ...d.data() } as unknown as Evaluation;
      
      const q = query(collection(db, "grades"), where("evaluationId", "==", String(id)));
      const gradesSnap = await getDocs(q);
      const grades = gradesSnap.docs.map(g => g.data() as unknown as StudentGrade);
      
      return { evaluation: evalData, grades } as EvaluationWithGrades;
    },
    enabled: !!id
  });
}

export const useCreateEvaluation = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: CreateEvaluationBody }) => {
      const docRef = await addDoc(collection(db, "evaluations"), { ...data, gradedCount: 0, totalStudents: 0, createdAt: new Date().toISOString() });
      return { id: docRef.id, ...data };
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useUpdateEvaluation = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ evaluationId, data }: { evaluationId: string | number, data: UpdateEvaluationBody }) => {
      await updateDoc(doc(db, "evaluations", String(evaluationId)), data as any);
      return { evaluationId, ...data };
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useDeleteEvaluation = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ evaluationId }: { evaluationId: string | number }) => {
      await deleteDoc(doc(db, "evaluations", String(evaluationId)));
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useUpsertGrade = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ evaluationId, data }: { evaluationId: string | number, data: UpsertGradeBody }) => {
      const q = query(collection(db, "grades"), where("evaluationId", "==", String(evaluationId)), where("studentId", "==", String(data.studentId)));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "grades"), { ...data, evaluationId: String(evaluationId), gradedAt: new Date().toISOString() });
      } else {
        await updateDoc(snap.docs[0].ref, { ...data, gradedAt: new Date().toISOString() } as any);
      }
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const getGetAdminDashboardQueryKey = () => ["adminDashboard"];
export function useGetAdminDashboard() {
  return useQuery({
    queryKey: getGetAdminDashboardQueryKey(),
    queryFn: async (): Promise<AdminDashboard> => {
      const evals = await getDocs(collection(db, "evaluations"));
      const students = await getDocs(collection(db, "students"));
      return {
        totalStudents: students.size,
        totalEvaluations: evals.size,
        upcomingEvaluations: 0,
        pendingGradings: 0,
        classAverage: 0,
        evaluationTypeBreakdown: [],
        topStudents: [],
        upcoming: []
      };
    }
  });
}

export const getGetMyDashboardQueryKey = () => ["myDashboard"];
export const getGetStudentDashboardQueryKey = (id: string | number) => ["studentDashboard", id];

export function useGetStudentDashboard(id: string | number) {
  return useQuery({
    queryKey: getGetStudentDashboardQueryKey(id),
    queryFn: async (): Promise<StudentDashboard> => {
      return {
        studentId: Number(id),
        fullName: "Alumno",
        evaluationsTaken: 0,
        evaluationsPending: 0,
        upcomingCount: 0,
        recentGrades: [],
        notifications: []
      };
    },
    enabled: !!id
  });
}

export function useGetMyDashboard() {
  return useQuery({
    queryKey: getGetMyDashboardQueryKey(),
    queryFn: async (): Promise<StudentDashboard> => {
      return {
        studentId: 1,
        fullName: "Alumno",
        evaluationsTaken: 0,
        evaluationsPending: 0,
        upcomingCount: 0,
        recentGrades: [],
        notifications: []
      };
    }
  });
}

export const getGetUpcomingEvaluationsQueryKey = () => ["upcoming"];
export function useGetUpcomingEvaluations() {
  return useQuery({ queryKey: getGetUpcomingEvaluationsQueryKey(), queryFn: async (): Promise<Evaluation[]> => [] });
}

export const getGetMyGradesQueryKey = () => ["myGrades"];
export function useGetMyGrades(options?: { query?: UseQueryOptions<GradeWithEvaluation[], any, any> }) {
  return useQuery({
    queryKey: getGetMyGradesQueryKey(),
    queryFn: async (): Promise<GradeWithEvaluation[]> => [],
    ...options?.query
  });
}

export const getGetMyNotificationsQueryKey = () => ["myNotifications"];
export function useGetMyNotifications() {
  return useQuery({ queryKey: getGetMyNotificationsQueryKey(), queryFn: async (): Promise<Notification[]> => [] });
}

export const useLogin = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  return useMutation({
    mutationFn: async ({ data }: { data: LoginBody }) => {
      const email = data.username.includes("@") ? data.username : `${data.username}@school.edu`;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, data.password);
        const docSnap = await getDoc(doc(db, "users", userCredential.user.uid));
        const role = docSnap.exists() ? docSnap.data().role : "student";
        return { role }; 
      } catch (e: any) {
        throw new ApiError(e.message, 401);
      }
    },
    onSuccess: (...args) => {
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export const useLogout = (options?: { mutation?: UseMutationOptions<any, any, any> }) => {
  return useMutation({
    mutationFn: async () => {
      await firebaseSignOut(auth);
    },
    onSuccess: (...args) => {
      options?.mutation?.onSuccess?.(...args);
    },
    onError: (...args) => {
      options?.mutation?.onError?.(...args);
    }
  });
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data || { message };
  }
}
