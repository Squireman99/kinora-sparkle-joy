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
import { useToast } from "@/hooks/use-toast";
import { MapFiltersPanel } from "@/components/relationship-map/MapFiltersPanel";
import { MapContactPanel } from "@/components/relationship-map/MapContactPanel";
import { MapSuggestedEdge } from "@/components/relationship-map/MapSuggestedEdge";

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

interface RelType { id: string; label: string; }
interface MaturityLevel { id: string; label: string; level: number; }
interface InterestRow { contact_id: string; interest_id: string; }
interface CareerRow { contact_id: string; company_name: string | null; }
interface JobSeekingRow { contact_id: string; is_job_seeking: boolean; }
interface DismissedRow { contact_a_id: string; contact_b_id: string; }
interface InterestTaxRow { id: string; label: string; }

export interface Suggestion {
  contactA: string;
  contactB: string;
  reason: string;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export default function RelationshipMap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [rels, setRels] = useState<RelRow[]>([]);
  const [relTypes, setRelTypes] = useState<RelType[]>([]);
  const [maturityLevels, setMaturityLevels] = useState<MaturityLevel[]>([]);
  const [myMaturityMap, setMyMaturityMap] = useState<Record<string, string>>({});
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [interestTax, setInterestTax] = useState<InterestTaxRow[]>([]);
  const [careers, setCareers] = useState<CareerRow[]>([]);
  const [jobSeeking, setJobSeeking] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const [filterRelType, setFilterRelType] = useState<string>("all");
  const [filterMaturity, setFilterMaturity] = useState<string>("all");
  const [showSuggested, setShowSuggested] = useState(true);
  const [showJobSeekingOnly, setShowJobSeekingOnly] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load all data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cRes, rRes, rtRes, mlRes, matRes, intRes, itRes, crRes, jsRes, dRes] = await Promise.all([
        supabase.from("contacts").select("id, first_name, last_name, job_title, company_name"),
        supabase.from("relationships").select("id, contact_a_id, contact_b_id, relationship_type_id"),
        supabase.from("relationship_type_taxonomy").select("id, label").order("label"),
        supabase.from("maturity_level_taxonomy").select("id, label, level").order("level"),
        supabase.from("contact_maturity").select("contact_id, maturity_level_id").eq("user_id", user.id),
        supabase.from("contact_interests").select("contact_id, interest_id"),
        supabase.from("interest_taxonomy").select("id, label"),
        supabase.from("contact_roles").select("contact_id, company_name"),
        supabase.from("job_seeking_tags").select("contact_id, is_job_seeking"),
        supabase.from("dismissed_suggestions").select("contact_a_id, contact_b_id").eq("user_id", user.id),
      ]);
      setContacts((cRes.data ?? []) as ContactRow[]);
      setRels((rRes.data ?? []) as RelRow[]);
      setRelTypes((rtRes.data ?? []) as RelType[]);
      setMaturityLevels((mlRes.data ?? []) as MaturityLevel[]);
      const mMap: Record<string, string> = {};
      ((matRes.data ?? []) as { contact_id: string; maturity_level_id: string | null }[]).forEach(m => {
        if (m.maturity_level_id) mMap[m.contact_id] = m.maturity_level_id;
      });
      setMyMaturityMap(mMap);
      setInterests((intRes.data ?? []) as InterestRow[]);
      setInterestTax((itRes.data ?? []) as InterestTaxRow[]);
      setCareers((crRes.data ?? []) as CareerRow[]);
      const jsMap: Record<string, boolean> = {};
      ((jsRes.data ?? []) as JobSeekingRow[]).forEach(j => { jsMap[j.contact_id] = j.is_job_seeking; });
      setJobSeeking(jsMap);
      const dSet = new Set<string>();
      ((dRes.data ?? []) as DismissedRow[]).forEach(d => dSet.add(pairKey(d.contact_a_id, d.contact_b_id)));
      setDismissed(dSet);
    })();
  }, [user]);

  const relTypeMap = useMemo(() => Object.fromEntries(relTypes.map(r => [r.id, r.label])), [relTypes]);
  const matLevelMap = useMemo(() => Object.fromEntries(maturityLevels.map(m => [m.id, m])), [maturityLevels]);

  // Connection count per contact
  const connectionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    rels.forEach(r => {
      if (r.contact_a_id) counts[r.contact_a_id] = (counts[r.contact_a_id] ?? 0) + 1;
      if (r.contact_b_id) counts[r.contact_b_id] = (counts[r.contact_b_id] ?? 0) + 1;
    });
    return counts;
  }, [rels]);

  // Maturity info helper
  const getMaturityInfo = useCallback((contactId: string) => {
    const mlId = myMaturityMap[contactId];
    if (!mlId) return { label: null, level: 0 };
    const ml = matLevelMap[mlId];
    return ml ? { label: ml.label, level: ml.level } : { label: null, level: 0 };
  }, [myMaturityMap, matLevelMap]);

  // Compute suggestions
  const suggestions = useMemo(() => {
    const existingPairs = new Set<string>();
    rels.forEach(r => {
      if (r.contact_a_id && r.contact_b_id) existingPairs.add(pairKey(r.contact_a_id, r.contact_b_id));
    });

    const suggMap = new Map<string, string>();

    // Same company_name
    const byCompany = new Map<string, string[]>();
    contacts.forEach(c => {
      if (c.company_name) {
        const key = c.company_name.toLowerCase();
        if (!byCompany.has(key)) byCompany.set(key, []);
        byCompany.get(key)!.push(c.id);
      }
    });
    byCompany.forEach(ids => {
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const pk = pairKey(ids[i], ids[j]);
          if (!existingPairs.has(pk) && !dismissed.has(pk)) suggMap.set(pk, "Same company");
        }
    });

    // Overlapping career companies
    const byCareer = new Map<string, string[]>();
    careers.forEach(cr => {
      if (cr.company_name && cr.contact_id) {
        const key = cr.company_name.toLowerCase();
        if (!byCareer.has(key)) byCareer.set(key, []);
        if (!byCareer.get(key)!.includes(cr.contact_id)) byCareer.get(key)!.push(cr.contact_id);
      }
    });
    byCareer.forEach(ids => {
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const pk = pairKey(ids[i], ids[j]);
          if (!existingPairs.has(pk) && !dismissed.has(pk) && !suggMap.has(pk)) suggMap.set(pk, "Career overlap");
        }
    });

    // 3+ shared interests
    const contactInterests = new Map<string, Set<string>>();
    interests.forEach(ci => {
      if (!contactInterests.has(ci.contact_id)) contactInterests.set(ci.contact_id, new Set());
      contactInterests.get(ci.contact_id)!.add(ci.interest_id);
    });
    const cIds = Array.from(contactInterests.keys());
    for (let i = 0; i < cIds.length; i++)
      for (let j = i + 1; j < cIds.length; j++) {
        const pk = pairKey(cIds[i], cIds[j]);
        if (existingPairs.has(pk) || dismissed.has(pk) || suggMap.has(pk)) continue;
        const sA = contactInterests.get(cIds[i])!;
        const sB = contactInterests.get(cIds[j])!;
        let overlap = 0;
        sA.forEach(x => { if (sB.has(x)) overlap++; });
        if (overlap >= 3) suggMap.set(pk, `${overlap} shared interests`);
      }

    const result: Suggestion[] = [];
    suggMap.forEach((reason, key) => {
      const [a, b] = key.split("|");
      result.push({ contactA: a, contactB: b, reason });
    });
    return result;
  }, [contacts, rels, careers, interests, dismissed]);

  // Edge styling based on maturity
  const getEdgeStyle = useCallback((contactAId: string, contactBId: string) => {
    const mA = getMaturityInfo(contactAId);
    const mB = getMaturityInfo(contactBId);
    const maxLevel = Math.max(mA.level, mB.level);
    // level 5-6 = thick bright, 3-4 = medium, 0-2 = thin faint
    if (maxLevel >= 5) return { strokeWidth: 3, stroke: "hsl(239 84% 67%)", opacity: 1 };
    if (maxLevel >= 3) return { strokeWidth: 2, stroke: "hsl(239 84% 67% / 0.7)", opacity: 0.8 };
    return { strokeWidth: 1, stroke: "hsl(239 84% 67% / 0.35)", opacity: 0.6 };
  }, [getMaturityInfo]);

  // Confirm a suggestion
  const handleConfirm = useCallback(async (s: Suggestion) => {
    if (!user) return;
    // Get user's org
    const { data: orgData } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) return;
    const { error } = await supabase.from("relationships").insert({
      contact_a_id: s.contactA,
      contact_b_id: s.contactB,
      organization_id: orgData.organization_id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Reload rels
    const { data } = await supabase.from("relationships").select("id, contact_a_id, contact_b_id, relationship_type_id");
    setRels((data ?? []) as RelRow[]);
    toast({ title: "Connection confirmed" });
  }, [user, toast]);

  // Dismiss a suggestion
  const handleDismiss = useCallback(async (s: Suggestion) => {
    if (!user) return;
    const [a, b] = s.contactA < s.contactB ? [s.contactA, s.contactB] : [s.contactB, s.contactA];
    await supabase.from("dismissed_suggestions").insert({ user_id: user.id, contact_a_id: a, contact_b_id: b });
    setDismissed(prev => new Set(prev).add(pairKey(a, b)));
  }, [user]);

  // Build nodes & edges
  useEffect(() => {
    // Filter contacts
    let displayContacts = contacts;
    if (showJobSeekingOnly) displayContacts = displayContacts.filter(c => jobSeeking[c.id]);

    // Filter confirmed rels
    let filteredRels = rels;
    if (filterRelType !== "all") filteredRels = filteredRels.filter(r => r.relationship_type_id === filterRelType);
    if (filterMaturity !== "all") {
      filteredRels = filteredRels.filter(r => {
        const mA = myMaturityMap[r.contact_a_id ?? ""];
        const mB = myMaturityMap[r.contact_b_id ?? ""];
        return mA === filterMaturity || mB === filterMaturity;
      });
    }

    // Node sizing
    const maxConn = Math.max(1, ...Object.values(connectionCount));

    const cols = Math.max(4, Math.ceil(Math.sqrt(displayContacts.length)));
    const spacingX = 250;
    const spacingY = 120;

    const newNodes: Node[] = displayContacts.map((c, i) => {
      const conn = connectionCount[c.id] ?? 0;
      const sizeScale = 0.7 + (conn / maxConn) * 0.6;
      const isJobSeeking = jobSeeking[c.id] === true;
      const mat = getMaturityInfo(c.id);
      const isHighMaturity = mat.label === "Intimate" || mat.label === "Sponsor";

      let boxShadow = "none";
      if (isJobSeeking && isHighMaturity) boxShadow = "0 0 12px 3px hsl(45 93% 47% / 0.5), 0 0 0 2px hsl(239 84% 67%)";
      else if (isJobSeeking) boxShadow = "0 0 12px 3px hsl(45 93% 47% / 0.5)";
      else if (isHighMaturity) boxShadow = "0 0 0 2px hsl(239 84% 67%)";

      return {
        id: c.id,
        position: { x: (i % cols) * spacingX, y: Math.floor(i / cols) * spacingY },
        data: { label: `${c.first_name} ${c.last_name ?? ""}`.trim(), company: c.company_name ?? "" },
        style: {
          background: "hsl(233 25% 8%)",
          color: "hsl(226 20% 88%)",
          border: "1px solid hsl(233 15% 18%)",
          borderRadius: "0.5rem",
          padding: `${8 * sizeScale}px ${14 * sizeScale}px`,
          fontSize: `${12 * sizeScale}px`,
          fontWeight: 500,
          boxShadow,
          minWidth: `${100 * sizeScale}px`,
        },
      };
    });

    // Confirmed edges
    const newEdges: Edge[] = filteredRels
      .filter(r => r.contact_a_id && r.contact_b_id)
      .map(r => {
        const style = getEdgeStyle(r.contact_a_id!, r.contact_b_id!);
        return {
          id: r.id,
          source: r.contact_a_id!,
          target: r.contact_b_id!,
          label: relTypeMap[r.relationship_type_id ?? ""] ?? "",
          labelStyle: { fill: "hsl(226 10% 55%)", fontSize: 10 },
          labelBgStyle: { fill: "hsl(233 30% 4%)", fillOpacity: 0.8 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          style: { stroke: style.stroke, strokeWidth: style.strokeWidth, opacity: style.opacity },
          markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
          animated: false,
        };
      });

    // Suggested edges
    if (showSuggested) {
      const contactIds = new Set(displayContacts.map(c => c.id));
      suggestions.forEach((s, idx) => {
        if (!contactIds.has(s.contactA) || !contactIds.has(s.contactB)) return;
        newEdges.push({
          id: `suggestion-${idx}`,
          source: s.contactA,
          target: s.contactB,
          label: `Suggested: ${s.reason}`,
          labelStyle: { fill: "hsl(226 10% 45%)", fontSize: 9, fontStyle: "italic" },
          labelBgStyle: { fill: "hsl(233 30% 4%)", fillOpacity: 0.8 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          style: { stroke: "hsl(226 10% 35%)", strokeWidth: 1, strokeDasharray: "6 3" },
          animated: false,
          data: { suggestion: s },
          type: "suggestedEdge",
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [contacts, rels, relTypeMap, filterRelType, filterMaturity, showSuggested, showJobSeekingOnly, connectionCount, getEdgeStyle, myMaturityMap, jobSeeking, getMaturityInfo, suggestions, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedContact(contacts.find(c => c.id === node.id) ?? null);
  }, [contacts]);

  // Contact interests for side panel
  const selectedContactInterests = useMemo(() => {
    if (!selectedContact) return [];
    return interests
      .filter(i => i.contact_id === selectedContact.id)
      .map(i => interestTax.find(t => t.id === i.interest_id)?.label)
      .filter(Boolean) as string[];
  }, [selectedContact, interests, interestTax]);

  const edgeTypes = useMemo(() => ({
    suggestedEdge: (props: any) => (
      <MapSuggestedEdge {...props} onConfirm={handleConfirm} onDismiss={handleDismiss} />
    ),
  }), [handleConfirm, handleDismiss]);

  const nodeLabel = useCallback((node: Node) => {
    const data = node.data as { label: string; company: string };
    return (
      <div className="text-center">
        <div>{data.label}</div>
        {data.company && <div style={{ fontSize: "0.75em", opacity: 0.6 }}>{data.company}</div>}
      </div>
    );
  }, []);

  // Override default node rendering by setting labels
  const renderedNodes = useMemo(() => nodes.map(n => ({
    ...n,
    data: { ...n.data, label: nodeLabel(n) },
  })), [nodes, nodeLabel]);

  return (
    <div className="flex gap-0 h-[calc(100vh-80px)]">
      {/* Filters Panel */}
      <MapFiltersPanel
        relTypes={relTypes}
        maturityLevels={maturityLevels}
        filterRelType={filterRelType}
        setFilterRelType={setFilterRelType}
        filterMaturity={filterMaturity}
        setFilterMaturity={setFilterMaturity}
        showSuggested={showSuggested}
        setShowSuggested={setShowSuggested}
        showJobSeekingOnly={showJobSeekingOnly}
        setShowJobSeekingOnly={setShowJobSeekingOnly}
        suggestionsCount={suggestions.length}
      />

      {/* Map */}
      <div className="relative flex-1 rounded-lg border border-border overflow-hidden">
        <ReactFlow
          nodes={renderedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "hsl(233 30% 4%)" }}
        >
          <Background color="hsl(233 15% 18%)" gap={24} size={1} />
          <Controls style={{ background: "hsl(233 25% 8%)", borderColor: "hsl(233 15% 18%)" }} />
        </ReactFlow>

        {/* Contact Side Panel */}
        {selectedContact && (
          <MapContactPanel
            contact={selectedContact}
            maturityInfo={getMaturityInfo(selectedContact.id)}
            interests={selectedContactInterests}
            isJobSeeking={jobSeeking[selectedContact.id] === true}
            onClose={() => setSelectedContact(null)}
          />
        )}
      </div>
    </div>
  );
}
