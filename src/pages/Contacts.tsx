import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Tables<"contacts">[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      setContacts(data ?? []);

      // load owner names
      const ownerIds = [...new Set((data ?? []).map((c) => c.owner_id).filter(Boolean))] as string[];
      if (ownerIds.length) {
        const { data: profileData } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
        const map: Record<string, string> = {};
        (profileData ?? []).forEach((p) => { map[p.id] = p.full_name ?? "Unknown"; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <Button asChild>
          <Link to="/contacts/new"><Plus className="mr-2 h-4 w-4" /> Add Contact</Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Contacted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No contacts found</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => {}}>
                    <TableCell>
                      <Link to={`/contacts/${c.id}`} className="text-primary hover:underline">{c.first_name}</Link>
                    </TableCell>
                    <TableCell>{c.last_name}</TableCell>
                    <TableCell>{c.job_title}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{c.owner_id ? profiles[c.owner_id] ?? "—" : "—"}</TableCell>
                    <TableCell>{c.last_contacted ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
