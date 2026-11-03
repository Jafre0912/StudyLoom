import { Link, Outlet, Navigate, useLocation } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { MC } from "./base.js";

export default function MyClassLayout() {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();
if (loading) return null;
if (!user) return <Navigate to={MC("/login")} state={{ from: pathname }} replace />;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-14 items-center justify-between bg-slate-800 px-4 text-white sm:px-6">
        <div className="flex items-center gap-6">
          <Link to={MC("/")} className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm">S</span>
            StudyLoom
          </Link>
          <Link to={MC("/")} className="flex items-center gap-1.5 text-sm text-slate-200 hover:text-white"><Home size={15} />Home</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-200 sm:inline">{user.email}</span>
          <button onClick={logout} className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 font-semibold hover:bg-red-700">
            Logout <LogOut size={14} />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><Outlet /></main>
    </div>
  );
}