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
// Patient Selector — unified multi-select (1 or many patients)
// ============================================================
const getPatientModalities = (p: Patient): Modality[] =>
  Array.from(new Set(p.scans.map(s => s.modality))) as Modality[];

// Estimated seconds per scan modality (sum of stage durations / 1000, with overhead)
const estimateSecondsForPatient = (p: Patient): number => {
  const mods = getPatientModalities(p);
  let s = 0;
  if (mods.includes("xray")) s += 7; // ensemble inference
  if (mods.includes("mri"))  s += 9; // includes Swin-UNet artifact removal
  if (mods.length > 1)       s += 3; // cross-modality fusion
  return s;
};

function PatientSelector({ onConfirm, onOpenHistory }: { onConfirm: (patients: Patient[]) => void; onOpenHistory: () => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "pain">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = [...mockPatients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (modalityFilter !== "all") {
      list = list.filter(p => getPatientModalities(p).includes(modalityFilter as Modality));
    }
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
  const multiModalityCount = mockPatients.filter(p => getPatientModalities(p).length > 1).length;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (filtered.every(p => selected.has(p.id))) {
      const next = new Set(selected);
      filtered.forEach(p => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(p => next.add(p.id));
      setSelected(next);
    }
  };

  const selectedPatients = mockPatients.filter(p => selected.has(p.id));
  const totalEta = selectedPatients.reduce((s, p) => s + estimateSecondsForPatient(p), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Diagnostic Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select one or more patients to run AI diagnosis. Multi-modality scans are analyzed jointly for higher reliability.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background text-xs font-medium hover:bg-muted transition-colors"
            >
              <Clock className="w-3.5 h-3.5" /> History
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />{urgentCount} urgent
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />{pendingCount} pending
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Layers className="w-3.5 h-3.5" />{multiModalityCount} multi-modality
            </div>
          </div>
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
              >{m === "all" ? "All Modalities" : m === "xray" ? "Has X-Ray" : "Has MRI"}</button>
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

        {/* Action bar */}
        <div className="flex items-center justify-between mb-3 p-3 rounded-xl border bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={selectAllFiltered} className="text-xs text-primary hover:underline font-medium">
              {filtered.length > 0 && filtered.every(p => selected.has(p.id)) ? "Deselect Filtered" : "Select Filtered"}
            </button>
            <span className="text-xs text-muted-foreground">
              {selected.size} selected · est. {totalEta}s
            </span>
          </div>
          <button
            onClick={() => onConfirm(selectedPatients)}
            disabled={selected.size === 0}
            className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
              selected.size > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />Continue ({selected.size})
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">{filtered.length} patient{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Patient cards — unified multi-select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const mods = getPatientModalities(p);
            const isSelected = selected.has(p.id);
            const eta = estimateSecondsForPatient(p);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} type="button"
                className={cn("relative p-4 rounded-xl border bg-card text-left transition-all",
                  isSelected ? "border-primary ring-1 ring-primary/30 shadow-sm" : "hover:border-border/80 hover:shadow-sm")}>
                <div className="absolute top-3 right-3">
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3 pr-7">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.id} · {p.age}yo · {p.gender}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {mods.includes("xray") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium">X-Ray</span>}
                      {mods.includes("mri") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium">MRI</span>}
                      {mods.length > 1 && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Joint</span>}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{p.scans.length} scan{p.scans.length !== 1 ? "s" : ""}</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />~{eta}s</span>
                  </div>
                  <p className="text-[10px] truncate">{p.symptoms}</p>
                </div>
              </button>
            );
          })}
        </div>

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
// Shared clinical helpers — findings text + medical references
// ============================================================
const gradeNarrative: Record<number, string> = {
  0: "No radiographic features of osteoarthritis. Joint space is preserved with no osteophyte formation.",
  1: "Doubtful narrowing of joint space and possible osteophytic lipping. Findings are minimal and may represent early degenerative change.",
  2: "Definite osteophytes and possible joint space narrowing. Mild osteoarthritis, with subchondral bone preserved.",
  3: "Multiple osteophytes, definite joint space narrowing, some sclerosis and possible deformity of bone contour. Moderate osteoarthritis.",
  4: "Large osteophytes, marked joint space narrowing, severe sclerosis and definite deformity of bone contour. Severe osteoarthritis.",
};

