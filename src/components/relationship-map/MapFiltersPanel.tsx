import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Filter, Sparkles, Briefcase } from "lucide-react";

interface Props {
  relTypes: { id: string; label: string }[];
  maturityLevels: { id: string; label: string; level: number }[];
  filterRelType: string;
  setFilterRelType: (v: string) => void;
  filterMaturity: string;
  setFilterMaturity: (v: string) => void;
  showSuggested: boolean;
  setShowSuggested: (v: boolean) => void;
  showJobSeekingOnly: boolean;
  setShowJobSeekingOnly: (v: boolean) => void;
  suggestionsCount: number;
}

export function MapFiltersPanel({
  relTypes, maturityLevels,
  filterRelType, setFilterRelType,
  filterMaturity, setFilterMaturity,
  showSuggested, setShowSuggested,
  showJobSeekingOnly, setShowJobSeekingOnly,
  suggestionsCount,
}: Props) {
  return (
    <div className="w-64 shrink-0 border-r border-border bg-card p-4 space-y-5 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Relationship Type</label>
        <Select value={filterRelType} onValueChange={setFilterRelType}>
          <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {relTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Maturity Level</label>
        <Select value={filterMaturity} onValueChange={setFilterMaturity}>
          <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {maturityLevels.map(ml => <SelectItem key={ml.id} value={ml.id}>{ml.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground">Suggested</span>
            {suggestionsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{suggestionsCount}</Badge>
            )}
          </div>
          <Switch checked={showSuggested} onCheckedChange={setShowSuggested} className="scale-75" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground">Job Seeking Only</span>
          </div>
          <Switch checked={showJobSeekingOnly} onCheckedChange={setShowJobSeekingOnly} className="scale-75" />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-[3px] rounded bg-primary" />
            <span className="text-[10px] text-muted-foreground">Intimate / Sponsor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-[2px] rounded bg-primary/70" />
            <span className="text-[10px] text-muted-foreground">Trusted / Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-[1px] rounded bg-primary/35" />
            <span className="text-[10px] text-muted-foreground">Introduced / None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-[1px] rounded border-t border-dashed border-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Suggested</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_6px_2px_hsl(45_93%_47%/0.5)]" />
            <span className="text-[10px] text-muted-foreground">Job seeking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-primary" />
            <span className="text-[10px] text-muted-foreground">High maturity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
