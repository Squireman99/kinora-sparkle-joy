import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, Briefcase, Building2, Heart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  contact: { id: string; first_name: string; last_name: string | null; job_title: string | null; company_name: string | null };
  maturityInfo: { label: string | null; level: number };
  interests: string[];
  isJobSeeking: boolean;
  onClose: () => void;
}

export function MapContactPanel({ contact, maturityInfo, interests, isJobSeeking, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 top-0 h-full w-80 border-l border-border bg-card shadow-xl z-10 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{contact.first_name} {contact.last_name}</p>
            {isJobSeeking && <Badge className="mt-1 bg-amber-500/20 text-amber-400 text-[10px]">Job Seeking</Badge>}
          </div>
        </div>

        {contact.job_title && (
          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Job Title</p>
              <p className="text-foreground">{contact.job_title}</p>
            </div>
          </div>
        )}

        {contact.company_name && (
          <div className="flex items-start gap-2 text-sm">
            <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="text-foreground">{contact.company_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm">
          <Heart className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">My Maturity Level</p>
            <p className="text-foreground">{maturityInfo.label ?? "Not set"}</p>
          </div>
        </div>

        {interests.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Interests</p>
              <div className="flex flex-wrap gap-1">
                {interests.map(i => <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>)}
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate(`/contacts/${contact.id}`)}>
          Go to Contact
        </Button>
      </div>
    </div>
  );
}
