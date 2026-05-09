import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export interface SessionUser {
  id: string; // Firebase uid
  username: string;
  fullName: string;
  role: "teacher" | "student";
  studentId?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const docRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser({
          id: firebaseUser.uid,
          username: data.username || firebaseUser.email || "",
          fullName: data.fullName || firebaseUser.displayName || "",
          role: data.role || "student",
          studentId: data.studentId || null,
        });
      } else {
        // Fallback for newly created users without a doc yet
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.email || "",
          fullName: firebaseUser.displayName || "",
          role: "student", // default role
        });
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      fetchUserData(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    refresh: async () => {
      setLoading(true);
      await fetchUserData(auth.currentUser);
    },
    signOut: async () => {
      await firebaseSignOut(auth);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
