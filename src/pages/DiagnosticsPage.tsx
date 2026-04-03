import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Sun, Contrast, Maximize2, Layers, Upload, Image, FileImage,
  Loader2, CheckCircle2, Brain, Sparkles, AlertTriangle, User, Calendar,
  ChevronRight, Search, SlidersHorizontal, Clock, Scan
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { mockPatients, type Patient, type Modality } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticsToolbar } from "@/components/diagnostics/DiagnosticsToolbar";
import { MriPipelinePanel } from "@/components/diagnostics/MriPipelinePanel";
import { cn } from "@/lib/utils";

// --- Constants ---
const xrayModels = [
  { id: "ensemble", name: "Ensemble (Majority Vote)", description: "ResNet50 + DenseNet201 + VGG-19", accuracy: "95.1%" },
  { id: "densenet", name: "DenseNet201", description: "Detailed classification", accuracy: "94.2%" },
  { id: "vit", name: "ViT-B/16", description: "Global context analysis", accuracy: "92.8%" },
  { id: "resnet", name: "ResNet50", description: "Baseline comparison", accuracy: "89.5%" },
];
const mriModels = [
  { id: "swin-densenet", name: "Swin-UNet + DenseNet201", description: "Artifact removal + classification", accuracy: "93.5%" },
  { id: "swin-vit", name: "Swin-UNet + ViT-B/16", description: "Artifact removal + global analysis", accuracy: "91.7%" },
  { id: "swin-resnet", name: "Swin-UNet + ResNet50", description: "Artifact removal + baseline", accuracy: "88.2%" },
];
const xrayViews = ["AP", "Lateral"];
const mriViews = ["Sagittal", "Coronal", "Axial"];

type DiagnosticStage = "idle" | "uploading" | "preprocessing" | "artifact-removal" | "inference" | "gradcam" | "complete";

const xrayStages: { id: DiagnosticStage; label: string; duration: number }[] = [
  { id: "uploading", label: "Uploading DICOM file...", duration: 1200 },
  { id: "preprocessing", label: "Pre-processing: CLAHE + Denoise + Normalization", duration: 1800 },
  { id: "inference", label: "Running Ensemble Inference (ResNet50 + DenseNet201 + VGG-19)", duration: 2500 },
  { id: "gradcam", label: "Generating Grad-CAM heatmap...", duration: 1200 },
  { id: "complete", label: "Analysis complete", duration: 0 },
];
const mriStages: { id: DiagnosticStage; label: string; duration: number }[] = [
  { id: "uploading", label: "Uploading MRI DICOM file...", duration: 1500 },
  { id: "preprocessing", label: "Pre-processing: Normalization + Quality Check", duration: 1500 },
  { id: "artifact-removal", label: "Stage 2: Swin-UNet Artifact Removal (KMAR-50K)", duration: 2500 },
  { id: "inference", label: "Stage 3: Downstream Classification on Cleaned Data", duration: 2200 },
  { id: "gradcam", label: "Generating Grad-CAM heatmap...", duration: 1200 },
  { id: "complete", label: "Analysis complete", duration: 0 },
];

const mockResults = {
  xray: { grade: 3, confidence: 94.2, findings: ["Joint space narrowing (medial compartment)", "Osteophyte formation (tibial plateau)", "Subchondral sclerosis detected"] },
  mri: { grade: 2, confidence: 87.6, findings: ["Cartilage thinning (medial femoral condyle)", "Mild meniscal degeneration", "No significant effusion"] },
};

