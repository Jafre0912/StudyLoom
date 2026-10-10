import { useState } from "react";
import { Award, BadgeCheck, Download, Eye, Printer } from "lucide-react";
import { useCertificates } from "../../hooks/queries.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { PageHeader, Button, Badge, Modal, RowSkeletons, ErrorState, EmptyState, Logo } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";

function Template({ c, name }) {
  return (
    <div className="rounded-xl border-[6px] border-double border-brand-200 bg-gradient-to-br from-white to-brand-50 p-8 text-center">
      <div className="flex justify-center"><Logo /></div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Certificate of Completion</p>
      <p className="mt-5 text-sm text-slate-500">This certifies that</p>
      <p className="mt-1 text-3xl font-extrabold">{name}</p>
      <p className="mt-3 text-sm text-slate-500">has successfully completed the live course</p>
      <p className="mt-1 text-xl font-bold text-brand-700">{c.course.title}</p>
      <p className="mt-3 text-sm text-slate-600">{c.hours} live hours · {c.attendance}% attendance · {c.grade}</p>
      <div className="mt-8 flex items-end justify-between text-xs text-slate-500"><div><p className="font-semibold text-slate-800">{fmtDate(c.issuedAt)}</p><p>Date issued</p></div><BadgeCheck size={44} className="text-brand-600" /><div><p className="font-semibold text-slate-800">{c.course.instructor?.name || "StudyLoom"}</p><p>Lead instructor</p></div></div>
      <p className="mt-5 font-mono text-xs text-slate-500">ID: {c.certId} · Verify at {window.location.origin}/verify/{c.certId}</p>
    </div>
  );
}

export default function Certificates() {
  const { data, isLoading, error, refetch } = useCertificates();
  const { user } = useAuth();
  const [view, setView] = useState(null);
  return (
    <>
      <PageHeader title="Certificates" subtitle="Earned by completing a course with 80%+ attendance." />
      {isLoading ? <RowSkeletons n={2} /> : error ? <ErrorState error={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState icon={Award} title="No certificates yet" text="Finish a course with at least 80% attendance to earn one." /> : (
        <div className="grid gap-5 md:grid-cols-2">{data.map((c) => (
          <div key={c.id} className="card overflow-hidden"><div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white"><Award size={28} /><h3 className="mt-3 font-semibold">{c.course.title}</h3><p className="text-sm text-brand-100">Issued {fmtDate(c.issuedAt)}</p></div>
            <div className="p-5"><div className="flex items-center justify-between text-sm"><span className="font-mono text-xs text-slate-500">{c.certId}</span><Badge tone="green"><BadgeCheck size={12} />Verified</Badge></div>
              <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => setView(c)}><Eye size={15} />View</Button><Button size="sm" variant="secondary" onClick={() => { setView(c); setTimeout(() => window.print(), 300); }}><Download size={15} />Save as PDF</Button></div></div></div>))}</div>
      )}
      <Modal open={!!view} onClose={() => setView(null)} title="Certificate preview" wide>
        {view && <><Template c={view} name={user.name} /><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => window.print()}><Printer size={15} />Print</Button><Button onClick={() => window.print()}><Download size={15} />Save as PDF</Button></div></>}
      </Modal>
    </>
  );
}
