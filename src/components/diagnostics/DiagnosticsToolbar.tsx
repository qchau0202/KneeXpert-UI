import { Move, ZoomIn, ZoomOut, Ruler, Crosshair, RotateCcw } from "lucide-react";

interface DiagnosticsToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
  setBrightness: (b: number) => void;
  setContrast: (c: number) => void;
}

const tools = [
  { id: "pan", icon: Move, label: "Pan" },
  { id: "zoom", icon: ZoomIn, label: "Zoom" },
  { id: "measure", icon: Ruler, label: "Measure" },
  { id: "annotate", icon: Crosshair, label: "Annotate" },
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
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            activeTool === tool.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
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
      <button
        onClick={() => setZoom(Math.max(50, zoom - 25))}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={() => { setZoom(100); setBrightness(100); setContrast(100); }}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Reset"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
