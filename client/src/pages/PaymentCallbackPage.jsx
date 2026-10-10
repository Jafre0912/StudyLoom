import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import * as api from "../services/api.js";
import { Button } from "../components/ui/index.jsx";
import { money } from "../utils/format.js";

// Landing page after eSewa / Khalti. Sends whatever the gateway returned to the server, which verifies
// it with the gateway itself (signature + status API) before enrolling the student.
export default function PaymentCallbackPage() {
  const { gateway } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = useState({ phase: gateway === "failed" ? "failed" : "checking" });
  const ran = useRef(false);

  useEffect(() => {
    if (gateway === "failed" || ran.current) return;
    ran.current = true;
    api.verifyPayment({ gateway, payload: Object.fromEntries(sp.entries()) })
      .then((r) => { ["enrollments", "payments", "checkout", "course"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setState({ phase: "ok", r }); setTimeout(() => nav(r.needsBatch ? `/batch-select/${r.course.slug}` : "/dashboard/courses", { replace: true }), 1800); })
      .catch((e) => setState({ phase: "failed", message: e.message }));
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {state.phase === "checking" && <><Loader2 className="animate-spin text-brand-600" size={40} /><h1 className="mt-4 text-xl font-bold">Confirming your payment…</h1><p className="mt-1 text-sm text-slate-500">Please do not close this page.</p></>}
      {state.phase === "ok" && <><CheckCircle2 className="text-emerald-600" size={44} /><h1 className="mt-4 text-xl font-bold">Payment successful</h1><p className="mt-1 text-sm text-slate-500">{money(state.r.payment.amount)} received · Receipt {state.r.payment.receiptNumber}</p><p className="mt-1 text-sm text-slate-500">Taking you to batch selection…</p></>}
      {state.phase === "failed" && <><XCircle className="text-red-600" size={44} /><h1 className="mt-4 text-xl font-bold">Payment not completed</h1><p className="mt-1 text-sm text-slate-500">{state.message || "You have not been charged. You can try again any time."}</p><div className="mt-5 flex gap-2"><Button as={Link} to="/courses">Browse courses</Button><Button as={Link} to="/dashboard/payments" variant="secondary">My payments</Button></div></>}
    </div>
  );
}