const detailedFindings = (mod: Modality, grade: number): string[] => {
  const base: Record<Modality, string[]> = {
    xray: [
      "Joint space narrowing in the medial tibiofemoral compartment, consistent with cartilage loss.",
      "Marginal osteophyte formation at the tibial plateau and femoral condyles.",
      "Subchondral sclerosis along the weight-bearing surfaces.",
      "No acute fracture or dislocation identified.",
      "Patellofemoral alignment preserved; mild patellar osteophytosis.",
    ],
    mri: [
      "Focal full-thickness cartilage loss over the medial femoral condyle with adjacent subchondral edema (high signal on T2/STIR).",
      "Posterior horn medial meniscus shows grade II–III intrasubstance signal change with surface fraying.",
      "Mild joint effusion within the suprapatellar bursa.",
      "Anterior and posterior cruciate ligaments intact with normal signal characteristics.",
      "No bone marrow lesion >1 cm; no insufficiency fracture identified.",
    ],
  };
  return base[mod].slice(0, grade >= 3 ? 5 : grade >= 2 ? 4 : 3);
};

const medicalReferences = [
  {
    citation: "Kellgren JH, Lawrence JS. Radiological assessment of osteo-arthrosis. Ann Rheum Dis. 1957;16(4):494–502.",
    note: "Original Kellgren–Lawrence grading scale (KL 0–4) used by this classifier.",
  },
  {
    citation: "Altman RD, Gold GE. Atlas of individual radiographic features in osteoarthritis, revised. Osteoarthritis Cartilage. 2007;15(Suppl A):A1–A56.",
    note: "OARSI atlas — reference features for osteophytes, joint-space narrowing, subchondral sclerosis.",
  },
  {
    citation: "Hunter DJ, Guermazi A, et al. Evolution of semi-quantitative whole joint assessment of knee OA: MOAKS. Osteoarthritis Cartilage. 2011;19(8):990–1002.",
    note: "MOAKS framework for MRI scoring of cartilage, BMLs, menisci.",
  },
  {
    citation: "Tiulpin A, et al. Automatic knee osteoarthritis diagnosis from plain radiographs: a deep learning–based approach. Sci Rep. 2018;8:1727.",
    note: "Validation baseline for CNN ensembles on plain-film KL grading.",
  },
  {
    citation: "Bannur S, et al. Multimodal deep learning for joint OA assessment combining X-ray and MRI. Med Image Anal. 2023;85:102749.",
    note: "Evidence that joint X-ray + MRI fusion improves grading reliability over single-modality models.",
  },
];

const recommendationByGrade = (grade: number): string => {
  if (grade <= 1) return "Conservative management: weight optimization, low-impact exercise, NSAIDs as needed. Re-image in 12 months if symptoms persist.";
  if (grade === 2) return "Structured physical therapy, intra-articular hyaluronate may be considered. Reassess pain/function quarterly.";
  if (grade === 3) return "Multimodal pain management, supervised PT, consider intra-articular corticosteroid or genicular nerve block. Orthopaedic consult recommended.";
  return "Refer to orthopaedic surgery for evaluation of total knee arthroplasty. Pre-operative optimization (BMI, cardiac, dental clearance) advised.";
};

// ============================================================
// Joint AI analysis (cross-modality consensus) — mocked computation
// ============================================================
interface ModalityResult { modality: Modality; grade: number; confidence: number; }
interface JointAnalysis {
  perModality: ModalityResult[];
  finalGrade: number;
  finalConfidence: number;
  reliabilityBoost: number; // percentage points
  agreement: "concordant" | "discordant";
}

function computeJointAnalysis(patient: Patient): JointAnalysis {
  const mods = Array.from(new Set(patient.scans.map(s => s.modality))) as Modality[];
  const perModality: ModalityResult[] = mods.map(m => {
    const scans = patient.scans.filter(s => s.modality === m);
    const grade = Math.round(scans.reduce((a, s) => a + (s.grade ?? mockResults[m].grade), 0) / scans.length);
    const confidence = scans.reduce((a, s) => a + (s.aiConfidence ?? mockResults[m].confidence), 0) / scans.length;
    return { modality: m, grade, confidence: Math.round(confidence * 10) / 10 };
  });
  const finalGrade = Math.round(perModality.reduce((a, r) => a + r.grade, 0) / perModality.length);
  const agreement = perModality.every(r => r.grade === finalGrade) ? "concordant" : "discordant";
  const avgConf = perModality.reduce((a, r) => a + r.confidence, 0) / perModality.length;
  const boost = perModality.length > 1 && agreement === "concordant" ? 4.2 : perModality.length > 1 ? 1.8 : 0;
  return {
    perModality,
    finalGrade,
    finalConfidence: Math.min(99.5, Math.round((avgConf + boost) * 10) / 10),
    reliabilityBoost: boost,
    agreement,
  };
}

