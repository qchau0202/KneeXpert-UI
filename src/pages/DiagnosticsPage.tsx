import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ZoomIn, ZoomOut, Move, RotateCcw, Check, X, Sun, Contrast, Maximize2, Crosshair, Ruler, Layers, Upload, Image } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockPatients } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { StatusBadge } from "@/components/StatusBadge";

const models = [
  { id: "densenet", name: "DenseNet201", description: "Detailed classification", accuracy: "94.2%" },
  { id: "vit", name: "ViT-B/16", description: "Global context analysis", accuracy: "92.8%" },
  { id: "resnet", name: "ResNet50", description: "Baseline comparison", accuracy: "89.5%" },
];

export default function DiagnosticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient") || "PT-8842";
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];

  const [activeModel, setActiveModel] = useState("densenet");
  const [showGradCAM, setShowGradCAM] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<string>("pan");
  const [overrideGrade, setOverrideGrade] = useState<number | null>(null);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [gradcamOpacity, setGradcamOpacity] = useState(70);
  const [selectedView, setSelectedView] = useState<"ap" | "lateral">("ap");

  const tools = [
    { id: "pan", icon: Move, label: "Pan" },
    { id: "zoom", icon: ZoomIn, label: "Zoom" },
    { id: "measure", icon: Ruler, label: "Measure" },
    { id: "annotate", icon: Crosshair, label: "Annotate" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-screen flex flex-col"
    >
      {/* Top bar */}
      <div className="h-14 border-b flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium">Diagnostic Workspace</h1>
              <span className="text-mono text-xs text-muted-foreground">{patient.id}</span>
            </div>
            <p className="text-xs text-muted-foreground">{patient.name} · {patient.age}yo · {patient.gender} · BMI {patient.bmi}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={patient.status} />
          {patient.grade !== null && (
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-muted-foreground">AI Grade:</span>
              <GradeBadge grade={patient.grade} />
              <ConfidenceGauge value={patient.aiConfidence} />
            </div>
          )}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
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

        {/* Left: Original Image */}
        <div className="flex-1 border-r flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="section-header">Original Scan</span>
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 ml-2">
                <button
                  onClick={() => setSelectedView("ap")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    selectedView === "ap" ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground"
                  }`}
                >
                  AP View
                </button>
                <button
                  onClick={() => setSelectedView("lateral")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    selectedView === "lateral" ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground"
                  }`}
                >
                  Lateral
                </button>
              </div>
            </div>
            <span className="text-mono text-[10px] text-muted-foreground">{zoom}% · {activeTool}</span>
          </div>
          <div className="flex-1 bg-foreground/[0.02] flex items-center justify-center relative overflow-hidden">
            <div
              className="w-80 h-80 rounded-xl bg-foreground/5 border border-dashed border-border flex flex-col items-center justify-center gap-3 transition-transform cursor-grab active:cursor-grabbing"
              style={{ transform: `scale(${zoom / 100})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
            >
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{selectedView === "ap" ? "AP" : "Lateral"} Knee X-ray</p>
                <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to upload</p>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Upload className="w-3 h-3 inline mr-1" />
                Upload DICOM
              </button>
            </div>
          </div>

          {/* Image Controls */}
          <div className="h-12 border-t flex items-center gap-4 px-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="range" min="50" max="150" value={brightness}
                onChange={e => setBrightness(parseInt(e.target.value))}
                className="w-20 accent-primary h-1"
              />
              <span className="text-mono text-[10px] text-muted-foreground w-8">{brightness}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="range" min="50" max="150" value={contrast}
                onChange={e => setContrast(parseInt(e.target.value))}
                className="w-20 accent-primary h-1"
              />
              <span className="text-mono text-[10px] text-muted-foreground w-8">{contrast}%</span>
            </div>
            <button className="ml-auto p-1.5 rounded hover:bg-muted transition-colors" title="Fullscreen">
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Right: AI Output */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="section-header">AI Analysis</span>
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            {/* Model Switcher */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ease-clinical ${
                    activeModel === model.id
                      ? "bg-background text-foreground shadow-ring-light"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-foreground/[0.02] flex items-center justify-center relative">
            <motion.div
              key={activeModel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-80 h-80 rounded-xl bg-foreground/5 border border-dashed border-border flex flex-col items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-xl bg-primary-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 15l4-4 3 3 4-4 7 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Grad-CAM Heatmap</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {models.find(m => m.id === activeModel)?.name} · {models.find(m => m.id === activeModel)?.accuracy}
                </p>
              </div>
            </motion.div>

            {/* Grad-CAM Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-card border">
              <button
                onClick={() => setShowGradCAM(!showGradCAM)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  showGradCAM ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Grad-CAM {showGradCAM ? "On" : "Off"}
              </button>
              {showGradCAM && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Opacity</span>
                  <input
                    type="range" min="10" max="100" value={gradcamOpacity}
                    onChange={e => setGradcamOpacity(parseInt(e.target.value))}
                    className="w-16 accent-primary h-1"
                  />
                  <span className="text-mono text-[10px] text-muted-foreground w-6">{gradcamOpacity}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Model Info */}
          <div className="px-4 py-2 border-t bg-muted/20">
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-muted-foreground">Model: </span>
                <span className="font-medium">{models.find(m => m.id === activeModel)?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Accuracy: </span>
                <span className="font-medium">{models.find(m => m.id === activeModel)?.accuracy}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inference: </span>
                <span className="font-medium">1.2s</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pre-processing: </span>
                <span className="font-medium">CLAHE + Denoise</span>
              </div>
            </div>
          </div>

          {/* Agree/Disagree Controls */}
          <div className="border-t px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">AI Classification: </span>
                <span className="font-medium">Grade {patient.grade ?? "—"} Osteoarthritis</span>
                {patient.aiConfidence && (
                  <span className="text-muted-foreground ml-1">({patient.aiConfidence}%)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-success hover:bg-success hover:text-success-foreground transition-colors">
                  <Check className="w-4 h-4" />
                  Agree
                </button>
                <button
                  onClick={() => setShowOverridePanel(!showOverridePanel)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-warning hover:bg-warning hover:text-warning-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                  Disagree & Override
                </button>
              </div>
            </div>

            {/* Override Panel */}
            {showOverridePanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 p-4 rounded-lg bg-warning/5 border border-warning/20"
              >
                <p className="text-xs font-medium mb-3">Manual Grade Override</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Correct Grade:</span>
                  {[0, 1, 2, 3, 4].map(g => (
                    <button
                      key={g}
                      onClick={() => setOverrideGrade(g)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        overrideGrade === g
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <textarea
                  value={overrideNotes}
                  onChange={e => setOverrideNotes(e.target.value)}
                  placeholder="Clinical reasoning for override (required for retraining data)..."
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <div className="flex justify-end mt-2 gap-2">
                  <button onClick={() => setShowOverridePanel(false)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">Cancel</button>
                  <button className="px-3 py-1.5 text-xs rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors">
                    Submit Override & Flag for Retraining
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
