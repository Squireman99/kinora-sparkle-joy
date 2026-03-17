import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Suggestion } from "@/pages/RelationshipMap";

interface Props extends EdgeProps {
  onConfirm: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
}

export function MapSuggestedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, style, onConfirm, onDismiss,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  const suggestion = data?.suggestion as Suggestion | undefined;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...style, strokeDasharray: "6 3", stroke: "hsl(226 10% 35%)", strokeWidth: 1 }}
      />
      {/* Hit area for hover */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      {/* Label */}
      <foreignObject
        x={labelX - 60}
        y={labelY - 12}
        width={120}
        height={24}
        style={{ overflow: "visible" }}
      >
        <div style={{
          fontSize: 9,
          fontStyle: "italic",
          color: "hsl(226 10% 45%)",
          textAlign: "center",
          background: "hsl(233 30% 4% / 0.8)",
          borderRadius: 4,
          padding: "2px 6px",
          whiteSpace: "nowrap",
        }}>
          Suggested: {suggestion?.reason ?? ""}
        </div>
      </foreignObject>
      {/* Action buttons on hover */}
      {hovered && suggestion && (
        <foreignObject
          x={labelX - 30}
          y={labelY + 14}
          width={60}
          height={28}
          style={{ overflow: "visible" }}
        >
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm(suggestion); }}
              style={{
                background: "hsl(142 71% 45%)",
                border: "none",
                borderRadius: 4,
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Confirm"
            >
              <Check style={{ width: 14, height: 14, color: "white" }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(suggestion); }}
              style={{
                background: "hsl(0 72% 51%)",
                border: "none",
                borderRadius: 4,
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Dismiss"
            >
              <X style={{ width: 14, height: 14, color: "white" }} />
            </button>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
