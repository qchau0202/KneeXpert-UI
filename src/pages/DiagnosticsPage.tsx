import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Sun, Contrast, Maximize2, Layers, Upload, Image, FileImage,
  Loader2, CheckCircle2, Brain, Sparkles, AlertTriangle, User, Calendar,
  ChevronRight, Search, SlidersHorizontal, Clock, Scan, Type, RotateCw,
  Grid3X3, List, Play, Pause, RefreshCw, Download, Save, Trash2, Move, GripVertical,
  BookOpen, Activity, ShieldCheck, Timer, Users, ArrowRight, Stethoscope, FlaskConical
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { mockPatients, type Patient, type Modality } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticsToolbar } from "@/components/diagnostics/DiagnosticsToolbar";
import { MriPipelinePanel } from "@/components/diagnostics/MriPipelinePanel";
import { KonvaImageEditor, type KonvaImageEditorHandle, type EditorTool } from "@/components/diagnostics/KonvaImageEditor";
import { cn } from "@/lib/utils";

// --- Constants ---
const xrayModels = [
  { id: "ensemble", name: "Ensemble (Majority Vote)", description: "ResNet50 + DenseNet201 + VGG-19", accuracy: "95.1%" },
  { id: "densenet", name: "DenseNet201", description: "Detailed classification", accuracy: "94.2%" },
  { id: "vit", name: "ViT-B/16", description: "Global context analysis", accuracy: "92.8%" },
  { id: "resnet", name: "ResNet50", description: "Baseline comparison", accuracy: "89.5%" },
];
const mriModels = [
  { id: "deit-s", name: "DEiT-S", description: "Data-efficient Image Transformer (Small) — Swin-UNet cleaned input", accuracy: "92.4%" },
];
const xrayViews = ["AP", "Lateral"];
const mriViews = ["Sagittal", "Coronal", "Axial"];

type DiagnosticStage = "idle" | "uploading" | "preprocessing" | "artifact-removal" | "inference" | "gradcam" | "complete";

const xrayStages: { id: DiagnosticStage; label: string; duration: number }[] = [
  { id: "uploading", label: "Uploading DICOM file...", duration: 1200 },
  { id: "preprocessing", label: "Pre-processing: CLAHE + Denoise + Normalization", duration: 1800 },
  { id: "inference", label: "Running ensemble inference (ResNet50 + DenseNet201 + VGG-19)", duration: 2500 },
  { id: "gradcam", label: "Generating Grad-CAM heatmap...", duration: 1200 },
  { id: "complete", label: "Analysis complete", duration: 0 },
];
const mriStages: { id: DiagnosticStage; label: string; duration: number }[] = [
  { id: "uploading", label: "Uploading MRI scan...", duration: 1500 },
  { id: "preprocessing", label: "Pre-processing: Normalization + Quality Check", duration: 1500 },
  { id: "artifact-removal", label: "Swin-UNet artifact removal", duration: 2500 },
  { id: "inference", label: "DEiT-S classification", duration: 2200 },
  { id: "gradcam", label: "Generating Grad-CAM heatmap...", duration: 1200 },
  { id: "complete", label: "Analysis complete", duration: 0 },
];

const mockResults = {
  xray: { grade: 3, confidence: 94.2, findings: ["Joint space narrowing (medial compartment)", "Osteophyte formation (tibial plateau)", "Subchondral sclerosis detected"] },
  mri: { grade: 2, confidence: 87.6, findings: ["Cartilage thinning (medial femoral condyle)", "Mild meniscal degeneration", "No significant effusion"] },
};

// Per-model performance (mocked) shown after analysis
const modelPerformance = {
  xray: [
    { id: "resnet", name: "ResNet50", grade: 3, confidence: 91.4, latency: "182 ms", accuracy: "89.5%" },
    { id: "densenet", name: "DenseNet201", grade: 3, confidence: 94.7, latency: "214 ms", accuracy: "94.2%" },
    { id: "vgg", name: "VGG-19", grade: 3, confidence: 90.1, latency: "245 ms", accuracy: "88.1%" },
    { id: "ensemble", name: "Ensemble (Majority Vote)", grade: 3, confidence: 94.2, latency: "641 ms", accuracy: "95.1%" },
  ],
  mri: [
    { id: "deit-s", name: "DEiT-S (on Swin-UNet output)", grade: 2, confidence: 87.6, latency: "298 ms", accuracy: "92.4%" },
  ],
} as const;

