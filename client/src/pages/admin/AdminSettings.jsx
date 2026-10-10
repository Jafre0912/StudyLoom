import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Skeleton, ErrorState } from "../../components/ui/index.jsx";
import { useAct } from "./shared.jsx";

const ROWS = [
  ["registrationsOpen", "Open registrations", "Allow new students to sign up"],
  ["autoCertificates", "Auto-issue certificates", "Issue at 80%+ attendance when a batch ends"],
];

export default function AdminSettings() {
  const settings = useAdmin("settings", api.fetchSettings);
  const act = useAct();

  if (settings.isLoading) return <Skeleton className="h-40" />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={settings.refetch} />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Platform-wide switches." />
      <div className="card max-w-xl divide-y divide-slate-100">
        {ROWS.map(([k, t, d]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between gap-4 p-5">
            <div><p className="font-medium">{t}</p><p className="text-sm text-slate-500">{d}</p></div>
            <input
              type="checkbox"
              checked={!!settings.data[k]}
              onChange={(e) => act(() => api.saveSettings({ [k]: e.target.checked }), "Setting saved", "settings")}
              className="h-5 w-5 accent-brand-600"
            />
          </label>
        ))}
      </div>
    </>
  );
}