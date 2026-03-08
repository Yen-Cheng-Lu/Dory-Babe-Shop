import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Member } from "../types";
import { getMe, getToken, logout as apiLogout } from "../services/api";

interface AuthContextValue {
  member: Member | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const m = await getMe();
      setMember(m);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    apiLogout();
    setMember(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        member,
        loading,
        isLoggedIn: !!member,
        isAdmin: !!(member?.isAdmin),
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
