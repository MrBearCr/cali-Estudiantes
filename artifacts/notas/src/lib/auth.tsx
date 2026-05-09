import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { ApiError } from "@workspace/api-client-react";

export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  role: "teacher" | "student";
  studentId?: number | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      retry: (count, err) => {
        if (err instanceof ApiError && err.status === 401) return false;
        return count < 1;
      },
      staleTime: 5 * 60 * 1000,
    },
  });

  const value = useMemo<AuthContextValue>(() => {
    let sessionUser: SessionUser | null = null;
    if (query.data) {
      sessionUser = {
        id: query.data.id,
        username: query.data.username,
        fullName: query.data.fullName,
        role: query.data.role as "teacher" | "student",
        studentId: query.data.studentId ?? null,
      };
    }
    return {
      user: sessionUser,
      loading: query.isLoading,
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      },
      signOut: async () => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), undefined);
        queryClient.removeQueries();
      },
    };
  }, [query.data, query.isLoading, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
