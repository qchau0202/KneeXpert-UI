import { Move, ZoomIn, ZoomOut, Ruler, Crosshair, RotateCcw, Pencil, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosticsToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
  setBrightness: (b: number) => void;
  setContrast: (c: number) => void;
  measurements?: { id: string; label: string }[];
  annotations?: { id: string; label: string }[];
}

const tools = [
  { id: "select", icon: MousePointer, label: "Select", desc: "Select and interact" },
  { id: "pan", icon: Move, label: "Pan", desc: "Click and drag to pan" },
  { id: "zoom", icon: ZoomIn, label: "Zoom", desc: "Click to zoom area" },
  { id: "measure", icon: Ruler, label: "Measure", desc: "Click two points to measure distance" },
  { id: "annotate", icon: Crosshair, label: "Annotate", desc: "Click to place a marker" },
  { id: "draw", icon: Pencil, label: "Draw", desc: "Freehand drawing on scan" },
];

export function DiagnosticsToolbar({
  activeTool, setActiveTool, zoom, setZoom, setBrightness, setContrast,
}: DiagnosticsToolbarProps) {
  return (
    <div className="w-12 border-r bg-muted/20 flex flex-col items-center py-3 gap-1">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group",
            activeTool === tool.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {tool.desc}
          </div>
        </button>
      ))}
      <div className="w-6 h-px bg-border my-2" />
      <button
        onClick={() => setZoom(Math.min(200, zoom + 25))}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <span className="text-[9px] text-muted-foreground font-mono">{zoom}%</span>
      <button
        onClick={() => setZoom(Math.max(25, zoom - 25))}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="w-6 h-px bg-border my-2" />
      <button
        onClick={() => { setZoom(100); setBrightness(100); setContrast(100); }}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Reset all adjustments"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
