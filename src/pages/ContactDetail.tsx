import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, CalendarIcon, Mail, Phone, User, Clock, Building2,
  Linkedin, FileText, Briefcase, MessageSquare, Heart, Tags,
  Network, Target, X, Pencil, Trash2,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

// ─── Types ───────────────────────────────────────────────────────
type Contact = Tables<"contacts"> & { linkedin_url?: string | null; company_name?: string | null };
type ContactRole = Tables<"contact_roles">;

interface Interaction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  description: string | null;
  created_at: string | null;
}

interface MaturityLevel { id: string; label: string; level: number; description: string | null }
interface RelType { id: string; label: string }
interface Interest { id: string; label: string; category: string }

// ─── Component ───────────────────────────────────────────────────
export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Contact
  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  // Career history
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ title: "", company_name: "", start_date: "", end_date: "", is_current: false });

  // Interactions
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [intForm, setIntForm] = useState({ interaction_type: "call", interaction_date: format(new Date(), "yyyy-MM-dd"), description: "" });
  const [editingIntId, setEditingIntId] = useState<string | null>(null);
  const [editIntForm, setEditIntForm] = useState({ interaction_type: "", interaction_date: "", description: "" });

  // Relationship / maturity
  const [maturityLevels, setMaturityLevels] = useState<MaturityLevel[]>([]);
  const [relTypes, setRelTypes] = useState<RelType[]>([]);
  const [maturity, setMaturity] = useState<{ maturity_level_id: string | null; relationship_type_id: string | null }>({ maturity_level_id: null, relationship_type_id: null });
  const [maturityExists, setMaturityExists] = useState(false);

  // Interests
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [contactInterestIds, setContactInterestIds] = useState<string[]>([]);

  // Connections (relationships table)
  const [relationships, setRelationships] = useState<{ id: string; contact_id: string; first_name: string; last_name: string | null; rel_type_label: string }[]>([]);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [connSearch, setConnSearch] = useState("");
  const [connSearchResults, setConnSearchResults] = useState<{ id: string; first_name: string; last_name: string | null }[]>([]);
  const [selectedConnContact, setSelectedConnContact] = useState<{ id: string; first_name: string; last_name: string | null } | null>(null);
  const [selectedRelTypeId, setSelectedRelTypeId] = useState("");

  // Job seeking
  const [jobTag, setJobTag] = useState<{ is_job_seeking: boolean; comment: string }>({ is_job_seeking: false, comment: "" });
  const [jobTagExists, setJobTagExists] = useState(false);

  const [orgId, setOrgId] = useState<string | null>(null);

  // ─── Load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id || !user) return;

    // Contact + roles + interactions in parallel
    const [contactRes, rolesRes, interactionsRes, matLevels, relTypesRes, interestsRes, contactIntRes, connectionsRes, jobRes, orgRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase.from("contact_roles").select("*").eq("contact_id", id).order("start_date", { ascending: false }),
      supabase.from("interaction_history").select("*").eq("contact_id", id).order("interaction_date", { ascending: false }),
      supabase.from("maturity_level_taxonomy").select("*").order("level"),
      supabase.from("relationship_type_taxonomy").select("*").order("label"),
      supabase.from("interest_taxonomy").select("*").order("label"),
      supabase.from("contact_interests").select("interest_id").eq("contact_id", id),
      supabase.from("relationships").select("*").or(`contact_a_id.eq.${id},contact_b_id.eq.${id}`),
      supabase.from("job_seeking_tags").select("*").eq("contact_id", id).maybeSingle(),
      supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single(),
    ]);

    const c = contactRes.data as Contact | null;
    setContact(c);
    if (c) setForm(c);
    setRoles(rolesRes.data ?? []);
    setInteractions((interactionsRes.data as Interaction[] | null) ?? []);
    setMaturityLevels((matLevels.data as MaturityLevel[] | null) ?? []);
    setRelTypes((relTypesRes.data as RelType[] | null) ?? []);
    setAllInterests((interestsRes.data as Interest[] | null) ?? []);
    setContactInterestIds((contactIntRes.data ?? []).map((r: { interest_id: string }) => r.interest_id));
    setOrgId(orgRes.data?.organization_id ?? null);

    // Load owner name
    if (c?.owner_id) {
      const { data: ownerData } = await supabase.from("profiles").select("full_name").eq("id", c.owner_id).single();
      setOwnerName(ownerData?.full_name ?? null);
    }

    // Load connected contacts names
    const connData = connectionsRes.data ?? [];
    if (connData.length) {
      const connIds = connData.map((cc: { connected_contact_id: string }) => cc.connected_contact_id);
      const { data: connContacts } = await supabase.from("contacts").select("id, first_name, last_name").in("id", connIds);
      setConnections(connData.map((cc: { id: string; connected_contact_id: string }) => {
        const found = (connContacts ?? []).find((fc: { id: string }) => fc.id === cc.connected_contact_id);
        return { ...cc, first_name: found?.first_name ?? "?", last_name: found?.last_name ?? null };
      }));
    } else {
      setConnections([]);
    }

    // Maturity
    const { data: matData } = await supabase.from("contact_maturity").select("*").eq("contact_id", id).eq("user_id", user.id).maybeSingle();
    if (matData) {
      setMaturity({ maturity_level_id: matData.maturity_level_id, relationship_type_id: matData.relationship_type_id });
      setMaturityExists(true);
    }

    // Job tag
    if (jobRes.data) {
      setJobTag({ is_job_seeking: (jobRes.data as { is_job_seeking: boolean; comment: string | null }).is_job_seeking, comment: (jobRes.data as { comment: string | null }).comment ?? "" });
      setJobTagExists(true);
    }
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").update({
      first_name: form.first_name!,
      last_name: form.last_name ?? null,
      email: form.email ?? null,
      phone: form.phone ?? null,
      job_title: form.job_title ?? null,
      notes: form.notes ?? null,
      linkedin_url: (form as Contact).linkedin_url ?? null,
      company_name: (form as Contact).company_name ?? null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contact updated" });
    setContact({ ...contact!, ...form } as Contact);
    setEditing(false);
  };

  const handleAddRole = async () => {
    if (!roleForm.title.trim()) return;
    const { data, error } = await supabase.from("contact_roles").insert({
      contact_id: id!, title: roleForm.title.trim(),
      company_name: roleForm.company_name.trim() || null,
      start_date: roleForm.start_date || null, end_date: roleForm.end_date || null,
      is_current: roleForm.is_current,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setRoles((prev) => [data, ...prev]);
    setRoleForm({ title: "", company_name: "", start_date: "", end_date: "", is_current: false });
    setShowRoleForm(false);
  };

  const handleAddInteraction = async () => {
    if (!intForm.interaction_type || !user || !orgId) return;
    const { data, error } = await supabase.from("interaction_history").insert({
      contact_id: id!, user_id: user.id, organization_id: orgId,
      interaction_type: intForm.interaction_type,
      interaction_date: intForm.interaction_date,
      description: intForm.description.trim() || null,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setInteractions((prev) => [data as Interaction, ...prev]);
    setIntForm({ interaction_type: "call", interaction_date: format(new Date(), "yyyy-MM-dd"), description: "" });
    setShowInteractionForm(false);
    toast({ title: "Interaction logged" });
  };

  const handleMaturityChange = async (field: "maturity_level_id" | "relationship_type_id", value: string) => {
    if (!user || !id) return;
    const updated = { ...maturity, [field]: value };
    setMaturity(updated);
    if (maturityExists) {
      await supabase.from("contact_maturity").update({ ...updated, updated_at: new Date().toISOString() }).eq("contact_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("contact_maturity").insert({ contact_id: id, user_id: user.id, ...updated });
      setMaturityExists(true);
    }
  };

  const toggleInterest = async (interestId: string) => {
    if (!id) return;
    if (contactInterestIds.includes(interestId)) {
      await supabase.from("contact_interests").delete().eq("contact_id", id).eq("interest_id", interestId);
      setContactInterestIds((prev) => prev.filter((i) => i !== interestId));
    } else {
      await supabase.from("contact_interests").insert({ contact_id: id, interest_id: interestId });
      setContactInterestIds((prev) => [...prev, interestId]);
    }
  };

  const handleJobTagSave = async () => {
    if (!user || !id) return;
    if (jobTagExists) {
      await supabase.from("job_seeking_tags").update({ is_job_seeking: jobTag.is_job_seeking, comment: jobTag.comment || null, updated_at: new Date().toISOString() }).eq("contact_id", id);
    } else {
      await supabase.from("job_seeking_tags").insert({ contact_id: id, is_job_seeking: jobTag.is_job_seeking, comment: jobTag.comment || null, tagged_by: user.id });
      setJobTagExists(true);
    }
    toast({ title: "Talent status updated" });
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!contact) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const interactionTypeIcons: Record<string, string> = { call: "📞", meeting: "🤝", email: "✉️", dinner: "🍽️" };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{contact.first_name} {contact.last_name}</h1>
            {(contact as Contact).company_name && <p className="text-sm text-muted-foreground">{(contact as Contact).company_name}</p>}
            {contact.job_title && <p className="text-xs text-muted-foreground">{contact.job_title}</p>}
          </div>
        </div>
        {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit Contact</Button>}
      </div>

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Edit Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={form.first_name ?? ""} onChange={set("first_name")} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={form.last_name ?? ""} onChange={set("last_name")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={form.email ?? ""} onChange={set("email")} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={set("phone")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Job Title</Label><Input value={form.job_title ?? ""} onChange={set("job_title")} /></div>
                <div className="space-y-2"><Label>Company Name</Label><Input value={(form as Contact).company_name ?? ""} onChange={set("company_name")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>LinkedIn URL</Label><Input value={(form as Contact).linkedin_url ?? ""} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/..." /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={set("notes")} rows={3} /></div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(contact); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left Column (3/5) ── */}
        <div className="space-y-6 lg:col-span-3">
          {/* Contact Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-4 w-4 text-primary" /> Contact Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="text-foreground">{contact.email || "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="text-foreground">{contact.phone || "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="text-foreground">{ownerName || "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Last Contacted</dt><dd className="text-foreground">{contact.last_contacted ? format(parseISO(contact.last_contacted), "PPP") : "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Company</dt><dd className="text-foreground">{(contact as Contact).company_name || "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <Linkedin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><dt className="text-xs text-muted-foreground">LinkedIn</dt><dd className="text-foreground truncate">{(contact as Contact).linkedin_url ? <a href={(contact as Contact).linkedin_url!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{(contact as Contact).linkedin_url}</a> : "—"}</dd></div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div><dt className="text-xs text-muted-foreground">Notes</dt><dd className="text-foreground whitespace-pre-wrap">{contact.notes || "—"}</dd></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Career History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-4 w-4 text-primary" /> Career History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowRoleForm(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Role</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showRoleForm && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Title *</Label><Input value={roleForm.title} onChange={(e) => setRoleForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={roleForm.company_name} onChange={(e) => setRoleForm((f) => ({ ...f, company_name: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !roleForm.start_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {roleForm.start_date ? format(parseISO(roleForm.start_date), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={roleForm.start_date ? parseISO(roleForm.start_date) : undefined} onSelect={(date) => setRoleForm((f) => ({ ...f, start_date: date ? format(date, "yyyy-MM-dd") : "" }))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" disabled={roleForm.is_current} className={cn("w-full justify-start text-left font-normal text-sm", !roleForm.end_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {roleForm.end_date ? format(parseISO(roleForm.end_date), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={roleForm.end_date ? parseISO(roleForm.end_date) : undefined} onSelect={(date) => setRoleForm((f) => ({ ...f, end_date: date ? format(date, "yyyy-MM-dd") : "" }))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={roleForm.is_current} onCheckedChange={(v) => setRoleForm((f) => ({ ...f, is_current: !!v, end_date: v ? "" : f.end_date }))} />
                    <Label className="text-xs">Current Role</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddRole}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowRoleForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {roles.length === 0 && !showRoleForm && <p className="text-sm text-muted-foreground">No career history yet.</p>}
              {roles.map((r) => (
                <div key={r.id} className="flex items-start justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{r.title}</p>
                    {r.company_name && <p className="text-xs text-muted-foreground">{r.company_name}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.start_date ? format(parseISO(r.start_date), "MMM yyyy") : "?"} — {r.is_current ? "Present" : r.end_date ? format(parseISO(r.end_date), "MMM yyyy") : "?"}
                    </p>
                  </div>
                  {r.is_current && <Badge variant="secondary" className="text-xs">Current</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interaction History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-4 w-4 text-primary" /> Interaction History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowInteractionForm(true)} className="gap-1"><Plus className="h-3 w-3" /> Log Interaction</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showInteractionForm && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={intForm.interaction_type} onValueChange={(v) => setIntForm((f) => ({ ...f, interaction_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Call</SelectItem>
                          <SelectItem value="meeting">🤝 Meeting</SelectItem>
                          <SelectItem value="email">✉️ Email</SelectItem>
                          <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {intForm.interaction_date ? format(parseISO(intForm.interaction_date), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={intForm.interaction_date ? parseISO(intForm.interaction_date) : undefined} onSelect={(date) => setIntForm((f) => ({ ...f, interaction_date: date ? format(date, "yyyy-MM-dd") : "" }))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={intForm.description} onChange={(e) => setIntForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddInteraction}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowInteractionForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {interactions.length === 0 && !showInteractionForm && <p className="text-sm text-muted-foreground">No interactions logged yet.</p>}
              {interactions.map((i) => (
                <div key={i.id} className="rounded-lg border border-border p-3 space-y-2">
                  {editingIntId === i.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={editIntForm.interaction_type} onValueChange={(v) => setEditIntForm((f) => ({ ...f, interaction_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">📞 Call</SelectItem>
                              <SelectItem value="meeting">🤝 Meeting</SelectItem>
                              <SelectItem value="email">✉️ Email</SelectItem>
                              <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm")}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {editIntForm.interaction_date ? format(parseISO(editIntForm.interaction_date), "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={editIntForm.interaction_date ? parseISO(editIntForm.interaction_date) : undefined} onSelect={(date) => setEditIntForm((f) => ({ ...f, interaction_date: date ? format(date, "yyyy-MM-dd") : "" }))} initialFocus className="p-3 pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={editIntForm.description} onChange={(e) => setEditIntForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => {
                          const { error } = await supabase.from("interaction_history").update({
                            interaction_type: editIntForm.interaction_type,
                            interaction_date: editIntForm.interaction_date,
                            description: editIntForm.description.trim() || null,
                          }).eq("id", i.id);
                          if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                          toast({ title: "Interaction updated" });
                          setEditingIntId(null);
                          setInteractions((prev) => prev.map((x) => x.id === i.id ? { ...x, ...editIntForm, description: editIntForm.description.trim() || null } : x));
                        }}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingIntId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{interactionTypeIcons[i.interaction_type] ?? "📌"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground capitalize">{i.interaction_type}</p>
                          <span className="text-xs text-muted-foreground">{format(parseISO(i.interaction_date), "MMM d, yyyy")}</span>
                        </div>
                        {i.description && <p className="mt-1 text-xs text-muted-foreground">{i.description}</p>}
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-muted-foreground" onClick={() => {
                            setEditingIntId(i.id);
                            setEditIntForm({ interaction_type: i.interaction_type, interaction_date: i.interaction_date, description: i.description ?? "" });
                          }}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this interaction?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this interaction log. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                  await supabase.from("interaction_history").delete().eq("id", i.id);
                                  setInteractions((prev) => prev.filter((x) => x.id !== i.id));
                                  toast({ title: "Interaction deleted" });
                                }}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column (2/5) ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* My Relationship */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Heart className="h-4 w-4 text-primary" /> My Relationship</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Maturity Level</Label>
                <Select value={maturity.maturity_level_id ?? ""} onValueChange={(v) => handleMaturityChange("maturity_level_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select level…" /></SelectTrigger>
                  <SelectContent>
                    {maturityLevels.map((ml) => (
                      <SelectItem key={ml.id} value={ml.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">L{ml.level}</span> {ml.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {maturity.maturity_level_id && (
                  <p className="text-xs text-muted-foreground">
                    {maturityLevels.find((m) => m.id === maturity.maturity_level_id)?.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Relationship Type</Label>
                <Select value={maturity.relationship_type_id ?? ""} onValueChange={(v) => handleMaturityChange("relationship_type_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {relTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Tags className="h-4 w-4 text-primary" /> Interests</CardTitle></CardHeader>
            <CardContent>
              {allInterests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interests defined in taxonomy.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allInterests.map((interest) => {
                    const selected = contactInterestIds.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {interest.label}
                        {selected && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected To */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Network className="h-4 w-4 text-primary" /> Connected To</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" disabled><Plus className="h-3 w-3" /> Add</Button>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connections yet.</p>
              ) : (
                <div className="space-y-2">
                  {connections.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate(`/contacts/${c.connected_contact_id}`)}>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{c.first_name} {c.last_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Talent Status */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Target className="h-4 w-4 text-primary" /> Talent Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Job Seeking</Label>
                <Switch checked={jobTag.is_job_seeking} onCheckedChange={(v) => setJobTag((f) => ({ ...f, is_job_seeking: v }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Comment</Label>
                <Textarea value={jobTag.comment} onChange={(e) => setJobTag((f) => ({ ...f, comment: e.target.value }))} rows={2} placeholder="Notes about their job search…" />
              </div>
              <Button size="sm" onClick={handleJobTagSave} className="w-full">Save Talent Status</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
