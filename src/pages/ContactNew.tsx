import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ContactNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    notes: "",
    owner_id: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single()
      .then(({ data }) => {
        if (data) {
          setOrgId(data.organization_id);
          // Load org members for owner dropdown
          supabase.from("organization_members").select("user_id").eq("organization_id", data.organization_id!)
            .then(({ data: mData }) => {
              const ids = (mData ?? []).map((m) => m.user_id).filter(Boolean) as string[];
              if (ids.length) {
                supabase.from("profiles").select("id, full_name").in("id", ids)
                  .then(({ data: pData }) => {
                    setMembers((pData ?? []).map((p) => ({ id: p.id, full_name: p.full_name ?? "Unknown" })));
                    // Default owner to current user
                    if (user && ids.includes(user.id)) {
                      setForm((f) => ({ ...f, owner_id: user.id }));
                    }
                  });
              }
            });
        }
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) { toast({ title: "First name is required", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("contacts").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      job_title: form.job_title.trim() || null,
      notes: form.notes.trim() || null,
      private_school: form.private_school.trim() || null,
      owner_id: form.owner_id || null,
      organization_id: orgId,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contact created" });
      navigate("/contacts");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Add Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input required value={form.first_name} onChange={set("first_name")} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={set("last_name")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set("phone")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={form.job_title} onChange={set("job_title")} />
            </div>
            <div className="space-y-2">
              <Label>Private School</Label>
              <Input value={form.private_school} onChange={set("private_school")} />
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={set("notes")} rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Contact"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/contacts")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
