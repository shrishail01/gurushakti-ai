import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setMemoryToken } from "./api";
import type { UserProfile } from "./types";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<UserProfile>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: me, token } = await api.login(email, password);
    setMemoryToken(token);
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { user: me, token } = await api.register(name, email, password);
      setMemoryToken(token);
      setUser(me);
      return me;
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore — still clear local session
    }
    setMemoryToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    const { user: me } = await api.updateProfile(patch);
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      signIn,
      register,
      signOut,
      updateProfile,
      refresh,
    }),
    [user, isLoading, signIn, register, signOut, updateProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
