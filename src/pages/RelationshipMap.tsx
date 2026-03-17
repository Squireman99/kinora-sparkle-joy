import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, User, Briefcase, Building2, Heart } from "lucide-react";

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  company_name: string | null;
}

interface RelRow {
  id: string;
  contact_a_id: string | null;
  contact_b_id: string | null;
  relationship_type_id: string | null;
}

interface RelType {
  id: string;
  label: string;
}

interface MaturityLevel {
  id: string;
  label: string;
  level: number;
}

export default function RelationshipMap() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [rels, setRels] = useState<RelRow[]>([]);
  const [relTypes, setRelTypes] = useState<RelType[]>([]);
  const [maturityLevels, setMaturityLevels] = useState<MaturityLevel[]>([]);
  const [myMaturityMap, setMyMaturityMap] = useState<Record<string, string>>({});
  const [filterRelType, setFilterRelType] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [contactsRes, relsRes, relTypesRes, matLevelsRes, matRes] = await Promise.all([
        supabase.from("contacts").select("id, first_name, last_name, job_title, company_name"),
        supabase.from("relationships").select("id, contact_a_id, contact_b_id, relationship_type_id"),
        supabase.from("relationship_type_taxonomy").select("id, label").order("label"),
        supabase.from("maturity_level_taxonomy").select("id, label, level").order("level"),
        supabase.from("contact_maturity").select("contact_id, maturity_level_id").eq("user_id", user.id),
      ]);
      setContacts((contactsRes.data ?? []) as ContactRow[]);
      setRels((relsRes.data ?? []) as RelRow[]);
      setRelTypes((relTypesRes.data ?? []) as RelType[]);
      setMaturityLevels((matLevelsRes.data ?? []) as MaturityLevel[]);
      const mMap: Record<string, string> = {};
      ((matRes.data ?? []) as { contact_id: string; maturity_level_id: string | null }[]).forEach((m) => {
        if (m.maturity_level_id) mMap[m.contact_id] = m.maturity_level_id;
      });
      setMyMaturityMap(mMap);
    })();
  }, [user]);

  // Build relType map
  const relTypeMap = useMemo(() => Object.fromEntries(relTypes.map((r) => [r.id, r.label])), [relTypes]);

  // Filter edges
  const filteredRels = useMemo(() => {
    if (filterRelType === "all") return rels;
    return rels.filter((r) => r.relationship_type_id === filterRelType);
  }, [rels, filterRelType]);

  // Compute which contact IDs are connected
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRels.forEach((r) => {
      if (r.contact_a_id) ids.add(r.contact_a_id);
      if (r.contact_b_id) ids.add(r.contact_b_id);
    });
    return ids;
  }, [filteredRels]);

  // Build nodes & edges when data changes
  useEffect(() => {
    // Only show contacts that have at least one relationship (when filter active)
    const displayContacts = filterRelType === "all"
      ? contacts
      : contacts.filter((c) => connectedIds.has(c.id));

    // Arrange in a grid
    const cols = Math.max(4, Math.ceil(Math.sqrt(displayContacts.length)));
    const spacingX = 220;
    const spacingY = 100;

    const newNodes: Node[] = displayContacts.map((c, i) => ({
      id: c.id,
      position: { x: (i % cols) * spacingX, y: Math.floor(i / cols) * spacingY },
      data: { label: `${c.first_name} ${c.last_name ?? ""}`.trim() },
      style: {
        background: "hsl(233 25% 8%)",
        color: "hsl(226 20% 88%)",
        border: "1px solid hsl(233 15% 18%)",
        borderRadius: "0.5rem",
        padding: "8px 14px",
        fontSize: "12px",
        fontWeight: 500,
      },
    }));

    const newEdges: Edge[] = filteredRels
      .filter((r) => r.contact_a_id && r.contact_b_id)
      .map((r) => ({
        id: r.id,
        source: r.contact_a_id!,
        target: r.contact_b_id!,
        label: relTypeMap[r.relationship_type_id ?? ""] ?? "",
        labelStyle: { fill: "hsl(226 10% 55%)", fontSize: 10 },
        labelBgStyle: { fill: "hsl(233 30% 4%)", fillOpacity: 0.8 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: "hsl(239 84% 67% / 0.5)" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(239 84% 67% / 0.5)" },
        animated: false,
      }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [contacts, filteredRels, relTypeMap, filterRelType, connectedIds, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const c = contacts.find((ct) => ct.id === node.id) ?? null;
      setSelectedContact(c);
    },
    [contacts],
  );

  const maturityLabel = useMemo(() => {
    if (!selectedContact) return null;
    const mlId = myMaturityMap[selectedContact.id];
    if (!mlId) return null;
    return maturityLevels.find((m) => m.id === mlId)?.label ?? null;
  }, [selectedContact, myMaturityMap, maturityLevels]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Relationship Map</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by type:</span>
          <Select value={filterRelType} onValueChange={setFilterRelType}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {relTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative rounded-lg border border-border overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "hsl(233 30% 4%)" }}
        >
          <Background color="hsl(233 15% 18%)" gap={24} size={1} />
          <Controls
            style={{ background: "hsl(233 25% 8%)", borderColor: "hsl(233 15% 18%)" }}
          />
        </ReactFlow>

        {/* Side panel */}
        {selectedContact && (
          <div className="absolute right-0 top-0 h-full w-80 border-l border-border bg-card shadow-xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedContact(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedContact.first_name} {selectedContact.last_name}</p>
                </div>
              </div>

              {selectedContact.job_title && (
                <div className="flex items-start gap-2 text-sm">
                  <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Job Title</p>
                    <p className="text-foreground">{selectedContact.job_title}</p>
                  </div>
                </div>
              )}

              {selectedContact.company_name && (
                <div className="flex items-start gap-2 text-sm">
                  <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-foreground">{selectedContact.company_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-sm">
                <Heart className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">My Maturity Level</p>
                  <p className="text-foreground">{maturityLabel ?? "Not set"}</p>
                </div>
              </div>

              {/* Show relationships for this contact */}
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Relationships</p>
                {rels
                  .filter((r) => r.contact_a_id === selectedContact.id || r.contact_b_id === selectedContact.id)
                  .map((r) => {
                    const otherId = r.contact_a_id === selectedContact.id ? r.contact_b_id : r.contact_a_id;
                    const other = contacts.find((c) => c.id === otherId);
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        <span className="text-foreground">{other ? `${other.first_name} ${other.last_name ?? ""}` : "?"}</span>
                        <Badge variant="secondary" className="text-xs">{relTypeMap[r.relationship_type_id ?? ""] ?? "—"}</Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
