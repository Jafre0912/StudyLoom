import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Wallet, Smartphone, Banknote, Tag, Lock, CheckCircle2 } from "lucide-react";
import { useCheckout, useEnrollments } from "../hooks/queries.js";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, ErrorState, Skeleton, Badge } from "../components/ui/index.jsx";
import { money } from "../utils/format.js";

const ICON = {
  esewa: [Wallet, "text-emerald-600", "Pay securely with your eSewa wallet"],
  khalti: [Smartphone, "text-purple-600", "Pay securely with Khalti"],
  cash: [Banknote, "text-amber-600", "Pay cash at the StudyLoom office"],
};
const NAME = { esewa: "eSewa", khalti: "Khalti", cash: "Cash" };
// Gateways without server credentials are listed but cannot be chosen.
const MISSING = { khalti: "Add KHALTI_SECRET_KEY to server/.env", esewa: "Add your eSewa keys to server/.env", cash: "" };

// Sends the browser to the gateway. eSewa needs a signed POST form; Khalti a plain redirect.
function goToGateway(redirect) {
  if (redirect.type === "url") { window.location.href = redirect.url; return; }
  const form = document.createElement("form");
  form.method = redirect.method; form.action = redirect.url;
  Object.entries(redirect.fields).forEach(([k, v]) => { const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; form.appendChild(i); });
  document.body.appendChild(form); form.submit();
}

