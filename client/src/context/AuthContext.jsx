import { createContext, useContext, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api.js";

const AuthContext = createContext(null);

// sessionStorage, not localStorage: it is scoped to this tab only, so a student tab and an admin
// tab can hold different accounts at the same time.
const KEY = "studyloom-user";
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(read);

  const persist = (u) => {
    setUser(u);
    try { u ? sessionStorage.setItem(KEY, JSON.stringify(u)) : sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    return u;
  };

  // Switching accounts must drop the previous account's cached queries, otherwise one user can see
  // the previous one's dashboard data.
  const switchAccount = () => qc.clear();

  const login = useCallback(async (c) => { const u = await api.login(c); switchAccount(); return persist(u); }, []);
  const register = useCallback(async (p) => { const u = await api.register(p); switchAccount(); return persist(u); }, []);
  const logout = useCallback(async () => { await api.logoutApi().catch(() => {}); switchAccount(); persist(null); }, []);
  const update = useCallback(async (patch) => persist({ ...read(), ...(await api.updateProfile(patch)) }), []);

  return <AuthContext.Provider value={{ user, login, register, logout, update }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const homeFor = (role) => (role === "admin" ? "/admin" : role === "instructor" ? "/instructor/dashboard" : "/dashboard");