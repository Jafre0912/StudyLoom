import axios from "axios";

// One axios instance for the whole app. Vite proxies /api -> the Express server (see vite.config.js).
const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "/api", withCredentials: true });

// Login lives in sessionStorage (separate for every browser tab), NOT localStorage (shared by all
// tabs). With localStorage, signing in as an admin in one tab silently switched the student tab to
// the admin as well.
const TOKEN = "studyloom-token";
const REFRESH = "studyloom-refresh";
try { localStorage.removeItem(TOKEN); localStorage.removeItem("studyloom-user"); } catch { /* clean up the old shared login once */ }

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN),
  set: (t) => sessionStorage.setItem(TOKEN, t),
  clear: () => sessionStorage.removeItem(TOKEN),
};
// This tab's own refresh token. Sent in the body because the refreshToken cookie is shared by every
// tab, so using the cookie would hand this tab somebody else's session.
export const refreshStore = {
  get: () => sessionStorage.getItem(REFRESH),
  set: (t) => sessionStorage.setItem(REFRESH, t),
  clear: () => sessionStorage.removeItem(REFRESH),
};

export const clearSession = () => { tokenStore.clear(); refreshStore.clear(); };

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Unwrap { success, message, data } and turn failures into plain Errors with the server's message.
let refreshing = null;
http.interceptors.response.use(
  (res) => res.data.data ?? res.data,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/auth/");
    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing ||= http.post("/auth/refresh", { refreshToken: refreshStore.get() }).finally(() => (refreshing = null));
        const { accessToken } = await refreshing;
        tokenStore.set(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch {
        clearSession();
        sessionStorage.removeItem("studyloom-user");
        if (!location.pathname.startsWith("/login")) location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
      }
    }
    const e = new Error(error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot reach the server. Is it running?" : error.message));
    e.status = status;
    return Promise.reject(e);
  }
);
export default http;