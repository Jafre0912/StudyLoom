import { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail, Phone, User, Video, Users, Award } from "lucide-react";
import { Logo, Button } from "../components/ui/index.jsx";
import { useAuth, homeFor } from "../context/AuthContext.jsx";

/* ---------- Shared split-screen layout ---------- */
function Shell({ title, sub, children, foot }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
          {/* Left side */}
          <div className="hidden flex-col justify-center bg-gradient-to-br from-brand-700 to-cyan-500 p-14 text-white lg:flex">
            <span className="mb-5 w-fit rounded-full bg-white/20 px-4 py-2 text-sm">
              Live Learning Platform
            </span>

            <h1 className="text-5xl font-bold leading-tight">Learn live, together.</h1>

            <p className="mt-6 text-lg leading-8 text-blue-100">
              Join live classes with real instructors, ask questions in the moment and
              keep all your courses in one place.
            </p>

            <div className="mt-10 space-y-4">
              {[
                [Video, "Live interactive classes"],
                [Users, "Expert instructors"],
                [Award, "Track your progress"],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-blue-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={20} />
                  </span>
                  {text}
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
              <p className="text-xl font-semibold">StudyLoom</p>
              <p className="mt-3 text-blue-100">Live • Interactive • Reliable</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center justify-center bg-white p-8 md:p-14">
            <div className="w-full max-w-md">
              <div className="mb-10 text-center">
                <Link to="/" className="mb-5 flex justify-center">
                  <Logo />
                </Link>
                <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                <p className="mt-2 text-sm text-gray-500">{sub}</p>
              </div>

              {children}

              <div className="mt-8 border-t pt-6 text-center text-sm text-gray-500">{foot}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- Reusable icon input ---------- */
function Field({ id, label, icon: Icon, type = "text", value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-gray-300 px-4 py-3 focus-within:border-brand-600">
        <Icon size={20} className="text-gray-400" />
        <input
          id={id}
          type={isPw && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="ml-3 w-full bg-transparent outline-none"
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="cursor-pointer"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={20} className="text-gray-500" /> : <Eye size={20} className="text-gray-500" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Login ---------- */
export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={sp.get("next") || homeFor(user.role)} replace />;

  const submit = async (e, creds = f) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const u = await login(creds);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      nav(sp.get("next") || homeFor(u.role), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Sign In"
      sub="Log in to join your live classes."
      foot={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <Field
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          id="pw"
          label="Password"
          icon={Lock}
          type="password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          placeholder="Enter password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" className="h-4 w-4 cursor-pointer rounded" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full !rounded-xl !py-3 font-semibold" loading={busy}>
          Sign In
        </Button>
      </form>
    </Shell>
  );
}

/* ---------- Register ---------- */
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
    try {
      await register(f);
      toast.success("Account created!");
      nav("/courses");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    ["name", "Full name", User, "text", "Enter your full name", "name"],
    ["email", "Email", Mail, "email", "you@example.com", "email"],
    ["phone", "Mobile number", Phone, "tel", "Enter mobile number", "tel"],
    ["password", "Password", Lock, "password", "At least 6 characters", "new-password"],
  ];

  return (
    <Shell
      title="Create Account"
      sub="Start learning live with real instructors."
      foot={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {fields.map(([k, label, icon, type, ph, ac]) => (
          <Field
            key={k}
            id={k}
            label={label}
            icon={icon}
            type={type}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            placeholder={ph}
            autoComplete={ac}
          />
        ))}
        <Button type="submit" className="w-full !rounded-xl !py-3 font-semibold" loading={busy}>
          Create Account
        </Button>
      </form>
    </Shell>
  );
}