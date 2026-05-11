import { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Music2, Tag, Users, BarChart3, LayoutDashboard, ArrowLeft, Menu, X } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/songs", icon: Music2, label: "Songs" },
  { to: "/admin/tags", icon: Tag, label: "Tags" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
];

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const { current, position, duration } = usePlayer();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const Item = ({ to, icon: Icon, label }: { to: string; icon: typeof Music2; label: string }) => (
    <NavLink
      to={to}
      end
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-colors ${isActive ? "bg-popover text-foreground" : "text-muted-foreground hover:text-foreground"}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" /> {label}
    </NavLink>
  );

  const SidebarContent = () => (
    <>
      <button
        onClick={() => { setOpen(false); navigate("/"); }}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3 w-3" /> Back to app
      </button>
      <div className="text-xs font-semibold tracking-[0.3em] text-primary mb-4">ADMIN</div>
      {NAV_ITEMS.map((item) => (
        <Item key={item.to} to={item.to} icon={item.icon} label={item.label} />
      ))}
    </>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <button onClick={() => setOpen(true)} className="p-1 text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-xs font-semibold tracking-[0.3em] text-primary">ADMIN</span>
        <button onClick={() => navigate("/")} className="p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 bg-card border-r border-border p-6 flex-col gap-2 shrink-0">
          <SidebarContent />
        </aside>

        {/* Mobile drawer overlay */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col gap-2 overflow-y-auto">
              <button onClick={() => setOpen(false)} className="self-end mb-2 p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          {current && (
            <div className="mb-4 inline-flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground bg-popover/60 border border-border rounded-full px-3 py-1 max-w-full">
              <span className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-foreground/80 truncate max-w-[140px] md:max-w-[200px]">{current.title}</span>
              <span className="shrink-0">{fmt(position)} / {fmt(duration)}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
