import { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Logo, Button } from "../components/ui/index.jsx";
import { useAuth, homeFor } from "../context/AuthContext.jsx";

function Shell({ title, sub, children, foot }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-md"><Link to="/" className="mb-6 flex justify-center"><Logo /></Link>
        <div className="card p-7 animate-fadeUp"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{sub}</p><div className="mt-6">{children}</div></div>
        <p className="mt-5 text-center text-sm text-slate-500">{foot}</p></div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={sp.get("next") || homeFor(user.role)} replace />;
  const submit = async (e, creds = f) => {
    e?.preventDefault(); setBusy(true);
    try { const u = await login(creds); toast.success(`Welcome back, ${u.name.split(" ")[0]}!`); nav(sp.get("next") || homeFor(u.role), { replace: true }); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome back" sub="Log in to join your live classes." foot={<>New here? <Link to="/register" className="font-semibold text-brand-600">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" required /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="••••••••" required /></div>
        <Button type="submit" className="w-full" loading={busy}>Log in</Button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Demo accounts</p>
        <div className="grid grid-cols-3 gap-2">{["student", "instructor", "admin"].map((r) => <Button key={r} variant="secondary" size="sm" className="capitalize" disabled={busy} onClick={() => submit(null, { email: `${r}@studyloom.com`, password: "demo" })}>{r}</Button>)}</div></div>
    </Shell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const submit = async (e) => {
    e.preventDefault();
    if (f.password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try { await register(f); toast.success("Account created!"); nav("/courses"); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const fields = [["name", "Full name", "text"], ["email", "Email", "email"], ["phone", "Mobile number", "tel"], ["password", "Password", "password"]];
  return (
    <Shell title="Create your account" sub="Start learning live with real instructors." foot={<>Already registered? <Link to="/login" className="font-semibold text-brand-600">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {fields.map(([k, l, t]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} type={t} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>)}
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
    </Shell>
  );
}
