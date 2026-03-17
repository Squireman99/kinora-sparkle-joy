import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/relationship-map", label: "Relationship Map", icon: GitBranch },
  { to: "/talent", label: "Talent", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => setProfile(data));
    supabase.from("organization_members").select("role").eq("user_id", user.id).limit(1).single().then(({ data }) => setRole(data?.role ?? null));
  }, [user]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center px-5">
          <span className="text-lg font-bold tracking-tight text-foreground">Kinora</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-primary"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.full_name ?? "Loading…"}
              </p>
              {role && <Badge variant="secondary" className="mt-1 text-xs">{role}</Badge>}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium text-muted-foreground capitalize">
            {navItems.find((n) => n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to))?.label ?? ""}
          </h1>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