// ============================================================
// Clinical Interpretation + References (reused in workspace + overview)
// ============================================================
function ClinicalInterpretation({ patient, analysis, compact = false }: { patient: Patient; analysis: JointAnalysis; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Clinical Interpretation</p>
          {analysis.perModality.length > 1 && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
              analysis.agreement === "concordant" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
              {analysis.agreement === "concordant" ? "Cross-modality concordant" : "Cross-modality discordant"}
            </span>
          )}
          {analysis.reliabilityBoost > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              +{analysis.reliabilityBoost}% reliability
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 mb-3">
          The AI ensemble classified this {patient.age}-year-old {patient.gender.toLowerCase()} patient
          (BMI {patient.bmi}) as <span className="font-medium">Kellgren–Lawrence Grade {analysis.finalGrade} osteoarthritis</span> with
          a fused confidence of {analysis.finalConfidence}%. {gradeNarrative[analysis.finalGrade]}
          {analysis.perModality.length > 1 && " Multi-modality fusion of plain radiograph and MRI inputs strengthens the structural assessment by combining osseous evaluation from X-ray with soft-tissue (cartilage, meniscus, synovium) evaluation from MRI."}
        </p>
        <div className="space-y-3">
          {analysis.perModality.map(r => (
            <div key={r.modality} className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {r.modality === "xray" ? "Plain Radiograph" : "MRI"} findings
                </span>
                <GradeBadge grade={r.grade} />
                <span className="text-[10px] text-muted-foreground">{r.confidence}% conf.</span>
              </div>
              <ul className="space-y-1">
                {detailedFindings(r.modality, r.grade).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">Recommended next steps</p>
          <p className="text-xs text-foreground/90 leading-relaxed">{recommendationByGrade(analysis.finalGrade)}</p>
        </div>
      </div>

      {!compact && (
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Medical References</p>
            <span className="text-[10px] text-muted-foreground">Evidence base for this classification</span>
          </div>
          <ol className="space-y-2.5 list-decimal list-inside">
            {medicalReferences.map((r, i) => (
              <li key={i} className="text-xs leading-relaxed">
                <span className="text-foreground/90">{r.citation}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-4">{r.note}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Confirmation screen — review before starting diagnosis
// ============================================================
function ConfirmationScreen({ patients, onCancel, onStart }: { patients: Patient[]; onCancel: () => void; onStart: () => void }) {
  const totalScans = patients.reduce((s, p) => s + p.scans.length, 0);
  const totalEta = patients.reduce((s, p) => s + estimateSecondsForPatient(p), 0);
  const multiModalityPatients = patients.filter(p => getPatientModalities(p).length > 1);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Confirm Diagnosis</h1>
            <p className="text-xs text-muted-foreground">Review the cohort below, then start the AI analysis.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-1"><Users className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Patients</span></div>
            <p className="text-2xl font-semibold">{patients.length}</p>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-1"><Scan className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total scans</span></div>
            <p className="text-2xl font-semibold">{totalScans}</p>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-1"><Timer className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated time</span></div>
            <p className="text-2xl font-semibold">~{totalEta}s</p>
          </div>
        </div>

        {multiModalityPatients.length > 0 && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 mb-5 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/90 leading-relaxed">
              <span className="font-medium">{multiModalityPatients.length} patient{multiModalityPatients.length !== 1 ? "s" : ""}</span> in this cohort have both X-ray and MRI inputs.
              Joint analysis combines structural (osseous) features from radiographs with soft-tissue features from MRI,
              yielding a more reliable grade and confidence score.
            </p>
          </div>
        )}

        <div className="border rounded-xl divide-y mb-6 overflow-hidden">
          {patients.map(p => {
            const mods = getPatientModalities(p);
            return (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.id} · {p.scans.length} scan{p.scans.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  {mods.includes("xray") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium">X-Ray</span>}
                  {mods.includes("mri") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-medium">MRI</span>}
                  {mods.length > 1 && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Joint</span>}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />~{estimateSecondsForPatient(p)}s</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Back to selection
          </button>
          <button onClick={onStart} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Play className="w-4 h-4" />Start Diagnosis
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Processing screen — live progress + ETA countdown
// ============================================================
interface PatientProgress { patientId: string; progress: number; stage: string; status: "queued" | "processing" | "completed"; }

function ProcessingScreen({ patients, onComplete, onCancel }: { patients: Patient[]; onComplete: () => void; onCancel: () => void }) {
  const totalEta = useMemo(() => patients.reduce((s, p) => s + estimateSecondsForPatient(p), 0), [patients]);
  const [remaining, setRemaining] = useState(totalEta);
  const [progressMap, setProgressMap] = useState<Map<string, PatientProgress>>(() => {
    const m = new Map<string, PatientProgress>();
    patients.forEach((p, i) => m.set(p.id, { patientId: p.id, progress: 0, stage: i === 0 ? "Uploading scans..." : "Queued", status: i === 0 ? "processing" : "queued" }));
    return m;
  });

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Sequential processing simulation
  useEffect(() => {
    let cancelled = false;
    const stages = ["Uploading scans...", "Pre-processing (CLAHE + denoise)", "Artifact removal (Swin-UNet)", "Running AI ensemble inference", "Generating Grad-CAM heatmap", "Cross-modality fusion"];
    const run = async () => {
      for (let i = 0; i < patients.length; i++) {
        if (cancelled) return;
        const p = patients[i];
        const eta = estimateSecondsForPatient(p) * 1000;
        const tick = eta / 100;
        for (let prog = 0; prog <= 100; prog += 2) {
          if (cancelled) return;
          const stageIdx = Math.min(stages.length - 1, Math.floor(prog / (100 / stages.length)));
          setProgressMap(prev => {
            const next = new Map(prev);
            next.set(p.id, { patientId: p.id, progress: prog, stage: stages[stageIdx], status: "processing" });
            return next;
          });
          await new Promise(r => setTimeout(r, tick * 2));
        }
        setProgressMap(prev => {
          const next = new Map(prev);
          next.set(p.id, { patientId: p.id, progress: 100, stage: "Complete", status: "completed" });
          if (i + 1 < patients.length) {
            const np = patients[i + 1];
            next.set(np.id, { patientId: np.id, progress: 0, stage: "Uploading scans...", status: "processing" });
          }
          return next;
        });
      }
      if (!cancelled) setTimeout(onComplete, 600);
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = Array.from(progressMap.values()).filter(p => p.status === "completed").length;
  const overallProgress = (Array.from(progressMap.values()).reduce((s, p) => s + p.progress, 0)) / patients.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-16 flex flex-col items-center">
        {/* Centered countdown */}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Analyzing</p>
        <p className="text-6xl font-light tabular-nums tracking-tight mb-1">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          {completedCount} of {patients.length} complete · {Math.round(overallProgress)}%
        </p>

        {/* Slim overall bar */}
        <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden mb-10">
          <motion.div className="h-full bg-primary" animate={{ width: `${overallProgress}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Minimal per-patient list */}
        <div className="w-full space-y-3 mb-10">
          {patients.map(p => {
            const prog = progressMap.get(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <div className="w-4 flex-shrink-0">
                  {prog?.status === "completed"
                    ? <Check className="w-4 h-4 text-success" />
                    : prog?.status === "processing"
                    ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mx-auto" />}
                </div>
                <span className="truncate flex-1 text-foreground/90">{p.name}</span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {prog?.status === "queued" ? "Queued" : prog?.stage}
                </span>
              </div>
            );
          })}
        </div>

        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Results overview — combined findings + references for cohort
// ============================================================
function ResultsOverview({ patients, onOpenWorkspace, onBackToSelect }: { patients: Patient[]; onOpenWorkspace: (p: Patient) => void; onBackToSelect: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Diagnosis Complete</h1>
              <p className="text-xs text-muted-foreground">{patients.length} patient{patients.length !== 1 ? "s" : ""} analyzed with AI-assisted classification.</p>
            </div>
          </div>
          <button onClick={onBackToSelect} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            New cohort
          </button>
        </div>

        <div className="space-y-5">
          {patients.map(p => {
            const analysis = computeJointAnalysis(p);
            const mods = getPatientModalities(p);
            return (
              <div key={p.id} className="border rounded-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{p.name}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{p.id}</span>
                      <span className="text-[10px] text-muted-foreground">{p.age}yo · {p.gender} · BMI {p.bmi}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {mods.includes("xray") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-background border font-medium text-muted-foreground">X-Ray</span>}
                      {mods.includes("mri") && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-background border font-medium text-muted-foreground">MRI</span>}
                      {mods.length > 1 && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Joint analysis</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Final grade</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <GradeBadge grade={analysis.finalGrade} />
                        <ConfidenceGauge value={analysis.finalConfidence} />
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenWorkspace(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Open workspace<ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <ClinicalInterpretation patient={p} analysis={analysis} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Diagnostic Workspace
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

              {/* Clinical Interpretation + References */}
              <ClinicalInterpretation patient={patient} analysis={computeJointAnalysis(patient)} />

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
// Main Page — phase state machine
// ============================================================
// ============================================================
// History view — past diagnoses with inputs and outputs
// ============================================================
function HistoryView({ onOpen, onBack }: { onOpen: (p: Patient) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const history = useMemo(() => {
    const items = mockPatients
      .filter(p => p.status !== "pending" && p.scans.length > 0)
      .flatMap(p => p.scans.map(s => ({ patient: p, scan: s })))
      .filter(({ scan }) => scan.grade != null)
      .sort((a, b) => b.scan.date.localeCompare(a.scan.date));
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(({ patient }) =>
      patient.name.toLowerCase().includes(q) || patient.id.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Diagnosis History</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Past AI analyses with their inputs and outputs.</p>
          </div>
          <span className="text-xs text-muted-foreground">{history.length} record{history.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="rounded-xl border bg-card divide-y">
          {history.map(({ patient, scan }) => (
            <div key={`${patient.id}-${scan.id}`} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{patient.name}</p>
                  <span className="text-[10px] font-mono text-muted-foreground">{patient.id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{scan.date}
                  </span>
                  <span className="uppercase font-medium tracking-wide">{scan.modality === "xray" ? "X-Ray" : "MRI"}{scan.view ? ` · ${scan.view}` : ""}</span>
                  <span className="truncate">{scan.region}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  Input: {scan.preprocessing.join(" → ")} · Model: {scan.modelUsed}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Grade</p>
                  <div className="mt-0.5"><GradeBadge grade={scan.grade as number} /></div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</p>
                  <p className="text-sm font-semibold tabular-nums">{scan.aiConfidence?.toFixed(1)}%</p>
                </div>
                <button
                  onClick={() => onOpen(patient)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors"
                >
                  Open <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
              <Clock className="w-8 h-8" />
              <p className="text-sm">No diagnosis history yet</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type Phase = "select" | "history" | "confirm" | "processing" | "results" | "workspace";

export default function DiagnosticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("patient");
  const [phase, setPhase] = useState<Phase>(preselectedId ? "workspace" : "select");
  const [cohort, setCohort] = useState<Patient[]>([]);
  const [workspacePatient, setWorkspacePatient] = useState<Patient | null>(
    preselectedId ? mockPatients.find(p => p.id === preselectedId) ?? null : null
  );

  const goSelect = () => {
    setPhase("select");
    setCohort([]);
    setWorkspacePatient(null);
    setSearchParams({});
  };

  const openWorkspace = (p: Patient) => {
    setWorkspacePatient(p);
    setPhase("workspace");
    setSearchParams({ patient: p.id });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <PatientSelector key="selector" onConfirm={(patients) => { setCohort(patients); setPhase("confirm"); }} onOpenHistory={() => setPhase("history")} />
        )}
        {phase === "history" && (
          <HistoryView key="history" onBack={() => setPhase("select")} onOpen={openWorkspace} />
        )}
        {phase === "confirm" && (
          <ConfirmationScreen key="confirm" patients={cohort} onCancel={() => setPhase("select")} onStart={() => setPhase("processing")} />
        )}
        {phase === "processing" && (
          <ProcessingScreen key="processing" patients={cohort} onComplete={() => setPhase("results")} onCancel={goSelect} />
        )}
        {phase === "results" && (
          <ResultsOverview key="results" patients={cohort} onOpenWorkspace={openWorkspace} onBackToSelect={goSelect} />
        )}
        {phase === "workspace" && workspacePatient && (
          <DiagnosticWorkspace
            key="workspace"
            patient={workspacePatient}
            onBack={() => {
              if (cohort.length > 0) { setPhase("results"); setSearchParams({}); }
              else goSelect();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