// MRI supported input formats (informational — pipeline auto-detects)
const mriSupportedFormats = [
  "DICOM (.dcm)",
  "NIfTI (.nii, .nii.gz)",
  "NRRD (.nrrd, .nhdr)",
  "MetaImage (.mha, .mhd)",
  "Analyze (.img, .hdr)",
  "MINC (.mnc)",
  "PAR/REC (.par, .rec)",
  "Pickle (.pkl)",
];
const mriAcceptString = ".dcm,.dicom,.nii,.nii.gz,.nrrd,.nhdr,.mha,.mhd,.img,.hdr,.mnc,.par,.rec,.pkl";

// ============================================================
// Phase 1 — Patient Selector (clean card-based layout)
// ============================================================
type DiagViewMode = "individual" | "batch";
type BatchViewMode = "grid" | "list";

// Mock batch diagnostic status
interface BatchPatientStatus {
  patientId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  grade?: number;
  confidence?: number;
  startedAt?: string;
}

function PatientSelector({ onSelect, onBatchSelect }: { onSelect: (p: Patient) => void; onBatchSelect: (patients: Patient[]) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "pain">("date");
  const [viewMode, setViewMode] = useState<DiagViewMode>("individual");
  const [batchView, setBatchView] = useState<BatchViewMode>("grid");
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [batchStatuses, setBatchStatuses] = useState<Map<string, BatchPatientStatus>>(new Map());
  const [batchRunning, setBatchRunning] = useState(false);

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
  const withScansCount = mockPatients.filter(p => p.scans.some(s => s.grade !== null || s.aiConfidence !== null)).length;

  const toggleBatchSelect = (id: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedForBatch.size === filtered.length) {
      setSelectedForBatch(new Set());
    } else {
      setSelectedForBatch(new Set(filtered.map(p => p.id)));
    }
  };

  const startBatchDiagnosis = () => {
    const patients = mockPatients.filter(p => selectedForBatch.has(p.id));
    setBatchRunning(true);
    const statuses = new Map<string, BatchPatientStatus>();
    patients.forEach((p, i) => {
      statuses.set(p.id, { patientId: p.id, status: i === 0 ? "processing" : "queued", progress: 0 });
    });
    setBatchStatuses(new Map(statuses));

    // Simulate sequential processing
    let idx = 0;
    const processNext = () => {
      if (idx >= patients.length) { setBatchRunning(false); return; }
      const p = patients[idx];
      statuses.set(p.id, { ...statuses.get(p.id)!, status: "processing", progress: 0 });
      setBatchStatuses(new Map(statuses));

      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 20 + 10;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          const mockGrade = p.grade ?? Math.floor(Math.random() * 4) + 1;
          const mockConf = p.aiConfidence ?? Math.round(70 + Math.random() * 25 * 10) / 10;
          statuses.set(p.id, { patientId: p.id, status: "completed", progress: 100, grade: mockGrade, confidence: mockConf });
          setBatchStatuses(new Map(statuses));
          idx++;
          if (idx < patients.length) {
            setTimeout(processNext, 500);
          } else {
            setBatchRunning(false);
          }
        } else {
          statuses.set(p.id, { ...statuses.get(p.id)!, progress: Math.min(prog, 99) });
          setBatchStatuses(new Map(statuses));
        }
      }, 300);
    };
    processNext();
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-success";
      case "processing": return "text-primary";
      case "failed": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getBatchStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "processing": return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "failed": return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Diagnostic Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select a patient or run batch AI diagnosis on existing scans</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />{urgentCount} urgent
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />{pendingCount} pending
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Scan className="w-3.5 h-3.5" />{withScansCount} with scans
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode("individual")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "individual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              Individual
            </button>
            <button onClick={() => setViewMode("batch")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "batch" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              Batch Diagnosis
            </button>
          </div>
          {viewMode === "batch" && (
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <button onClick={() => setBatchView("grid")} className={cn("px-2 py-1.5 rounded-md transition-all", batchView === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setBatchView("list")} className={cn("px-2 py-1.5 rounded-md transition-all", batchView === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {statusOptions.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-2.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize", statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >{s === "all" ? "All" : s}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {["all", "xray", "mri"].map(m => (
              <button key={m} onClick={() => setModalityFilter(m)}
                className={cn("px-2.5 py-1.5 rounded-md text-xs font-medium transition-all", modalityFilter === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >{m === "all" ? "All Types" : m === "xray" ? "X-Ray" : "MRI"}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-muted rounded-lg px-2.5 py-1.5 text-xs border-0 focus:outline-none cursor-pointer">
              <option value="date">Latest Visit</option>
              <option value="name">Name A-Z</option>
              <option value="pain">Pain Level</option>
            </select>
          </div>
        </div>

        {/* Batch controls */}
        {viewMode === "batch" && (
          <div className="flex items-center justify-between mb-3 p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <button onClick={selectAllFiltered} className="text-xs text-primary hover:underline font-medium">
                {selectedForBatch.size === filtered.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-muted-foreground">{selectedForBatch.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              {batchRunning && (
                <span className="text-xs text-primary flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />Processing...
                </span>
              )}
              <button
                onClick={startBatchDiagnosis}
                disabled={selectedForBatch.size === 0 || batchRunning}
                className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                  selectedForBatch.size > 0 && !batchRunning
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Play className="w-3 h-3" />Run AI Diagnosis ({selectedForBatch.size})
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-3">{filtered.length} patient{filtered.length !== 1 ? "s" : ""} found</p>

        {/* ===== INDIVIDUAL MODE ===== */}
        {viewMode === "individual" && (
          <div className="space-y-2">
            {filtered.map(p => (
              <button key={p.id} onClick={() => onSelect(p)}
                className="w-full text-left p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{p.id}</span>
                      <StatusBadge status={p.status} />
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">{p.modality === "xray" ? "X-Ray" : "MRI"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{p.age}yo · {p.gender}</span>
                      <span>BMI {p.bmi}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.lastVisit}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
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
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="truncate flex-1"><span className="text-foreground/60">Symptoms:</span> {p.symptoms}</span>
                  <span className="flex-shrink-0">{p.scans.length} scan{p.scans.length !== 1 ? "s" : ""}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ===== BATCH MODE - GRID ===== */}
        {viewMode === "batch" && batchView === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => {
              const bs = batchStatuses.get(p.id);
              const isSelected = selectedForBatch.has(p.id);
              return (
                <div key={p.id} className={cn("relative p-4 rounded-xl border bg-card transition-all cursor-pointer", isSelected ? "border-primary ring-1 ring-primary/20" : "hover:border-border/80")}
                  onClick={() => bs?.status === "completed" ? onSelect(p) : toggleBatchSelect(p.id)}>
                  {/* Checkbox */}
                  <div className="absolute top-3 right-3">
                    {bs ? getBatchStatusIcon(bs.status) : (
                      <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.id}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{p.age}yo · {p.gender}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium">{p.modality === "xray" ? "X-Ray" : "MRI"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{p.scans.length} scan{p.scans.length !== 1 ? "s" : ""} in database</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-[10px] truncate">{p.symptoms}</p>
                  </div>

                  {/* Batch progress */}
                  {bs && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={cn("font-medium capitalize", getBatchStatusColor(bs.status))}>{bs.status}</span>
                        {bs.status === "completed" && bs.grade !== undefined && (
                          <div className="flex items-center gap-2">
                            <GradeBadge grade={bs.grade} />
                            <span className="text-[10px] text-muted-foreground">{bs.confidence}%</span>
                          </div>
                        )}
                      </div>
                      {bs.status === "processing" && (
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full bg-primary rounded-full" style={{ width: `${bs.progress}%` }} />
                        </div>
                      )}
                      {bs.status === "completed" && (
                        <button onClick={e => { e.stopPropagation(); onSelect(p); }}
                          className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-center">
                          View Detailed Results →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== BATCH MODE - LIST ===== */}
        {viewMode === "batch" && batchView === "list" && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b">
              <div className="w-6" />
              <div className="flex-1">Patient</div>
              <div className="w-16 text-center hidden sm:block">Modality</div>
              <div className="w-16 text-center hidden sm:block">Scans</div>
              <div className="w-20 text-center hidden md:block">Pain</div>
              <div className="w-20 text-center">Status</div>
              <div className="w-28 text-center">AI Result</div>
            </div>
            {filtered.map(p => {
              const bs = batchStatuses.get(p.id);
              const isSelected = selectedForBatch.has(p.id);
              return (
                <div key={p.id} className={cn("flex items-center gap-4 px-4 py-3 border-b last:border-0 transition-colors cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-muted/30")}
                  onClick={() => bs?.status === "completed" ? onSelect(p) : toggleBatchSelect(p.id)}>
                  <div className="w-6 flex-shrink-0">
                    {bs ? getBatchStatusIcon(bs.status) : (
                      <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.id} · {p.age}yo</p>
                    </div>
                  </div>
                  <div className="w-16 text-center hidden sm:block">
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">{p.modality === "xray" ? "X-Ray" : "MRI"}</span>
                  </div>
                  <div className="w-16 text-center hidden sm:block text-xs text-muted-foreground">{p.scans.length}</div>
                  <div className="w-20 hidden md:flex justify-center">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={cn("w-1 h-2.5 rounded-sm", i < p.painLevel ? (p.painLevel >= 7 ? "bg-destructive" : p.painLevel >= 4 ? "bg-warning" : "bg-success") : "bg-muted")} />
                      ))}
                    </div>
                  </div>
                  <div className="w-20 text-center">
                    {bs ? (
                      <div>
                        <span className={cn("text-[10px] font-medium capitalize", getBatchStatusColor(bs.status))}>{bs.status}</span>
                        {bs.status === "processing" && (
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${bs.progress}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <StatusBadge status={p.status} />
                    )}
                  </div>
                  <div className="w-28 text-center">
                    {bs?.status === "completed" ? (
                      <div className="flex items-center justify-center gap-2">
                        <GradeBadge grade={bs.grade!} />
                        <span className="text-[10px] text-muted-foreground">{bs.confidence}%</span>
                      </div>
                    ) : bs?.status === "processing" ? (
                      <span className="text-[10px] text-primary">Analyzing...</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Search className="w-8 h-8" />
            <p className="text-sm">No patients match your filters</p>
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setModalityFilter("all"); }} className="text-xs text-primary hover:underline">Clear filters</button>
          </div>
        )}
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
  const views = activeModality === "xray" ? xrayViews : mriViews;

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
  const [textBoxes, setTextBoxes] = useState<{ id: string; x: number; y: number; text: string; color: string; fontSize: number; rotation: number; width: number }[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFontSize, setTextFontSize] = useState(14);
  const [measureColor, setMeasureColor] = useState("#6366f1");
  const [annotateColor, setAnnotateColor] = useState("#eab308");
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotatingTextId, setRotatingTextId] = useState<string | null>(null);
  const [rotateCenter, setRotateCenter] = useState({ x: 0, y: 0 });
  const [resizingTextId, setResizingTextId] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [textPlaced, setTextPlaced] = useState(false);
  const [draggingMeasurePoint, setDraggingMeasurePoint] = useState<{ measureId: string; point: "start" | "end" } | null>(null);
  const [draggingAnnotation, setDraggingAnnotation] = useState<string | null>(null);
  const [dragElementOffset, setDragElementOffset] = useState({ x: 0, y: 0 });
  const textOptionsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<KonvaImageEditorHandle>(null);

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
  const [selectedView, setSelectedView] = useState(views[0]);
  const [diagnosticStage, setDiagnosticStage] = useState<DiagnosticStage>("idle");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stagesCompleted, setStagesCompleted] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const toolCursor = activeTool === "pan" ? (isPanning ? "grabbing" : "grab") 
    : activeTool === "measure" ? "crosshair" 
    : activeTool === "annotate" ? "crosshair" 
    : activeTool === "draw" ? "crosshair" 
    : activeTool === "text" ? (textPlaced ? "default" : "text")
    : "default";

  const currentScan = patient.scans.find(s => s.modality === activeModality && s.view === selectedView) || patient.scans[0];
  const stages = activeModality === "xray" ? xrayStages : mriStages;
  const result = mockResults[activeModality];

  const handleModalitySwitch = (mod: Modality) => {
    setActiveModality(mod);
    setSelectedView(mod === "xray" ? xrayViews[0] : mriViews[0]);
    setDiagnosticStage("idle");
    setStagesCompleted([]);
    setCurrentStageIndex(0);
    setActiveTool("select");
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
  const resetDiagnostic = () => { setDiagnosticStage("idle"); setStagesCompleted([]); setCurrentStageIndex(0); setUploadProgress(0); setUploadedFileName(""); setMeasurements([]); setAnnotations([]); setDrawingPaths([]); setCurrentDrawPath([]); setTextBoxes([]); setEditingTextId(null); setSelectedTextId(null); setTextPlaced(false); setPanOffset({ x: 0, y: 0 }); setZoom(100); setActiveTool("select"); if (uploadedImageUrl) { URL.revokeObjectURL(uploadedImageUrl); setUploadedImageUrl(null); } };

  useEffect(() => { if (activeTool !== "text") setTextPlaced(false); }, [activeTool]);

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
    // Konva editor handles everything when scan is loaded
    if (diagnosticStage === "complete") return;
    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (activeTool === "draw") {
      setIsDrawing(true);
      const pos = getRelativePos(e);
      setCurrentDrawPath([pos]);
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (diagnosticStage === "complete") return;
    if (activeTool === "pan" && isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (activeTool === "draw" && isDrawing) {
      const pos = getRelativePos(e);
      setCurrentDrawPath(prev => [...prev, pos]);
    } else if (draggingTextId) {
      const pos = getRelativePos(e);
      setTextBoxes(prev => prev.map(t => t.id === draggingTextId ? { ...t, x: pos.x + dragOffset.x, y: pos.y + dragOffset.y } : t));
    } else if (resizingTextId) {
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.clientX - resizeStartX;
      const scale = zoom / 100;
      const newWidthPx = Math.max(40, resizeStartWidth + dx / scale);
      const newWidthPct = (newWidthPx / rect.width) * 100;
      setTextBoxes(prev => prev.map(t => t.id === resizingTextId ? { ...t, width: newWidthPct } : t));
    } else if (draggingMeasurePoint) {
      const pos = getRelativePos(e);
      setMeasurements(prev => prev.map(m => {
        if (m.id !== draggingMeasurePoint.measureId) return m;
        if (draggingMeasurePoint.point === "start") return { ...m, x1: pos.x + dragElementOffset.x, y1: pos.y + dragElementOffset.y };
        return { ...m, x2: pos.x + dragElementOffset.x, y2: pos.y + dragElementOffset.y };
      }));
    } else if (draggingAnnotation) {
      const pos = getRelativePos(e);
      setAnnotations(prev => prev.map(a => a.id === draggingAnnotation ? { ...a, x: pos.x + dragElementOffset.x, y: pos.y + dragElementOffset.y } : a));
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const angle = Math.atan2(my - rotateCenter.y, mx - rotateCenter.x) * (180 / Math.PI) + 90;
      setTextBoxes(prev => prev.map(t => t.id === rotatingTextId ? { ...t, rotation: Math.round(angle / 5) * 5 } : t));
    }
  };

  const handleImageMouseUp = () => {
    if (diagnosticStage === "complete") return;
    if (activeTool === "pan") setIsPanning(false);
    if (activeTool === "draw" && isDrawing) {
      setIsDrawing(false);
      if (currentDrawPath.length > 1) {
        setDrawingPaths(prev => [...prev, { id: `d${Date.now()}`, points: currentDrawPath, color: drawColor, size: drawSize }]);
      }
      setCurrentDrawPath([]);
    }
    if (draggingTextId) setDraggingTextId(null);
    if (rotatingTextId) setRotatingTextId(null);
    if (resizingTextId) setResizingTextId(null);
    if (draggingMeasurePoint) setDraggingMeasurePoint(null);
    if (draggingAnnotation) setDraggingAnnotation(null);
  };

  const handleTextDragStart = (e: React.MouseEvent, tb: typeof textBoxes[0]) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    setDragOffset({ x: tb.x - pos.x, y: tb.y - pos.y });
    setDraggingTextId(tb.id);
    setSelectedTextId(tb.id);
  };

  const handleRotateStart = (e: React.MouseEvent, tb: typeof textBoxes[0]) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = zoom / 100;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const tbScreenX = ((tb.x / 100 * rect.width - cx) * scale + cx + panOffset.x / 4) + rect.left;
    const tbScreenY = ((tb.y / 100 * rect.height - cy) * scale + cy + panOffset.y / 4) + rect.top;
    setRotateCenter({ x: tbScreenX - rect.left, y: tbScreenY - rect.top });
    setRotatingTextId(tb.id);
    setSelectedTextId(tb.id);
  };

  const handleResizeStart = (e: React.MouseEvent, tb: typeof textBoxes[0]) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setResizingTextId(tb.id);
    setResizeStartX(e.clientX);
    setResizeStartWidth((tb.width / 100) * rect.width);
    setSelectedTextId(tb.id);
  };

  const handleMeasurePointDrag = (e: React.MouseEvent, measureId: string, point: "start" | "end") => {
    if (activeTool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const m = measurements.find(mm => mm.id === measureId);
    if (!m) return;
    const pos = getRelativePos(e);
    const px = point === "start" ? m.x1 : m.x2;
    const py = point === "start" ? m.y1 : m.y2;
    setDragElementOffset({ x: px - pos.x, y: py - pos.y });
    setDraggingMeasurePoint({ measureId, point });
  };

  const handleAnnotationDrag = (e: React.MouseEvent, annotationId: string) => {
    if (activeTool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const a = annotations.find(aa => aa.id === annotationId);
    if (!a) return;
    const pos = getRelativePos(e);
    setDragElementOffset({ x: a.x - pos.x, y: a.y - pos.y });
    setDraggingAnnotation(annotationId);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (diagnosticStage === "complete") return; // Konva editor owns interactions
    const pos = getRelativePos(e);
    if (activeTool === "zoom") {
      setZoom(prev => Math.min(200, prev + 25));
    } else if (activeTool === "measure") {
      if (!measureStart) {
        setMeasureStart(pos);
      } else {
        setMeasurements(prev => [...prev, { id: `m${Date.now()}`, x1: measureStart.x, y1: measureStart.y, x2: pos.x, y2: pos.y }]);
        setMeasureStart(null);
      }
    } else if (activeTool === "annotate") {
      const label = `A${annotations.length + 1}`;
      setAnnotations(prev => [...prev, { id: `a${Date.now()}`, x: pos.x, y: pos.y, label }]);
    } else if (activeTool === "text" && !textPlaced) {
      const newId = `t${Date.now()}`;
      setTextBoxes(prev => [...prev, { id: newId, x: pos.x, y: pos.y, text: "Text", color: textColor, fontSize: textFontSize, rotation: 0, width: 15 }]);
      setSelectedTextId(newId);
      setEditingTextId(newId);
      setTextPlaced(true);
      setTimeout(() => setActiveTool("select"), 50);
    } else if (activeTool === "select") {
      setSelectedTextId(null);
      setEditingTextId(null);
    }
  };

  // Download the annotated image
  const handleDownloadImage = useCallback(() => {
    const container = imageContainerRef.current;
    if (!container || !uploadedImageUrl) return;
    const canvas = document.createElement("canvas");
    const img = container.querySelector("img");
    if (!img) return;
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Draw paths
    drawingPaths.forEach(dp => {
      ctx.beginPath();
      ctx.strokeStyle = dp.color;
      ctx.lineWidth = dp.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      dp.points.forEach((p, i) => {
        const px = (p.x / 100) * canvas.width;
        const py = (p.y / 100) * canvas.height;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
    // Draw text boxes
    textBoxes.forEach(tb => {
      ctx.save();
      const tx = (tb.x / 100) * canvas.width;
      const ty = (tb.y / 100) * canvas.height;
      ctx.translate(tx, ty);
      ctx.rotate((tb.rotation * Math.PI) / 180);
      ctx.font = `600 ${tb.fontSize * (canvas.width / 500)}px sans-serif`;
      ctx.fillStyle = tb.color;
      ctx.textAlign = "center";
      ctx.fillText(tb.text, 0, 0);
      ctx.restore();
    });
    // Draw measurements
    measurements.forEach(m => {
      const x1 = (m.x1 / 100) * canvas.width, y1 = (m.y1 / 100) * canvas.height;
      const x2 = (m.x2 / 100) * canvas.width, y2 = (m.y2 / 100) * canvas.height;
      ctx.beginPath(); ctx.setLineDash([6, 3]); ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2;
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fillStyle = "#6366f1"; ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = "12px sans-serif"; ctx.fillStyle = "#6366f1"; ctx.textAlign = "center";
      ctx.fillText(`${Math.round(Math.sqrt(Math.pow(m.x2 - m.x1, 2) + Math.pow(m.y2 - m.y1, 2)) * 2.5)}mm`, (x1 + x2) / 2, (y1 + y2) / 2 - 8);
    });
    // Annotations
    annotations.forEach(a => {
      const ax = (a.x / 100) * canvas.width, ay = (a.y / 100) * canvas.height;
      ctx.beginPath(); ctx.arc(ax, ay, 10, 0, Math.PI * 2); ctx.fillStyle = "#eab308"; ctx.fill();
      ctx.font = "bold 10px sans-serif"; ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(a.label, ax, ay);
    });
    const link = document.createElement("a");
    link.download = `${patient.name.replace(/\s+/g, "_")}_annotated.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [uploadedImageUrl, drawingPaths, textBoxes, measurements, annotations, patient.name]);

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
          {/* Tools — only available after analysis completes */}
          {diagnosticStage === "complete" && (
            <DiagnosticsToolbar activeTool={activeTool} setActiveTool={setActiveTool} zoom={zoom} setZoom={setZoom} setBrightness={setBrightness} setContrast={setContrast} />
          )}

          {/* Original scan panel */}
          <div className="flex-1 border-r border-b flex flex-col">
            <div className="h-10 border-b flex items-center justify-between px-4 flex-shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
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
              <input ref={fileInputRef} type="file" accept={activeModality === "xray" ? ".dcm,.dicom,.jpg,.jpeg,.png" : mriAcceptString} className="hidden" onChange={handleFileChange} />

              <AnimatePresence mode="wait">
                {diagnosticStage === "idle" ? (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-72 sm:w-80 rounded-xl bg-background border shadow-sm p-5 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {activeModality === "mri" && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Supported formats</p>
                        <div className="flex flex-wrap gap-1">
                          {mriSupportedFormats.map(f => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFileSelect(); }}
                      className="w-full h-44 rounded-xl bg-foreground/5 border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-medium">Upload {activeModality === "xray" ? "X-Ray" : "MRI"} scan</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {activeModality === "xray"
                            ? "DICOM, JPEG or PNG"
                            : "DICOM, NIfTI, NRRD, MHA, Analyze, MINC, PAR/REC, PKL"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Drag & drop or click</p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>View: <span className="font-medium text-foreground/80">{selectedView}</span></span>
                    </div>
                  </motion.div>
                ) : diagnosticStage === "complete" ? (
                  <motion.div key="result-image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                    <KonvaImageEditor
                      ref={editorRef}
                      imageUrl={uploadedImageUrl}
                      tool={activeTool as EditorTool}
                      brightness={brightness}
                      contrast={contrast}
                      zoom={zoom}
                      drawColor={drawColor}
                      drawSize={drawSize}
                      textColor={textColor}
                      textFontSize={textFontSize}
                      measureColor={measureColor}
                      annotateColor={annotateColor}
                      onToolChange={(t) => setActiveTool(t)}
                    />
                    {/* Draw options panel */}
                    {activeTool === "draw" && (
                      <div className="absolute top-3 left-3 z-30 bg-background/95 backdrop-blur-sm border rounded-xl p-2.5 shadow-lg space-y-2 w-[170px]">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pen Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {penColors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setDrawColor(c.value)}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", drawColor === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105")}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Size · {drawSize}px</p>
                        <input type="range" min="1" max="10" value={drawSize}
                          onChange={e => setDrawSize(parseInt(e.target.value))}
                          className="w-full accent-primary h-1 cursor-pointer" />
                      </div>
                    )}
                    {/* Text default options panel — applies to next text box */}
                    {activeTool === "text" && (
                      <div className="absolute top-3 left-3 z-30 bg-background/95 backdrop-blur-sm border rounded-xl p-2.5 shadow-lg space-y-2 w-[170px]">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Text Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {penColors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setTextColor(c.value)}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", textColor === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105")}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Font · {textFontSize}px</p>
                        <input type="range" min="10" max="48" value={textFontSize}
                          onChange={e => setTextFontSize(parseInt(e.target.value))}
                          className="w-full accent-primary h-1 cursor-pointer" />
                        <p className="text-[9px] text-muted-foreground italic">Click on the scan to place a text box</p>
                      </div>
                    )}
                    {/* Ruler (measure) options panel */}
                    {activeTool === "measure" && (
                      <div className="absolute top-3 left-3 z-30 bg-background/95 backdrop-blur-sm border rounded-xl p-2.5 shadow-lg space-y-2 w-[170px]">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ruler Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {penColors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setMeasureColor(c.value)}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", measureColor === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105")}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground italic">Click two points on the scan to measure</p>
                      </div>
                    )}
                    {/* Annotate (marker) options panel */}
                    {activeTool === "annotate" && (
                      <div className="absolute top-3 left-3 z-30 bg-background/95 backdrop-blur-sm border rounded-xl p-2.5 shadow-lg space-y-2 w-[170px]">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Marker Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {penColors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setAnnotateColor(c.value)}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", annotateColor === c.value ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105")}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground italic">Click on the scan to place a marker</p>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
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
                      <div className="absolute inset-0">
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
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-sm border">
                  <button onClick={() => setShowGradCAM(!showGradCAM)} className={cn("px-3 py-1 rounded-full text-[10px] font-medium transition-all", showGradCAM ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {showGradCAM ? "Hide" : "Show"} Heatmap
                  </button>
                </div>
              )}
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

              {/* Per-model performance breakdown */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Model Performance</p>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {activeModality === "xray" ? "X-Ray ensemble" : "MRI · DEiT-S"}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-5">Model</div>
                    <div className="col-span-2 text-center">Grade</div>
                    <div className="col-span-3">Confidence</div>
                    <div className="col-span-1 text-right">Latency</div>
                    <div className="col-span-1 text-right">Acc.</div>
                  </div>
                  {modelPerformance[activeModality].map((m, i) => {
                    const isFinal = activeModality === "xray" ? m.id === "ensemble" : true;
                    return (
                      <div key={m.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs border-t", isFinal && "bg-primary/5")}>
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{m.name}</span>
                          {isFinal && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Final</span>}
                        </div>
                        <div className="col-span-2 flex justify-center"><GradeBadge grade={m.grade} /></div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${m.confidence}%` }} />
                            </div>
                            <span className="text-mono text-[10px] text-muted-foreground w-10 text-right">{m.confidence.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="col-span-1 text-right text-mono text-[10px] text-muted-foreground">{m.latency}</div>
                        <div className="col-span-1 text-right text-mono text-[10px] text-muted-foreground">{m.accuracy}</div>
                      </div>
                    );
                  })}
                </div>
                {activeModality === "mri" && (
                  <p className="text-[10px] text-muted-foreground mt-2">DEiT-S is the sole MRI classifier; input is first cleaned by the Swin-UNet artifact-removal stage.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Classification: </span>
                  <span className="font-medium">Grade {result.grade} Osteoarthritis</span>
                  <span className="text-muted-foreground ml-1">({result.confidence}%)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => editorRef.current?.exportPNG(`${patient.name.replace(/\s+/g, "_")}_annotated.png`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Download className="w-4 h-4" />Download
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    <Save className="w-4 h-4" />Save to Profile
                  </button>
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
          <PatientSelector key="selector" onSelect={handleSelect} onBatchSelect={(patients) => { if (patients.length > 0) handleSelect(patients[0]); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
