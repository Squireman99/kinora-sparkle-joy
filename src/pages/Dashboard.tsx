import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Users, Building2, Briefcase, TrendingUp, ArrowRight } from "lucide-react";

interface RecentContact {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  created_at: string | null;
}

interface NetworkContact {
  contact_id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  maturity_label: string;
  maturity_level: number;
}

interface JobSeekerPreview {
  contact_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
}

interface OpenRolePreview {
  id: string;
  company_name: string;
  role_label: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ contacts: 0, companies: 0, jobSeekers: 0, openRoles: 0 });
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [myNetwork, setMyNetwork] = useState<NetworkContact[]>([]);
  const [jobSeekers, setJobSeekers] = useState<JobSeekerPreview[]>([]);
  const [openRoles, setOpenRoles] = useState<OpenRolePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        { count: contactCount },
        { count: companyCount },
        { count: jobSeekerCount },
        { count: openRoleCount },
      ] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("job_seeking_tags").select("*", { count: "exact", head: true }).eq("is_job_seeking", true),
        supabase.from("company_open_roles").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({
        contacts: contactCount ?? 0,
        companies: companyCount ?? 0,
        jobSeekers: jobSeekerCount ?? 0,
        openRoles: openRoleCount ?? 0,
      });

      // Recent contacts
      const { data: recent } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company_name, job_title, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentContacts((recent ?? []) as RecentContact[]);

      // My network — contact_maturity for current user sorted by maturity level
      const { data: maturityRows } = await supabase
        .from("contact_maturity")
        .select("contact_id, maturity_level_id")
        .eq("user_id", user.id);

      if (maturityRows && maturityRows.length > 0) {
        const levelIds = [...new Set(maturityRows.map((m) => m.maturity_level_id).filter(Boolean))] as string[];
        const contactIds = maturityRows.map((m) => m.contact_id);

        const [{ data: taxonomy }, { data: contactsData }] = await Promise.all([
          supabase.from("maturity_level_taxonomy").select("id, label, level").in("id", levelIds),
          supabase.from("contacts").select("id, first_name, last_name, company_name").in("id", contactIds),
        ]);

        const taxMap: Record<string, { label: string; level: number }> = {};
        (taxonomy ?? []).forEach((t) => { taxMap[t.id] = { label: t.label, level: t.level }; });
        const contactMap: Record<string, { first_name: string; last_name: string | null; company_name: string | null }> = {};
        (contactsData ?? []).forEach((c) => { contactMap[c.id] = c; });

        const network: NetworkContact[] = maturityRows
          .map((m) => {
            const tax = m.maturity_level_id ? taxMap[m.maturity_level_id] : null;
            const contact = contactMap[m.contact_id];
            if (!contact || !tax) return null;
            return {
              contact_id: m.contact_id,
              first_name: contact.first_name,
              last_name: contact.last_name,
              company_name: contact.company_name,
              maturity_label: tax.label,
              maturity_level: tax.level,
            };
          })
          .filter(Boolean) as NetworkContact[];

        network.sort((a, b) => b.maturity_level - a.maturity_level);
        setMyNetwork(network.slice(0, 10));
      }

      // Job seekers preview
      const { data: seekerTags } = await supabase
        .from("job_seeking_tags")
        .select("contact_id")
        .eq("is_job_seeking", true);

      if (seekerTags && seekerTags.length > 0) {
        const ids = seekerTags.map((s) => s.contact_id);
        const { data: seekerContacts } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, job_title")
          .in("id", ids);
        setJobSeekers(
          (seekerContacts ?? []).map((c) => ({
            contact_id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            job_title: c.job_title,
          }))
        );
      }

      // Open roles preview
      const { data: openRoleRows } = await supabase
        .from("company_open_roles")
        .select("id, company_id, role_taxonomy_id")
        .eq("status", "open");

      if (openRoleRows && openRoleRows.length > 0) {
        const companyIds = [...new Set(openRoleRows.map((r) => r.company_id).filter(Boolean))] as string[];
        const roleIds = [...new Set(openRoleRows.map((r) => r.role_taxonomy_id).filter(Boolean))] as string[];

        const [{ data: companiesData }, { data: roleTax }] = await Promise.all([
          companyIds.length
            ? supabase.from("companies").select("id, name").in("id", companyIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
          roleIds.length
            ? supabase.from("role_taxonomy").select("id, label").in("id", roleIds)
            : Promise.resolve({ data: [] as { id: string; label: string }[] }),
        ]);

        const companyMap: Record<string, string> = {};
        (companiesData ?? []).forEach((c) => { companyMap[c.id] = c.name; });
        const roleTaxMap: Record<string, string> = {};
        (roleTax ?? []).forEach((r) => { roleTaxMap[r.id] = r.label; });

        setOpenRoles(
          openRoleRows.map((r) => ({
            id: r.id,
            company_name: r.company_id ? companyMap[r.company_id] ?? "—" : "—",
            role_label: r.role_taxonomy_id ? roleTaxMap[r.role_taxonomy_id] ?? "—" : "—",
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [user]);

  function maturityBadgeClass(label: string) {
    const l = label.toLowerCase();
    if (l.includes("intimate") || l.includes("sponsor"))
      return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    if (l.includes("trusted"))
      return "bg-teal-500/20 text-teal-300 border border-teal-500/30";
    return "bg-muted text-muted-foreground border border-border";
  }

  function formatDate(str: string | null) {
    if (!str) return "—";
    return new Date(str).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  const statCards = [
    { label: "Total Contacts", value: stats.contacts, icon: <Users className="h-5 w-5 text-muted-foreground" /> },
    { label: "Total Companies", value: stats.companies, icon: <Building2 className="h-5 w-5 text-muted-foreground" /> },
    { label: "Active Job Seekers", value: stats.jobSeekers, icon: <Briefcase className="h-5 w-5 text-muted-foreground" /> },
    { label: "Open Roles", value: stats.openRoles, icon: <TrendingUp className="h-5 w-5 text-muted-foreground" /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-border bg-card p-5 flex items-start justify-between"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <div className="mt-1">{card.icon}</div>
              </div>
            ))}
          </div>

          {/* Recent Contacts + My Network */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Recent Contacts</h2>
              </div>
              <div className="divide-y divide-border">
                {recentContacts.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No contacts yet</p>
                ) : (
                  recentContacts.map((c) => (
                    <Link
                      key={c.id}
                      to={`/contacts/${c.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.job_title ?? "—"} · {c.company_name ?? "—"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 ml-4">{formatDate(c.created_at)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">My Network</h2>
              </div>
              <div className="divide-y divide-border">
                {myNetwork.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No relationships set yet</p>
                ) : (
                  myNetwork.map((c) => (
                    <Link
                      key={c.contact_id}
                      to={`/contacts/${c.contact_id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.company_name ?? "—"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${maturityBadgeClass(c.maturity_label)}`}>
                        {c.maturity_label}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Talent Pipeline */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Talent Pipeline</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/talent">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div>
                <div className="px-5 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Seekers</p>
                </div>
                <div className="divide-y divide-border">
                  {jobSeekers.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">No active job seekers</p>
                  ) : (
                    jobSeekers.map((s) => (
                      <Link
                        key={s.contact_id}
                        to={`/contacts/${s.contact_id}`}
                        className="block px-5 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {s.first_name} {s.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.job_title ?? "—"}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="px-5 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open Roles</p>
                </div>
                <div className="divide-y divide-border">
                  {openRoles.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">No open roles</p>
                  ) : (
                    openRoles.map((r) => (
                      <div key={r.id} className="px-5 py-3">
                        <p className="text-sm font-medium text-foreground">{r.role_label}</p>
                        <p className="text-xs text-muted-foreground">{r.company_name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
