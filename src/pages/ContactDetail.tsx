import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contact, setContact] = useState<Tables<"contacts"> | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Tables<"contacts">>>({});
  const [roles, setRoles] = useState<Tables<"contact_roles">[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ title: "", company_name: "", start_date: "", end_date: "", is_current: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("contacts").select("*").eq("id", id).single().then(({ data }) => {
      setContact(data);
      if (data) setForm(data);
    });
    supabase.from("contact_roles").select("*").eq("contact_id", id).order("start_date", { ascending: false }).then(({ data }) => setRoles(data ?? []));
  }, [id]);

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
      private_school: form.private_school ?? null,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contact updated" });
    setContact({ ...contact!, ...form } as Tables<"contacts">);
    setEditing(false);
  };

  const handleAddRole = async () => {
    if (!roleForm.title.trim()) return;
    const { data, error } = await supabase.from("contact_roles").insert({
      contact_id: id!,
      title: roleForm.title.trim(),
      company_name: roleForm.company_name.trim() || null,
      start_date: roleForm.start_date || null,
      end_date: roleForm.end_date || null,
      is_current: roleForm.is_current,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) setRoles((prev) => [data, ...prev]);
    setRoleForm({ title: "", company_name: "", start_date: "", end_date: "", is_current: false });
    setShowRoleForm(false);
  };

  if (!contact) return <p className="text-muted-foreground">Loading…</p>;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" onClick={() => navigate("/contacts")} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{contact.first_name} {contact.last_name}</CardTitle>
          {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={form.first_name ?? ""} onChange={set("first_name")} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={form.last_name ?? ""} onChange={set("last_name")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={form.email ?? ""} onChange={set("email")} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={set("phone")} /></div>
              </div>
              <div className="space-y-2"><Label>Job Title</Label><Input value={form.job_title ?? ""} onChange={set("job_title")} /></div>
              <div className="space-y-2"><Label>Private School</Label><Input value={form.private_school ?? ""} onChange={set("private_school")} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={set("notes")} /></div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(contact); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Email", contact.email],
                ["Phone", contact.phone],
                ["Job Title", contact.job_title],
                ["Private School", contact.private_school],
                ["Last Contacted", contact.last_contacted],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-foreground">{(value as string) || "—"}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="mt-1 text-foreground whitespace-pre-wrap">{contact.notes || "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Career History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Career History</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowRoleForm(true)} className="gap-1">
            <Plus className="h-3 w-3" /> Add Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showRoleForm && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Title *</Label><Input value={roleForm.title} onChange={(e) => setRoleForm((f) => ({ ...f, title: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={roleForm.company_name} onChange={(e) => setRoleForm((f) => ({ ...f, company_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={roleForm.start_date} onChange={(e) => setRoleForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="date" value={roleForm.end_date} onChange={(e) => setRoleForm((f) => ({ ...f, end_date: e.target.value }))} disabled={roleForm.is_current} /></div>
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

          {roles.length === 0 && !showRoleForm && (
            <p className="text-sm text-muted-foreground">No career history yet.</p>
          )}

          {roles.map((r) => (
            <div key={r.id} className="flex items-start justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{r.title}</p>
                {r.company_name && <p className="text-sm text-muted-foreground">{r.company_name}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {r.start_date ?? "?"} — {r.is_current ? "Present" : r.end_date ?? "?"}
                </p>
              </div>
              {r.is_current && <Badge>Current</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
