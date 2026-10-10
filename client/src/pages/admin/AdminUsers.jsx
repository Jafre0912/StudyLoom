import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Badge, Button, Avatar } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

export default function AdminUsers() {
  const users = useAdmin("users", api.fetchAdminUsers);
  const act = useAct();

  return (
    <>
      <PageHeader title="Users" subtitle="Every account on the platform." />
      <Panel q={users} empty="No users yet">
        {(d) => (
          <Table heads={["User", "Role", "Status", "Joined", ""]}>
            {d.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={30} />
                    <div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Suspended"}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <Button variant="ghost" size="sm" onClick={() => act(() => api.updateAdminUser(u._id, { isActive: !u.isActive }), u.isActive ? "User suspended" : "User activated", "users")}>
                      {u.isActive ? "Suspend" : "Activate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}