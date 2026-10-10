import { Link } from "react-router-dom";
import { BookOpen, CalendarDays } from "lucide-react";
import { useEnrollments } from "../../hooks/queries.js";
import { PageHeader, ProgressBar, Badge, Button, RowSkeletons, ErrorState, EmptyState } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";

export default function MyCourses() {
  const { data, isLoading, error, refetch } = useEnrollments();
  return (
    <>
      <PageHeader title="My Courses" subtitle="Track your enrolled live courses and progress." />
      {isLoading ? <RowSkeletons /> : error ? <ErrorState error={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState icon={BookOpen} title="You have not enrolled yet" text="Pick a live course and join your first class." action={<Button as={Link} to="/courses">Explore courses</Button>} /> : (
        <div className="space-y-4">{data.map((e) => (
          <div key={e.id} className="card flex flex-wrap items-center gap-5 p-4">
            <img src={e.course.thumbnail} alt="" className="h-24 w-40 rounded-xl object-cover" />
            <div className="min-w-[12rem] flex-1">
              <div className="flex flex-wrap items-center gap-2"><Badge tone={e.status === "completed" ? "gray" : e.status === "pending_batch" ? "amber" : "green"}>{e.status === "pending_batch" ? "Select batch" : e.status === "completed" ? "Completed" : "In progress"}</Badge>{e.batch && <Badge tone="brand" className="capitalize">{e.batch} batch</Badge>}</div>
              <h3 className="mt-1.5 font-semibold">{e.course.title}</h3>
              <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={12} />Enrolled {fmtDate(e.enrolledAt)} · {e.classesDone}/{e.totalClasses} classes · {e.attendance}% attendance</p>
              <div className="mt-3 flex items-center gap-3"><ProgressBar value={e.progress} tone={e.progress === 100 ? "green" : "brand"} /><span className="w-10 text-sm font-semibold">{e.progress}%</span></div>
            </div>
            {e.status === "pending_batch" ? <Button as={Link} to={`/batch-select/${e.course.slug}`}>Choose batch</Button> : <Button as={Link} to="/dashboard/live-classes" variant="secondary">Live classes</Button>}
          </div>))}</div>
      )}
    </>
  );
}