export default function CheckoutPage() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useCheckout(courseId);
  const enrollments = useEnrollments();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", city: user?.city || "" });
  const [gateway, setGateway] = useState("");
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  if (isLoading || enrollments.isLoading) return <div className="mx-auto max-w-5xl p-10"><Skeleton className="h-96 w-full" /></div>;
  if (error) return <div className="mx-auto max-w-xl p-10"><ErrorState error={error} onRetry={refetch} /></div>;
  const { course, invoice, gateways } = data;
  const alreadyPaid = invoice?.amountPaid || 0;
  const hasSeat = enrollments.data?.some((e) => e.courseId === course._id);
  // Gateways the server has no credentials for come back configured:false - they stay visible but unselectable.
  const usable = gateways.filter((g) => g.configured !== false);
  const method = usable.some((g) => g.id === gateway) ? gateway : usable[0]?.id || "";

  const list = invoice && alreadyPaid > 0 ? invoice.totalAmount : course.price;
  const discount = invoice && alreadyPaid > 0 ? invoice.discount || 0 : promo?.discount || 0;
  const total = invoice && alreadyPaid > 0 ? invoice.totalAmount : list - discount;
  const due = Math.max(total - alreadyPaid, 0);

  const apply = async () => {
    try { const r = await api.checkPromo({ code, courseId: course._id }); setPromo(r); toast.success(`${r.code} applied — ${r.percent}% off`); }
    catch (e) { setPromo(null); toast.error(e.message); }
  };
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!/^9\d{9}$/.test(form.phone)) e.phone = "Enter a 10-digit mobile number starting with 9";
    setErrs(e); return !Object.keys(e).length;
  };
  const pay = async () => {
    if (!validate()) return toast.error("Please fix the highlighted fields");
    setBusy(true);
    try {
      if (course.price <= 0) { await api.enrollFree(course._id); return nav(`/batch-select/${course.slug}`); }
      if (!method) throw new Error("No payment method is configured on the server yet");
      const r = await api.startPayment({ courseId: course._id, amount: due, gateway: method, promo: promo?.code, student: form });
      // Cash has no gateway page to redirect to: the payment is recorded and staff confirm it later.
      if (r.offline || !r.redirect) {
        toast.success("Payment recorded. Please pay the cash at the StudyLoom office.");
        return nav("/dashboard/payments", { replace: true });
      }
      toast.loading(`Redirecting to ${NAME[method] || method}…`);
      goToGateway(r.redirect);
    } catch (e) { toast.error(e.message); setBusy(false); }
  };
  const F = ({ k, label, ph }) => <div><label className="label" htmlFor={k}>{label}</label><input id={k} placeholder={ph} className={`input ${errs[k] ? "border-red-400" : ""}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />{errs[k] && <p className="mt-1 text-xs text-red-600">{errs[k]}</p>}</div>;

  if (hasSeat && due === 0 && course.price > 0) return <div className="mx-auto max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={40} /><h1 className="mt-3 text-2xl font-bold">You are already enrolled</h1><Button as={Link} to="/dashboard/courses" className="mt-5">Go to My Courses</Button></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <p className="mt-1 text-slate-500">Step 1 of 2 · After payment you will choose your batch.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <section className="card p-6"><h2 className="mb-4 font-semibold">Student information</h2><div className="grid gap-4 sm:grid-cols-2"><F k="name" label="Full name" /><div><label className="label">Email</label><input className="input bg-slate-50" value={user?.email} readOnly /></div><F k="phone" label="Mobile number" ph="98XXXXXXXX" /><F k="city" label="City" ph="Kathmandu" /></div></section>
          {course.price > 0 && <section className="card p-6"><h2 className="mb-4 font-semibold">Payment method</h2>
            {usable.length === 0 ? <p className="text-sm text-red-600">No payment gateway is configured. Set the eSewa / Khalti keys in server/.env.</p> : <div className="space-y-3">{gateways.map((g) => { const [I, col, d] = ICON[g.id] || [Wallet, "text-slate-600", ""]; const on = g.configured !== false; return (
              <label key={g.id} className={`flex items-center gap-4 rounded-xl border p-4 transition ${!on ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60" : method === g.id ? "cursor-pointer border-brand-500 bg-brand-50/50 ring-2 ring-brand-100" : "cursor-pointer border-slate-200 hover:bg-slate-50"}`}><input type="radio" name="pm" disabled={!on} checked={on && method === g.id} onChange={() => setGateway(g.id)} className="accent-brand-600" /><I className={col} size={22} /><div className="flex-1"><p className="font-medium">{g.label}</p><p className="text-xs text-slate-500">{on ? d : MISSING[g.id] || "Not configured on the server yet"}</p></div>{!on && <Badge tone="gray">Unavailable</Badge>}</label>); })}</div>}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Lock size={12} />You will be redirected to the gateway to complete payment. Payments are verified server-side.</p></section>}
        </div>
        <aside><div className="card sticky top-24 p-6">
          <div className="flex gap-3"><img src={course.thumbnailUrl} alt="" className="h-16 w-24 rounded-lg object-cover" /><div><p className="text-sm font-semibold leading-snug">{course.title}</p><p className="mt-1 text-xs text-slate-500">{course.weeks} weeks · {course.weeks * course.classesPerWeek} live classes</p></div></div>
          {course.price > 0 && !(alreadyPaid > 0) && <><div className="mt-5 flex gap-2"><div className="relative flex-1"><Tag size={15} className="absolute left-3 top-3 text-slate-400" /><input className="input pl-9" placeholder="Promo code" value={code} onChange={(e) => setCode(e.target.value)} /></div><Button variant="secondary" onClick={apply} disabled={!code.trim()}>Apply</Button></div>
            {promo && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600"><CheckCircle2 size={13} />{promo.code} applied</p>}</>}
          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Course fee</dt><dd>{money(invoice && alreadyPaid > 0 ? invoice.listAmount || list : list)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Promo discount</dt><dd className="text-emerald-600">− {money(discount)}</dd></div>}
            {alreadyPaid > 0 && <div className="flex justify-between"><dt className="text-slate-500">Already paid</dt><dd>− {money(alreadyPaid)}</dd></div>}
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold"><dt>{alreadyPaid > 0 ? "Balance due" : "Total"}</dt><dd>{money(course.price > 0 ? due : 0)}</dd></div>
          </dl>
          <Button size="lg" className="mt-5 w-full" loading={busy} onClick={pay}>{course.price <= 0 ? "Enroll for free" : method === "cash" ? `Reserve a seat · ${money(due)} cash` : `Pay ${money(due)} with ${NAME[method] || "…"}`}</Button>
          <p className="mt-3 text-center text-xs text-slate-500"><Link to={`/courses/${course.slug}`} className="text-brand-600">Back to course</Link></p>
        </div></aside>
      </div>
    </div>
  );
}
