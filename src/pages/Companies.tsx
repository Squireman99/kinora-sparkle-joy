import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  contact_count?: number;
  open_role_count?: number;
}

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("companies").select("*").order("name");
      const companyList = (data ?? []) as Company[];

      // Get contact counts per company name
      const { data: contacts } = await supabase.from("contacts").select("company_name");
      const contactCounts: Record<string, number> = {};
      (contacts ?? []).forEach((c: any) => {
        if (c.company_name) {
          contactCounts[c.company_name] = (contactCounts[c.company_name] || 0) + 1;
        }
      });

      // Get open role counts per company
      const companyIds = companyList.map((c) => c.id);
      const roleCounts: Record<string, number> = {};
      if (companyIds.length) {
        const { data: roles } = await supabase
          .from("company_open_roles")
          .select("company_id")
          .in("company_id", companyIds)
          .eq("status", "open");
        (roles ?? []).forEach((r: any) => {
          roleCounts[r.company_id] = (roleCounts[r.company_id] || 0) + 1;
        });
      }

      setCompanies(
        companyList.map((c) => ({
          ...c,
          contact_count: contactCounts[c.name] || 0,
          open_role_count: roleCounts[c.id] || 0,
        }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Companies</h1>
        <Button asChild>
          <Link to="/companies/new"><Plus className="mr-2 h-4 w-4" /> Add Company</Link>
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
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-center">Contacts</TableHead>
                <TableHead className="text-center">Open Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No companies found</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/companies/${c.id}`} className="text-primary hover:underline font-medium">{c.name}</Link>
                    </TableCell>
                    <TableCell>{c.industry || "—"}</TableCell>
                    <TableCell>
                      {c.website ? (
                        <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">{c.website}</a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">{c.contact_count}</TableCell>
                    <TableCell className="text-center">{c.open_role_count}</TableCell>
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