// ============================================================
// Phase 1 — Patient Selector (clean card-based layout)
// ============================================================
function PatientSelector({ onSelect }: { onSelect: (p: Patient) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "pain">("date");

  const filtered = useMemo(() => {
    let list = [...mockPatients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (modalityFilter !== "all") list = list.filter(p => p.modality === modalityFilter);
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "pain") return b.painLevel - a.painLevel;
      return b.lastVisit.localeCompare(a.lastVisit);
    });
    return list;
  }, [search, statusFilter, modalityFilter, sortBy]);

  const statusOptions = ["all", "pending", "analyzed", "confirmed", "flagged"];
  const urgentCount = mockPatients.filter(p => p.status === "flagged" || p.painLevel >= 7).length;
  const pendingCount = mockPatients.filter(p => p.status === "pending").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Diagnostic Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select a patient to begin AI-assisted diagnosis</p>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {urgentCount} urgent
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} pending
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Status pills */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {statusOptions.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                  statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          {/* Modality pills */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {["all", "xray", "mri"].map(m => (
              <button
                key={m}
                onClick={() => setModalityFilter(m)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  modalityFilter === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "all" ? "All Types" : m === "xray" ? "X-Ray" : "MRI"}
              </button>
            ))}
          </div>
          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-muted rounded-lg px-2.5 py-1.5 text-xs border-0 focus:outline-none cursor-pointer"
            >
              <option value="date">Latest Visit</option>
              <option value="name">Name A-Z</option>
              <option value="pain">Pain Level</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">{filtered.length} patient{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Patient Cards */}
        <div className="space-y-2">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{p.id}</span>
                    <StatusBadge status={p.status} />
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                      {p.modality === "xray" ? "X-Ray" : "MRI"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>{p.age}yo · {p.gender}</span>
                    <span>BMI {p.bmi}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.lastVisit}</span>
                  </div>
                </div>

                {/* Right side metrics */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  {/* Pain bar */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Pain</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={cn("w-1 h-3 rounded-sm", i < p.painLevel ? (p.painLevel >= 7 ? "bg-destructive" : p.painLevel >= 4 ? "bg-warning" : "bg-success") : "bg-muted")} />
                      ))}
                    </div>
                  </div>
                  {p.grade !== null && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Grade</span>
                      <GradeBadge grade={p.grade} />
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>

              {/* Bottom details */}
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="truncate flex-1"><span className="text-foreground/60">Symptoms:</span> {p.symptoms}</span>
                <span className="flex-shrink-0">{p.scans.length} scan{p.scans.length !== 1 ? "s" : ""}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Search className="w-8 h-8" />
              <p className="text-sm">No patients match your filters</p>
              <button onClick={() => { setSearch(""); setStatusFilter("all"); setModalityFilter("all"); }} className="text-xs text-primary hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Phase 2 — Diagnostic Workspace (scrollable, organized)
// ============================================================
function DiagnosticWorkspace({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [activeModality, setActiveModality] = useState<Modality>(patient.modality);
  const models = activeModality === "xray" ? xrayModels : mriModels;
  const views = activeModality === "xray" ? xrayViews : mriViews;

  const [activeModel, setActiveModel] = useState(models[0].id);
  const [showGradCAM, setShowGradCAM] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState("select");
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [measurements, setMeasurements] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<{ id: string; x: number; y: number; label: string }[]>([]);
  const [drawingPaths, setDrawingPaths] = useState<{ id: string; points: { x: number; y: number }[]; color: string; size: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawPath, setCurrentDrawPath] = useState<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState("#ef4444");
  const [drawSize, setDrawSize] = useState(2);

  const penColors = [
    { id: "red", value: "#ef4444", label: "Red" },
    { id: "blue", value: "#3b82f6", label: "Blue" },
    { id: "green", value: "#22c55e", label: "Green" },
    { id: "yellow", value: "#eab308", label: "Yellow" },
    { id: "orange", value: "#f97316", label: "Orange" },
    { id: "purple", value: "#a855f7", label: "Purple" },
    { id: "cyan", value: "#06b6d4", label: "Cyan" },
    { id: "white", value: "#ffffff", label: "White" },
  ];
  const [overrideGrade, setOverrideGrade] = useState<number | null>(null);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [gradcamOpacity, setGradcamOpacity] = useState(70);
  const [selectedView, setSelectedView] = useState(views[0]);
  const [diagnosticStage, setDiagnosticStage] = useState<DiagnosticStage>("idle");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stagesCompleted, setStagesCompleted] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const toolCursor = activeTool === "pan" ? (isPanning ? "grabbing" : "grab") 
    : activeTool === "zoom" ? "zoom-in" 
    : activeTool === "measure" ? "crosshair" 
    : activeTool === "annotate" ? "crosshair" 
    : activeTool === "draw" ? "crosshair" 
    : "default";

  const currentScan = patient.scans.find(s => s.modality === activeModality && s.view === selectedView) || patient.scans[0];
  const stages = activeModality === "xray" ? xrayStages : mriStages;
  const result = mockResults[activeModality];

  const handleModalitySwitch = (mod: Modality) => {
    setActiveModality(mod);
    const newModels = mod === "xray" ? xrayModels : mriModels;
    setActiveModel(newModels[0].id);
    setSelectedView(mod === "xray" ? xrayViews[0] : mriViews[0]);
    setDiagnosticStage("idle");
    setStagesCompleted([]);
    setCurrentStageIndex(0);
  };

  const startDiagnosticFlow = useCallback((fileName: string) => {
    setUploadedFileName(fileName);
    setDiagnosticStage("uploading");
    setCurrentStageIndex(0);
    setStagesCompleted([]);
    setUploadProgress(0);
  }, []);

  useEffect(() => {
    if (diagnosticStage === "idle" || diagnosticStage === "complete") return;
    const currentStage = stages[currentStageIndex];
    if (!currentStage) return;
    if (currentStage.id === "uploading") {
      const interval = setInterval(() => {
        setUploadProgress(prev => prev >= 100 ? (clearInterval(interval), 100) : prev + Math.random() * 15 + 5);
      }, 200);
      const timer = setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setStagesCompleted(prev => [...prev, currentStage.id]);
        setCurrentStageIndex(prev => prev + 1);
        if (currentStageIndex + 1 < stages.length) setDiagnosticStage(stages[currentStageIndex + 1].id);
      }, currentStage.duration);
      return () => { clearInterval(interval); clearTimeout(timer); };
    }
    if (currentStage.id === "complete") { setDiagnosticStage("complete"); return; }
    const timer = setTimeout(() => {
      setStagesCompleted(prev => [...prev, currentStage.id]);
      setCurrentStageIndex(prev => prev + 1);
      if (currentStageIndex + 1 < stages.length) setDiagnosticStage(stages[currentStageIndex + 1].id);
    }, currentStage.duration);
    return () => clearTimeout(timer);
  }, [diagnosticStage, currentStageIndex, stages]);

  const handleFileSelect = () => fileInputRef.current?.click();
  const processFile = (file: File) => {
    startDiagnosticFlow(file.name);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const resetDiagnostic = () => { setDiagnosticStage("idle"); setStagesCompleted([]); setCurrentStageIndex(0); setUploadProgress(0); setUploadedFileName(""); setMeasurements([]); setAnnotations([]); setDrawingPaths([]); setCurrentDrawPath([]); setPanOffset({ x: 0, y: 0 }); setZoom(100); if (uploadedImageUrl) { URL.revokeObjectURL(uploadedImageUrl); setUploadedImageUrl(null); } };

  const isProcessing = diagnosticStage !== "idle" && diagnosticStage !== "complete";

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = zoom / 100;
    // Center of container
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    // Mouse position relative to container
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Reverse the transform: translate then scale from center
    const imgX = ((mx - cx - panOffset.x / 4) / scale + cx) / rect.width * 100;
    const imgY = ((my - cy - panOffset.y / 4) / scale + cy) / rect.height * 100;
    return { x: imgX, y: imgY };
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (activeTool === "draw" && diagnosticStage === "complete") {
      setIsDrawing(true);
      const pos = getRelativePos(e);
      setCurrentDrawPath([pos]);
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (activeTool === "pan" && isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (activeTool === "draw" && isDrawing) {
      const pos = getRelativePos(e);
      setCurrentDrawPath(prev => [...prev, pos]);
    }
  };

  const handleImageMouseUp = () => {
    if (activeTool === "pan") setIsPanning(false);
    if (activeTool === "draw" && isDrawing) {
      setIsDrawing(false);
      if (currentDrawPath.length > 1) {
        setDrawingPaths(prev => [...prev, { id: `d${Date.now()}`, points: currentDrawPath, color: drawColor, size: drawSize }]);
      }
      setCurrentDrawPath([]);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (diagnosticStage !== "complete") return;
    const pos = getRelativePos(e);
    if (activeTool === "zoom") {
      setZoom(prev => Math.min(200, prev + 25));
    } else if (activeTool === "measure") {
      if (!measureStart) {
        setMeasureStart(pos);
      } else {
        const dist = Math.sqrt(Math.pow(pos.x - measureStart.x, 2) + Math.pow(pos.y - measureStart.y, 2));
        setMeasurements(prev => [...prev, { id: `m${Date.now()}`, x1: measureStart.x, y1: measureStart.y, x2: pos.x, y2: pos.y }]);
        setMeasureStart(null);
      }
    } else if (activeTool === "annotate") {
      const label = `A${annotations.length + 1}`;
      setAnnotations(prev => [...prev, { id: `a${Date.now()}`, x: pos.x, y: pos.y, label }]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky top bar */}
      <div className="border-b bg-background sticky top-0 z-10 flex-shrink-0">
        <div className="h-12 flex items-center justify-between px-4 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{patient.name}</span>
                <span className="text-mono text-xs text-muted-foreground hidden sm:inline">{patient.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Modality toggle */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <button onClick={() => handleModalitySwitch("xray")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", activeModality === "xray" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>X-Ray</button>
              <button onClick={() => handleModalitySwitch("mri")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", activeModality === "mri" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>MRI</button>
            </div>
            <StatusBadge status={diagnosticStage === "complete" ? "analyzed" : patient.status} />
          </div>
        </div>
        {/* Patient info strip */}
        <div className="px-4 sm:px-5 py-1.5 border-t bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground overflow-x-auto">
          <span className="flex items-center gap-1 flex-shrink-0"><User className="w-3 h-3" />{patient.age}yo · {patient.gender}</span>
          <span className="flex-shrink-0">BMI {patient.bmi}</span>
          <span className="flex-shrink-0">Pain {patient.painLevel}/10</span>
          <span className="flex items-center gap-1 flex-shrink-0"><Calendar className="w-3 h-3" />{patient.lastVisit}</span>
          <span className="hidden md:inline truncate">{patient.history}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {/* Image workspace */}
        <div className="flex flex-col lg:flex-row">
          {/* Tools — horizontal on mobile via DiagnosticsToolbar, vertical on desktop */}
          <DiagnosticsToolbar activeTool={activeTool} setActiveTool={setActiveTool} zoom={zoom} setZoom={setZoom} setBrightness={setBrightness} setContrast={setContrast} />

          {/* Original scan panel */}
          <div className="flex-1 border-r border-b flex flex-col">
            <div className="h-10 border-b flex items-center justify-between px-4 flex-shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="section-header text-[10px]">Original Scan</span>
                <div className="flex items-center gap-0.5 bg-background rounded-md p-0.5 border">
                  {views.map(view => (
                    <button key={view} onClick={() => setSelectedView(view)} className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all", selectedView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{view}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {diagnosticStage !== "idle" && (
                  <button onClick={resetDiagnostic} className="text-[10px] text-destructive hover:underline">Reset</button>
                )}
                <span className="text-mono text-[10px] text-muted-foreground">{zoom}%</span>
              </div>
            </div>

            {/* Image area */}
            <div
              ref={imageContainerRef}
              className={cn("aspect-square max-h-[500px] bg-foreground/[0.02] flex items-center justify-center relative overflow-hidden transition-colors", isDragging && "bg-primary/5 ring-2 ring-primary/30 ring-inset")}
              style={{ cursor: toolCursor }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onMouseDown={handleImageMouseDown}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleImageMouseUp}
              onMouseLeave={handleImageMouseUp}
              onClick={handleImageClick}
            >
              <input ref={fileInputRef} type="file" accept=".dcm,.dicom,.jpg,.jpeg,.png,.nii,.nii.gz" className="hidden" onChange={handleFileChange} />

              <AnimatePresence mode="wait">
                {diagnosticStage === "idle" ? (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-64 h-64 sm:w-72 sm:h-72 rounded-xl bg-foreground/5 border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer"
                    style={{ transform: `scale(${zoom / 100})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                    onClick={(e) => { e.stopPropagation(); handleFileSelect(); }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                      <Image className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-medium">{selectedView} {activeModality === "xray" ? "X-Ray" : "MRI"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">DICOM, JPEG, PNG{activeModality === "mri" ? ", NIfTI" : ""}</p>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors mt-1">
                      <Upload className="w-3 h-3 inline mr-1" />Upload
                    </button>
                  </motion.div>
                ) : diagnosticStage === "complete" ? (
                  <motion.div key="result-image" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="w-full h-full relative"
                    style={{ transform: `scale(${zoom / 100}) translate(${panOffset.x / 4}px, ${panOffset.y / 4}px)`, filter: `brightness(${brightness}%) contrast(${contrast}%)`, transformOrigin: "center center" }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Uploaded scan" className="w-full h-full object-contain" draggable={false} />
                      ) : (
                        <div className="w-full h-full bg-foreground/[0.08]" />
                      )}
                    </div>

                    {/* Measurement overlays — inside transform container so they follow zoom/pan */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      {measurements.map(m => (
                        <g key={m.id}>
                          <line x1={`${m.x1}%`} y1={`${m.y1}%`} x2={`${m.x2}%`} y2={`${m.y2}%`} stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 2" />
                          <circle cx={`${m.x1}%`} cy={`${m.y1}%`} r="3" fill="hsl(var(--primary))" />
                          <circle cx={`${m.x2}%`} cy={`${m.y2}%`} r="3" fill="hsl(var(--primary))" />
                          <text x={`${(m.x1 + m.x2) / 2}%`} y={`${(m.y1 + m.y2) / 2 - 2}%`} fill="hsl(var(--primary))" fontSize="10" textAnchor="middle" fontWeight="600">
                            {Math.round(Math.sqrt(Math.pow(m.x2 - m.x1, 2) + Math.pow(m.y2 - m.y1, 2)) * 2.5)}mm
                          </text>
                        </g>
                      ))}
                      {measureStart && (
                        <circle cx={`${measureStart.x}%`} cy={`${measureStart.y}%`} r="4" fill="hsl(var(--primary))" opacity="0.7">
                          <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </svg>

                    {/* Drawing overlays — inside transform container */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {drawingPaths.map(dp => (
                        <polyline key={dp.id} points={dp.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={dp.color} strokeWidth={dp.size * 0.15} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      ))}
                      {currentDrawPath.length > 1 && (
                        <polyline points={currentDrawPath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={drawColor} strokeWidth={drawSize * 0.15} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" vectorEffect="non-scaling-stroke" />
                      )}
                    </svg>

                    {/* Pen options floating panel */}
                    {activeTool === "draw" && diagnosticStage === "complete" && (
                      <div className="absolute top-3 left-3 z-30 bg-background/95 backdrop-blur-sm border rounded-xl p-2.5 shadow-lg space-y-2 w-[160px]">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pen Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {penColors.map(c => (
                            <button
                              key={c.id}
                              onClick={(e) => { e.stopPropagation(); setDrawColor(c.value); }}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", drawColor === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105")}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Size · {drawSize}px</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: drawColor }} />
                          <input
                            type="range" min="1" max="10" value={drawSize}
                            onChange={e => { e.stopPropagation(); setDrawSize(parseInt(e.target.value)); }}
                            className="flex-1 accent-primary h-1 cursor-pointer"
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="rounded-full" style={{ backgroundColor: drawColor, width: `${Math.max(drawSize * 1.5, 4)}px`, height: `${Math.max(drawSize * 1.5, 4)}px` }} />
                        </div>
                      </div>
                    )}

                    {/* Annotation overlays — inside transform container */}
                    {annotations.map(a => (
                      <div key={a.id} className="absolute z-20 pointer-events-none" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%, -50%)" }}>
                        <div className="w-5 h-5 rounded-full bg-warning border-2 border-warning-foreground flex items-center justify-center">
                          <span className="text-[8px] font-bold text-warning-foreground">{a.label}</span>
                        </div>
                      </div>
                    ))}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                      <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded truncate">{uploadedFileName}</span>
                      <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded">{selectedView}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="w-72 sm:w-80 p-5 rounded-xl bg-background border shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <p className="text-sm font-medium">Processing {activeModality === "xray" ? "X-Ray" : "MRI"}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
                      <FileImage className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{uploadedFileName}</span>
                    </div>
                    <div className="space-y-2.5">
                      {stages.map((stage, i) => {
                        const isCompleted = stagesCompleted.includes(stage.id);
                        const isCurrent = i === currentStageIndex && diagnosticStage !== ("complete" as DiagnosticStage);
                        return (
                          <div key={stage.id} className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex-shrink-0">
                              {isCompleted ? <CheckCircle2 className="w-4 h-4 text-success" /> : isCurrent ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs leading-relaxed", isCurrent ? "text-foreground font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/40")}>{stage.label}</p>
                              {isCurrent && stage.id === "uploading" && (
                                <div className="mt-1">
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
                                  </div>
                                </div>
                              )}
                              {isCurrent && stage.id === "inference" && (
                                <div className="mt-1 flex items-center gap-1"><Brain className="w-3 h-3 text-primary animate-pulse" /><span className="text-[10px] text-primary">Voting in progress...</span></div>
                              )}
                              {isCurrent && stage.id === "artifact-removal" && (
                                <div className="mt-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary animate-pulse" /><span className="text-[10px] text-primary">Removing artifacts...</span></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Image controls bar */}
            <div className="h-10 border-t flex items-center gap-3 px-4 bg-muted/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(parseInt(e.target.value))} className="w-16 accent-primary h-1" />
              </div>
              <div className="flex items-center gap-2">
                <Contrast className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(parseInt(e.target.value))} className="w-16 accent-primary h-1" />
              </div>
              <button className="ml-auto p-1 rounded hover:bg-muted transition-colors" title="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* AI Analysis panel */}
          <div className="flex-1 flex flex-col border-b">
            <div className="h-10 border-b flex items-center justify-between px-4 flex-shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="section-header text-[10px]">AI Analysis</span>
                {diagnosticStage === "complete" && activeModality === "mri" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Artifact-Free</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 bg-background rounded-md p-0.5 border overflow-x-auto max-w-[280px]">
                {models.map(model => (
                  <button key={model.id} onClick={() => setActiveModel(model.id)}
                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all whitespace-nowrap flex-shrink-0", activeModel === model.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {model.name.length > 18 ? model.name.split(" ").slice(0, 2).join(" ") : model.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grad-CAM area */}
            <div className="aspect-square max-h-[500px] bg-foreground/[0.02] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {diagnosticStage === "complete" ? (
                  <motion.div key="gradcam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative overflow-hidden">
                    <div className="absolute inset-0">
                      {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Scan with Grad-CAM overlay" className="w-full h-full object-contain" draggable={false} />
                      ) : (
                        <div className="w-full h-full bg-foreground/[0.08]" />
                      )}
                    </div>
                    {showGradCAM && (
                      <div className="absolute inset-0" style={{ opacity: gradcamOpacity / 100 }}>
                        <div className="absolute top-1/4 left-1/3 w-32 h-24 rounded-full bg-gradient-radial from-red-500/60 via-yellow-500/30 to-transparent blur-lg" />
                        <div className="absolute top-1/2 left-1/4 w-20 h-16 rounded-full bg-gradient-radial from-orange-500/40 via-yellow-500/20 to-transparent blur-md" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                      <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded font-medium">Grad-CAM</span>
                      <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">Grade {result.grade} · {result.confidence}%</span>
                    </div>
                  </motion.div>
                ) : isProcessing ? (
                  <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Analyzing...</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="w-64 h-64 sm:w-72 sm:h-72 rounded-xl bg-foreground/5 border border-dashed flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Layers className="w-7 h-7 text-primary/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Grad-CAM heatmap</p>
                    <p className="text-xs text-muted-foreground/60">Upload a scan to begin</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {diagnosticStage === "complete" && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border">
                  <button onClick={() => setShowGradCAM(!showGradCAM)} className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium transition-all", showGradCAM ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {showGradCAM ? "Hide" : "Show"} Heatmap
                  </button>
                  {showGradCAM && (
                    <input type="range" min="10" max="100" value={gradcamOpacity} onChange={e => setGradcamOpacity(parseInt(e.target.value))} className="w-14 accent-primary h-1" />
                  )}
                </div>
              )}
            </div>

            {/* Pipeline info */}
            <div className="px-4 py-2 border-t bg-muted/20 flex-shrink-0">
              <div className="flex items-center gap-3 text-[10px] flex-wrap text-muted-foreground">
                <span><strong className="text-foreground/70">Pipeline:</strong> {activeModality === "xray" ? "X-Ray Phase I" : "MRI Phase II"}</span>
                <span><strong className="text-foreground/70">Model:</strong> {models.find(m => m.id === activeModel)?.name}</span>
                <span><strong className="text-foreground/70">Acc:</strong> {models.find(m => m.id === activeModel)?.accuracy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MRI Pipeline details */}
        {activeModality === "mri" && diagnosticStage === "complete" && <MriPipelinePanel scan={currentScan} />}

        {/* Results section */}
        <div className="px-4 sm:px-5 py-4 border-t">
          {diagnosticStage === "complete" ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Findings */}
              <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <p className="text-sm font-medium text-success">Analysis Complete</p>
                  <div className="ml-auto flex items-center gap-2">
                    <GradeBadge grade={result.grade} />
                    <ConfidenceGauge value={result.confidence} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Classification: </span>
                  <span className="font-medium">Grade {result.grade} Osteoarthritis</span>
                  <span className="text-muted-foreground ml-1">({result.confidence}%)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-success hover:bg-success hover:text-success-foreground transition-colors">
                    <Check className="w-4 h-4" />Agree
                  </button>
                  <button onClick={() => setShowOverridePanel(!showOverridePanel)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-warning hover:bg-warning hover:text-warning-foreground transition-colors">
                    <X className="w-4 h-4" />Override
                  </button>
                </div>
              </div>

              {/* Override panel */}
              <AnimatePresence>
                {showOverridePanel && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="p-4 rounded-xl bg-warning/5 border border-warning/20 overflow-hidden"
                  >
                    <p className="text-xs font-medium mb-3">Manual Grade Override</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Grade:</span>
                      {[0, 1, 2, 3, 4].map(g => (
                        <button key={g} onClick={() => setOverrideGrade(g)} className={cn("w-8 h-8 rounded-lg text-xs font-medium transition-all", overrideGrade === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{g}</button>
                      ))}
                    </div>
                    <textarea value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)} placeholder="Clinical reasoning for override..." className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    <div className="flex justify-end mt-2 gap-2">
                      <button onClick={() => setShowOverridePanel(false)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">Cancel</button>
                      <button className="px-3 py-1.5 text-xs rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors">Submit Override</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <p className="text-xs text-muted-foreground">
                {isProcessing ? "Analysis in progress..." : "Upload a scan to begin AI-assisted diagnosis"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function DiagnosticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("patient");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    preselectedId ? mockPatients.find(p => p.id === preselectedId) || null : null
  );

  const handleSelect = (p: Patient) => { setSelectedPatient(p); setSearchParams({ patient: p.id }); };
  const handleBack = () => { setSelectedPatient(null); setSearchParams({}); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {selectedPatient ? (
          <DiagnosticWorkspace key="workspace" patient={selectedPatient} onBack={handleBack} />
        ) : (
          <PatientSelector key="selector" onSelect={handleSelect} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
