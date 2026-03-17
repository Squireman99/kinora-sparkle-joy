import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Building2, Users, Briefcase, Globe, FileText, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
  organization_id: string | null;
  created_at: string | null;
}

interface LinkedContact {
  id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
}

interface RoleTaxonomy {
  id: string;
  label: string;
  group_name: string;
}

interface OpenRole {
  id: string;
  role_taxonomy_id: string | null;
  status: string;
  notes: string | null;
  logged_by: string | null;
  created_at: string | null;
  role_label?: string;
  logged_by_name?: string;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<LinkedContact[]>([]);
  const [openRoles, setOpenRoles] = useState<OpenRole[]>([]);
  const [roleTaxonomy, setRoleTaxonomy] = useState<RoleTaxonomy[]>([]);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ role_taxonomy_id: "", notes: "" });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ role_taxonomy_id: "", notes: "" });

  const loadData = useCallback(async () => {
    if (!id) return;

    const [companyRes, taxonomyRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", id).single(),
      supabase.from("role_taxonomy").select("*").order("group_name, label"),
    ]);

    const c = companyRes.data as Company | null;
    setCompany(c);
    if (c) setForm(c);
    setRoleTaxonomy((taxonomyRes.data as RoleTaxonomy[] | null) ?? []);

    if (c) {
      // Load linked contacts by company_name match
      const { data: contactData } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, job_title")
        .eq("company_name", c.name);
      setContacts((contactData as LinkedContact[] | null) ?? []);

      // Load open roles
      const { data: rolesData } = await supabase
        .from("company_open_roles")
        .select("*")
        .eq("company_id", id)
        .order("created_at", { ascending: false });

      const roles = (rolesData ?? []) as OpenRole[];

      // Resolve role labels and logged_by names
      const taxMap: Record<string, string> = {};
      ((taxonomyRes.data as RoleTaxonomy[] | null) ?? []).forEach((t) => { taxMap[t.id] = t.label; });

      const loggerIds = [...new Set(roles.map((r) => r.logged_by).filter(Boolean))] as string[];
      const loggerMap: Record<string, string> = {};
      if (loggerIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", loggerIds);
        (profiles ?? []).forEach((p: { id: string; full_name: string | null }) => { loggerMap[p.id] = p.full_name ?? "Unknown"; });
      }

      setOpenRoles(
        roles.map((r) => ({
          ...r,
          role_label: r.role_taxonomy_id ? taxMap[r.role_taxonomy_id] ?? "Unknown" : "Unknown",
          logged_by_name: r.logged_by ? loggerMap[r.logged_by] ?? "Unknown" : "—",
        }))
      );
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      name: form.name!,
      industry: form.industry ?? null,
      website: form.website ?? null,
      notes: form.notes ?? null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Company updated" });
    setCompany({ ...company!, ...form } as Company);
    setEditing(false);
  };

  const handleAddRole = async () => {
    if (!roleForm.role_taxonomy_id || !user) return;
    const { error } = await supabase.from("company_open_roles").insert({
      company_id: id!,
      role_taxonomy_id: roleForm.role_taxonomy_id,
      notes: roleForm.notes.trim() || null,
      logged_by: user.id,
      status: "open",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Role added" });
    setRoleForm({ role_taxonomy_id: "", notes: "" });
    setShowRoleForm(false);
    loadData();
  };

  const handleUpdateRoleStatus = async (roleId: string, status: string) => {
    const { error } = await supabase.from("company_open_roles").update({ status }).eq("id", roleId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role marked as ${status}` });
    setOpenRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, status } : r));
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!company) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  // Group taxonomy by group_name
  const groupedTaxonomy: Record<string, RoleTaxonomy[]> = {};
  roleTaxonomy.forEach((t) => {
    if (!groupedTaxonomy[t.group_name]) groupedTaxonomy[t.group_name] = [];
    groupedTaxonomy[t.group_name].push(t);
  });

  const statusVariant = (status: string) => {
    if (status === "open") return "default";
    if (status === "filled") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
          </div>
        </div>
        {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit Company</Button>}
      </div>

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Edit Company</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name ?? ""} onChange={set("name")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Industry</Label><Input value={form.industry ?? ""} onChange={set("industry")} /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={form.website ?? ""} onChange={set("website")} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={set("notes")} rows={3} /></div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(company); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Company Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-4 w-4 text-primary" /> Company Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Industry</dt><dd className="text-foreground">{company.industry || "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><dt className="text-xs text-muted-foreground">Website</dt><dd className="text-foreground truncate">
                    {company.website ? <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{company.website}</a> : "—"}
                  </dd></div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Notes</dt><dd className="text-foreground whitespace-pre-wrap">{company.notes || "—"}</dd></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Roles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-4 w-4 text-primary" /> Open Roles</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowRoleForm(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Role</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showRoleForm && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Role *</Label>
                    <Select value={roleForm.role_taxonomy_id} onValueChange={(v) => setRoleForm((f) => ({ ...f, role_taxonomy_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a role…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedTaxonomy).map(([group, items]) => (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {items.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={roleForm.notes} onChange={(e) => setRoleForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddRole}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowRoleForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {openRoles.length === 0 && !showRoleForm && <p className="text-sm text-muted-foreground">No open roles yet.</p>}

              {openRoles.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{r.role_label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Logged by {r.logged_by_name} · {r.created_at ? format(parseISO(r.created_at), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <Badge variant={statusVariant(r.status)} className="capitalize text-xs">{r.status}</Badge>
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                  {r.status === "open" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleUpdateRoleStatus(r.id, "filled")}>
                        <CheckCircle className="h-3 w-3" /> Mark Filled
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-muted-foreground" onClick={() => handleUpdateRoleStatus(r.id, "cancelled")}>
                        <XCircle className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-4 w-4 text-primary" /> Contacts ({contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm hover:bg-secondary/50 transition-colors">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{c.first_name} {c.last_name}</p>
                        {c.job_title && <p className="text-xs text-muted-foreground truncate">{c.job_title}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
