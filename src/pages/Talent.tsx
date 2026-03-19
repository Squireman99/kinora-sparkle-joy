import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Zap } from "lucide-react";

interface JobSeeker {
  tagId: string;
  contactId: string;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  taggedByName: string;
  taggedAt: string | null;
  comment: string | null;
}

interface OpenRole {
  id: string;
  companyId: string | null;
  companyName: string;
  roleLabel: string;
  roleTaxonomyId: string | null;
  notes: string | null;
  loggedByName: string;
  createdAt: string | null;
}

interface MatchResult {
  seeker: JobSeeker;
  role: OpenRole;
  bestIntro: { memberName: string; maturityLabel: string } | null;
}

export default function Talent() {
  const { user } = useAuth();
  const [seekers, setSeekers] = useState<JobSeeker[]>([]);
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [seekerSearch, setSeekerSearch] = useState("");
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    // Job seekers
    const { data: tags } = await supabase
      .from("job_seeking_tags")
      .select("id, contact_id, tagged_by, created_at, comment")
      .eq("is_job_seeking", true);

    if (tags && tags.length > 0) {
      const contactIds = tags.map((t) => t.contact_id);
      const taggerIds = [...new Set(tags.map((t) => t.tagged_by))];
      const [{ data: contacts }, { data: taggers }] = await Promise.all([
        supabase.from("contacts").select("id, first_name, last_name, job_title, company_name").in("id", contactIds),
        supabase.from("profiles").select("id, full_name").in("id", taggerIds),
      ]);
      const contactMap: Record<string, any> = {};
      (contacts ?? []).forEach((c) => { contactMap[c.id] = c; });
      const taggerMap: Record<string, string> = {};
      (taggers ?? []).forEach((p) => { taggerMap[p.id] = p.full_name ?? "Unknown"; });

      setSeekers(
        tags.map((t) => {
          const c = contactMap[t.contact_id] ?? {};
          return {
            tagId: t.id,
            contactId: t.contact_id,
            firstName: c.first_name ?? "Unknown",
            lastName: c.last_name ?? null,
            jobTitle: c.job_title ?? null,
            companyName: c.company_name ?? null,
            taggedByName: taggerMap[t.tagged_by] ?? "Unknown",
            taggedAt: t.created_at,
            comment: t.comment,
          };
        })
      );
    }

    // Open roles
    const { data: openRoleRows } = await supabase
      .from("company_open_roles")
      .select("id, company_id, role_taxonomy_id, notes, logged_by, created_at")
      .eq("status", "open");

    if (openRoleRows && openRoleRows.length > 0) {
      const companyIds = [...new Set(openRoleRows.map((r) => r.company_id).filter(Boolean))] as string[];
      const roleIds = [...new Set(openRoleRows.map((r) => r.role_taxonomy_id).filter(Boolean))] as string[];
      const loggerIds = [...new Set(openRoleRows.map((r) => r.logged_by).filter(Boolean))] as string[];

      const [{ data: companiesData }, { data: roleTax }, { data: loggers }] = await Promise.all([
        companyIds.length
          ? supabase.from("companies").select("id, name").in("id", companyIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        roleIds.length
          ? supabase.from("role_taxonomy").select("id, label").in("id", roleIds)
          : Promise.resolve({ data: [] as { id: string; label: string }[] }),
        loggerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", loggerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      ]);

      const companyMap: Record<string, string> = {};
      (companiesData ?? []).forEach((c) => { companyMap[c.id] = c.name; });
      const roleTaxMap: Record<string, string> = {};
      (roleTax ?? []).forEach((r) => { roleTaxMap[r.id] = r.label; });
      const loggerMap: Record<string, string> = {};
      (loggers ?? []).forEach((p) => { loggerMap[p.id] = p.full_name ?? "Unknown"; });

      setRoles(
        openRoleRows.map((r) => ({
          id: r.id,
          companyId: r.company_id,
          companyName: r.company_id ? companyMap[r.company_id] ?? "—" : "—",
          roleLabel: r.role_taxonomy_id ? roleTaxMap[r.role_taxonomy_id] ?? "—" : "—",
          roleTaxonomyId: r.role_taxonomy_id,
          notes: r.notes,
          loggedByName: r.logged_by ? loggerMap[r.logged_by] ?? "Unknown" : "Unknown",
          createdAt: r.created_at,
        }))
      );
    }

    setLoading(false);
  }

  async function deactivateSeeker(tagId: string) {
    await supabase.from("job_seeking_tags").update({ is_job_seeking: false }).eq("id", tagId);
    setSeekers((prev) => prev.filter((s) => s.tagId !== tagId));
    setMatches(null);
  }

  async function updateRoleStatus(roleId: string, status: string) {
    await supabase.from("company_open_roles").update({ status }).eq("id", roleId);
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setMatches(null);
  }

  function tokenize(str: string): string[] {
    return str.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  }

  async function findMatches() {
    setLoadingMatches(true);

    // Contact roles history for all job seekers
    const seekerContactIds = seekers.map((s) => s.contactId);
    const { data: contactRoles } = await supabase
      .from("contact_roles")
      .select("contact_id, title")
      .in("contact_id", seekerContactIds);

    const seekerTitlesMap: Record<string, string[]> = {};
    seekers.forEach((s) => {
      seekerTitlesMap[s.contactId] = s.jobTitle ? [s.jobTitle] : [];
    });
    (contactRoles ?? []).forEach((r) => {
      if (!seekerTitlesMap[r.contact_id]) seekerTitlesMap[r.contact_id] = [];
      seekerTitlesMap[r.contact_id].push(r.title);
    });

    // Org members for warm intro lookup
    let maturityByContact: Record<string, { userId: string; level: number; label: string }[]> = {};
    let profilesMap: Record<string, string> = {};

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (membership?.organization_id) {
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", membership.organization_id);

      const memberIds = (orgMembers ?? []).map((m) => m.user_id).filter(Boolean) as string[];

      if (memberIds.length) {
        const [{ data: maturity }, { data: taxonomy }, { data: profiles }] = await Promise.all([
          supabase
            .from("contact_maturity")
            .select("contact_id, user_id, maturity_level_id")
            .in("contact_id", seekerContactIds)
            .in("user_id", memberIds),
          supabase.from("maturity_level_taxonomy").select("id, level, label"),
          supabase.from("profiles").select("id, full_name").in("id", memberIds),
        ]);

        const taxMap: Record<string, { level: number; label: string }> = {};
        (taxonomy ?? []).forEach((t) => { taxMap[t.id] = { level: t.level, label: t.label }; });
        (profiles ?? []).forEach((p) => { profilesMap[p.id] = p.full_name ?? "Unknown"; });

        (maturity ?? []).forEach((m) => {
          if (!maturityByContact[m.contact_id]) maturityByContact[m.contact_id] = [];
          const tax = m.maturity_level_id ? taxMap[m.maturity_level_id] : null;
          if (tax) {
            maturityByContact[m.contact_id].push({ userId: m.user_id, level: tax.level, label: tax.label });
          }
        });
      }
    }

    // Compute matches
    const results: MatchResult[] = [];
    for (const seeker of seekers) {
      const seekerTokens = (seekerTitlesMap[seeker.contactId] ?? []).flatMap((t) => tokenize(t));
      for (const role of roles) {
        const roleTokens = tokenize(role.roleLabel);
        const isMatch = roleTokens.some((rt) =>
          seekerTokens.some((st) => st.includes(rt) || rt.includes(st))
        );
        if (isMatch) {
          const maturityEntries = (maturityByContact[seeker.contactId] ?? []).sort(
            (a, b) => b.level - a.level
          );
          const best = maturityEntries[0];
          results.push({
            seeker,
            role,
            bestIntro: best
              ? { memberName: profilesMap[best.userId] ?? "Unknown", maturityLabel: best.label }
              : null,
          });
        }
      }
    }

    setMatches(results);
    setLoadingMatches(false);
  }

  function formatDate(str: string | null) {
    if (!str) return "—";
    return new Date(str).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  const filteredSeekers = seekers.filter((s) =>
    `${s.firstName} ${s.lastName ?? ""}`.toLowerCase().includes(seekerSearch.toLowerCase())
  );

  // Group roles by company
  const rolesByCompany: Record<string, OpenRole[]> = {};
  roles.forEach((r) => {
    if (!rolesByCompany[r.companyName]) rolesByCompany[r.companyName] = [];
    rolesByCompany[r.companyName].push(r);
  });

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Talent</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Job Seekers */}
        <div className="rounded-lg border border-border bg-card flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Job Seekers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{seekers.length} active</p>
          </div>
          <div className="px-5 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={seekerSearch}
                onChange={(e) => setSeekerSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
          <div className="divide-y divide-border flex-1">
            {filteredSeekers.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No active job seekers</p>
            ) : (
              filteredSeekers.map((s) => (
                <div key={s.tagId} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/contacts/${s.contactId}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {s.jobTitle ?? "—"} · {s.companyName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tagged by {s.taggedByName} · {formatDate(s.taggedAt)}
                      </p>
                      {s.comment && (
                        <p className="text-xs text-muted-foreground italic mt-1">"{s.comment}"</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => deactivateSeeker(s.tagId)}
                    >
                      <X className="h-3 w-3 mr-1" /> Deactivate
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Open Roles */}
        <div className="rounded-lg border border-border bg-card flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Open Roles</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{roles.length} open</p>
          </div>
          <div className="divide-y divide-border flex-1">
            {roles.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No open roles</p>
            ) : (
              Object.entries(rolesByCompany).map(([company, companyRoles]) => (
                <div key={company}>
                  <div className="px-5 py-2 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {company}
                    </p>
                  </div>
                  {companyRoles.map((r) => (
                    <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-2 border-t border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.roleLabel}</p>
                        {r.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Logged by {r.loggedByName} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                          onClick={() => updateRoleStatus(r.id, "filled")}
                        >
                          Mark Filled
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-muted-foreground hover:text-foreground"
                          onClick={() => updateRoleStatus(r.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Match section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Find Matches</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Match job seekers to open roles based on job title and career history
            </p>
          </div>
          <Button
            onClick={findMatches}
            disabled={loadingMatches || seekers.length === 0 || roles.length === 0}
          >
            <Zap className="mr-2 h-4 w-4" />
            {loadingMatches ? "Finding…" : "Find Matches"}
          </Button>
        </div>

        {matches !== null && (
          <div className="divide-y divide-border">
            {matches.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No matches found</p>
            ) : (
              matches.map((m, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/contacts/${m.seeker.contactId}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {m.seeker.firstName} {m.seeker.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{m.seeker.jobTitle ?? "—"}</p>
                  </div>
                  <div className="text-muted-foreground text-lg shrink-0">→</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.role.roleLabel}</p>
                    <p className="text-xs text-muted-foreground">{m.role.companyName}</p>
                  </div>
                  {m.bestIntro ? (
                    <div className="text-right shrink-0 border-l border-border pl-6">
                      <p className="text-xs text-muted-foreground">Warm intro via</p>
                      <p className="text-sm font-medium text-foreground">{m.bestIntro.memberName}</p>
                      <p className="text-xs text-muted-foreground">{m.bestIntro.maturityLabel}</p>
                    </div>
                  ) : (
                    <div className="text-right shrink-0 border-l border-border pl-6">
                      <p className="text-xs text-muted-foreground">No warm intro</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
