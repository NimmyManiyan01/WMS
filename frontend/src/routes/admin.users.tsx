import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  KeyRound,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserMinus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management · NexusWMS" },
      {
        name: "description",
        content:
          "Admin user management dashboard for roles, access, passwords, and activity review.",
      },
    ],
  }),
  component: UserManagementPage,
});

const seededUsers = [
  {
    id: "USR-001",
    name: "Harsha Dev",
    email: "harsha.dev@nexuswms.local",
    employeeId: "EMP-001",
    role: "Admin Officer",
    status: "Active",
    lastActivity: "Today, 09:45",
  },
  {
    id: "USR-002",
    name: "Rahul Kumar",
    email: "rahul.kumar@nexuswms.local",
    employeeId: "EMP-002",
    role: "Warehouse Manager",
    status: "Active",
    lastActivity: "Today, 08:20",
  },
  {
    id: "USR-003",
    name: "Priya Sharma",
    email: "priya.sharma@nexuswms.local",
    employeeId: "EMP-003",
    role: "Procurement",
    status: "Active",
    lastActivity: "Yesterday, 17:10",
  },
];

const roleOptions = ["All Roles", "Admin Officer", "Warehouse Manager", "Procurement"];
const statusOptions = ["All Status", "Active", "Inactive"];

function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return seededUsers.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.employeeId.toLowerCase().includes(query);
      const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
      const matchesStatus = statusFilter === "All Status" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter]);

  return (
    <AppShell
      title="User Management"
      subtitle="Create users, assign roles, manage access, and review admin activity."
      actions={
        <Button size="sm" className="rounded-xl text-xs font-semibold shadow-glow">
          <Plus className="mr-1.5 size-3.5" /> Add User
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, employee ID..."
              className="h-10 rounded-xl border-border/50 bg-card pl-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-10 rounded-xl border-border/50 bg-card text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-xl border-border/50 bg-card text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                      <p className="text-sm font-semibold text-foreground">No users found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Adjust search, role, or status filters to view users.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                        {user.employeeId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            user.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.lastActivity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 rounded-xl p-0">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                              <Users className="mr-2 size-4" /> View User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCog className="mr-2 size-4" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <SlidersHorizontal className="mr-2 size-4" /> Manage Access
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <KeyRound className="mr-2 size-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600">
                              <UserMinus className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Activity className="mr-2 size-4" /> View Activity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Seeded admin users are available for local role and access testing.</span>
        </div>
      </div>
    </AppShell>
  );
}
