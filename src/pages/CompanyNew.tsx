import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function CompanyNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single()
      .then(({ data }) => setOrgId(data?.organization_id ?? null));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("companies").insert({
      name: form.name.trim(),
      industry: form.industry.trim() || null,
      website: form.website.trim() || null,
      notes: form.notes.trim() || null,
      organization_id: orgId,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Company created" });
      navigate("/companies");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Add Company</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input required value={form.name} onChange={set("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={form.industry} onChange={set("industry")} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={set("website")} placeholder="https://…" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={set("notes")} rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Company"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/companies")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
