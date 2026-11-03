import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { MC } from "./base.js";

export default function MyClassLogin() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { state } = useLocation();
  const target = state?.from || MC("/");

if (user) return <Navigate to={target} replace />;      
const submit = async (e) => {
  e.preventDefault();
  setBusy(true);
  setErr("");
  try {
    const u = await login({ email, password });
    toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
    nav(target, { replace: true });
  } catch (ex) {
    setErr(ex?.message || "Login failed");
  } finally {
    setBusy(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white/70 p-8 text-center shadow-xl backdrop-blur">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl font-bold text-white">S</span>
        <h1 className="mt-4 text-4xl font-light text-slate-700">My Class</h1>
        <p className="mt-1 text-sm text-slate-500">Use your StudyLoom credentials to login</p>
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-8 w-full rounded border border-slate-200 bg-blue-50 px-3 py-3 text-base outline-none focus:border-orange-400" />
        <div className="relative mt-3">
          <input type={show ? "text" : "password"} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-200 bg-blue-50 px-3 py-3 pr-16 text-base outline-none focus:border-orange-400" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{show ? "Hide" : "Show"}</button>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={busy} className="mt-6 w-full rounded-full bg-orange-500 py-3 text-lg font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}