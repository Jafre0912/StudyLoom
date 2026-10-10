import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext.jsx";
import { PageHeader, Button, Avatar } from "../../components/ui/index.jsx";
export default function Profile() {
  const { user, update } = useAuth();
  const [f, setF] = useState({ name: user.name, email: user.email, phone: user.phone || "", city: user.city || "" });
  const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); if (!f.name.trim()) return toast.error("Name is required"); setBusy(true); try { await update({ name: f.name, phone: f.phone, city: f.city }); toast.success("Profile updated"); } catch (err) { toast.error(err.message); } finally { setBusy(false); } };
  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your personal information." />
      <form onSubmit={save} className="card max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-4"><Avatar name={f.name} size={64} /><div><p className="font-semibold">{f.name}</p><p className="text-sm capitalize text-slate-500">{user.role}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">{[["name", "Full name"], ["email", "Email"], ["phone", "Mobile"], ["city", "City"]].map(([k, l]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} disabled={k === "email"} className="input disabled:bg-slate-50" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
        <Button type="submit" loading={busy}>Save changes</Button>
      </form>
    </>
  );
}
