import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Sun, Contrast, Maximize2, Layers, Upload, Image, FileImage, Loader2, CheckCircle2, Brain, Sparkles, AlertTriangle, User, Calendar, Activity as ActivityIcon, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockPatients, type Modality } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticsToolbar } from "@/components/diagnostics/DiagnosticsToolbar";
import { MriPipelinePanel } from "@/components/diagnostics/MriPipelinePanel";

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

// Mock result for completed analysis
const mockResults = {
  xray: { grade: 3, confidence: 94.2, findings: ["Joint space narrowing (medial compartment)", "Osteophyte formation (tibial plateau)", "Subchondral sclerosis detected"] },
  mri: { grade: 2, confidence: 87.6, findings: ["Cartilage thinning (medial femoral condyle)", "Mild meniscal degeneration", "No significant effusion"] },
};

export default function DiagnosticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient") || "PT-8842";
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeModality, setActiveModality] = useState<Modality>(patient.modality);
  const models = activeModality === "xray" ? xrayModels : mriModels;
  const views = activeModality === "xray" ? xrayViews : mriViews;

  const [activeModel, setActiveModel] = useState(models[0].id);
  const [showGradCAM, setShowGradCAM] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState("pan");
  const [overrideGrade, setOverrideGrade] = useState<number | null>(null);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [gradcamOpacity, setGradcamOpacity] = useState(70);
  const [selectedView, setSelectedView] = useState(views[0]);

  // Upload flow state
  const [showPatientInfo, setShowPatientInfo] = useState(true);
  const [diagnosticStage, setDiagnosticStage] = useState<DiagnosticStage>("idle");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stagesCompleted, setStagesCompleted] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const currentScan = patient.scans.find(s => s.modality === activeModality && s.view === selectedView) || patient.scans[0];
  const stages = activeModality === "xray" ? xrayStages : mriStages;
  const result = mockResults[activeModality];

  const handleModalitySwitch = (mod: Modality) => {
    setActiveModality(mod);
    const newModels = mod === "xray" ? xrayModels : mriModels;
    setActiveModel(newModels[0].id);
    const newViews = mod === "xray" ? xrayViews : mriViews;
    setSelectedView(newViews[0]);
    // Reset diagnostic flow
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

  // Progress through stages
  useEffect(() => {
    if (diagnosticStage === "idle" || diagnosticStage === "complete") return;

    const currentStage = stages[currentStageIndex];
    if (!currentStage) return;

    // Simulate upload progress for uploading stage
    if (currentStage.id === "uploading") {
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) { clearInterval(interval); return 100; }
          return prev + Math.random() * 15 + 5;
        });
      }, 200);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setStagesCompleted(prev => [...prev, currentStage.id]);
        setCurrentStageIndex(prev => prev + 1);
        if (currentStageIndex + 1 < stages.length) {
          setDiagnosticStage(stages[currentStageIndex + 1].id);
        }
      }, currentStage.duration);

      return () => { clearInterval(interval); clearTimeout(timer); };
    }

    if (currentStage.id === "complete") {
      setDiagnosticStage("complete");
      return;
    }

    const timer = setTimeout(() => {
      setStagesCompleted(prev => [...prev, currentStage.id]);
      setCurrentStageIndex(prev => prev + 1);
      if (currentStageIndex + 1 < stages.length) {
        setDiagnosticStage(stages[currentStageIndex + 1].id);
      }
    }, currentStage.duration);

    return () => clearTimeout(timer);
  }, [diagnosticStage, currentStageIndex, stages]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startDiagnosticFlow(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startDiagnosticFlow(file.name);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const resetDiagnostic = () => {
    setDiagnosticStage("idle");
    setStagesCompleted([]);
    setCurrentStageIndex(0);
    setUploadProgress(0);
    setUploadedFileName("");
  };

  const isProcessing = diagnosticStage !== "idle" && diagnosticStage !== "complete";

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
          <button onClick={() => navigate("/patients")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
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
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 mr-2">
            <button onClick={() => handleModalitySwitch("xray")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeModality === "xray" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>X-Ray</button>
            <button onClick={() => handleModalitySwitch("mri")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeModality === "mri" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>MRI</button>
          </div>
          <StatusBadge status={diagnosticStage === "complete" ? "analyzed" : patient.status} />
          {diagnosticStage === "complete" && (
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-muted-foreground">AI Grade:</span>
              <GradeBadge grade={result.grade} />
              <ConfidenceGauge value={result.confidence} />
            </div>
          )}
          {diagnosticStage === "idle" && patient.grade !== null && (
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-muted-foreground">AI Grade:</span>
              <GradeBadge grade={patient.grade} />
              <ConfidenceGauge value={patient.aiConfidence} />
            </div>
          )}
        </div>
      </div>

      {/* Patient Info Panel */}
      <AnimatePresence>
        {showPatientInfo && diagnosticStage === "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b bg-muted/30"
          >
            <div className="px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Patient Information
                </h2>
                <button onClick={() => setShowPatientInfo(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Hide</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Full Name</p>
                  <p className="text-sm font-medium">{patient.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Patient ID</p>
                  <p className="text-sm font-mono">{patient.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Age / Gender</p>
                  <p className="text-sm">{patient.age}yo · {patient.gender}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">BMI</p>
                  <p className="text-sm">{patient.bmi}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Pain Level</p>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-3 rounded-sm ${i < patient.painLevel ? (patient.painLevel >= 7 ? "bg-destructive" : patient.painLevel >= 4 ? "bg-warning" : "bg-success") : "bg-muted"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">{patient.painLevel}/10</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Last Visit</p>
                  <p className="text-sm flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" />{patient.lastVisit}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Medical History</p>
                  <p className="text-xs text-foreground/80">{patient.history}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Current Symptoms</p>
                  <p className="text-xs text-foreground/80">{patient.symptoms}</p>
                </div>
              </div>
              {patient.scans.length > 0 && patient.scans[0].grade !== null && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Previous Scans</p>
                  <div className="flex gap-2 flex-wrap">
                    {patient.scans.map(scan => (
                      <div key={scan.id} className="px-2.5 py-1.5 rounded-lg bg-background border text-[11px] flex items-center gap-2">
                        <span className="font-medium">{scan.modality.toUpperCase()}</span>
                        <span className="text-muted-foreground">{scan.view}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{scan.date}</span>
                        {scan.grade !== null && <GradeBadge grade={scan.grade} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowPatientInfo(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Proceed to Upload <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showPatientInfo && diagnosticStage === "idle" && (
        <div className="border-b px-5 py-1.5 bg-muted/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{patient.name}</span> · {patient.age}yo · {patient.gender} · BMI {patient.bmi} · Pain {patient.painLevel}/10
          </p>
          <button onClick={() => setShowPatientInfo(true)} className="text-xs text-primary hover:underline">Show details</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <DiagnosticsToolbar activeTool={activeTool} setActiveTool={setActiveTool} zoom={zoom} setZoom={setZoom} setBrightness={setBrightness} setContrast={setContrast} />

        {/* Left: Original Image / Upload */}
        <div className="flex-1 border-r flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="section-header">Original {activeModality === "xray" ? "X-Ray" : "MRI"} Scan</span>
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 ml-2">
                {views.map(view => (
                  <button key={view} onClick={() => setSelectedView(view)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${selectedView === view ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground"}`}>{view}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {diagnosticStage !== "idle" && (
                <button onClick={resetDiagnostic} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Reset</button>
              )}
              <span className="text-mono text-[10px] text-muted-foreground">{zoom}% · {activeTool}</span>
            </div>
          </div>

          <div
            className={`flex-1 bg-foreground/[0.02] flex items-center justify-center relative overflow-hidden transition-colors ${isDragging ? "bg-primary/5 border-primary" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input ref={fileInputRef} type="file" accept=".dcm,.dicom,.jpg,.jpeg,.png,.nii,.nii.gz" className="hidden" onChange={handleFileChange} />

            <AnimatePresence mode="wait">
              {diagnosticStage === "idle" ? (
                /* Upload prompt */
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-80 h-80 rounded-xl bg-foreground/5 border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer"
                  style={{ transform: `scale(${zoom / 100})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                  onClick={handleFileSelect}
                >
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{selectedView} {activeModality === "xray" ? "Knee X-ray" : "Knee MRI"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to upload</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Supports DICOM, JPEG, PNG{activeModality === "mri" ? ", NIfTI" : ""}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Upload {activeModality === "xray" ? "DICOM" : "MRI DICOM"}
                  </button>
                </motion.div>
              ) : diagnosticStage === "complete" ? (
                /* Mock uploaded image */
                <motion.div
                  key="result-image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-80 h-80 rounded-xl bg-foreground/[0.08] border border-border flex items-center justify-center relative"
                  style={{ transform: `scale(${zoom / 100})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                >
                  {/* Mock X-ray / MRI visualization */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className={`w-full h-full ${activeModality === "xray" ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"}`}>
                      {/* Mock knee joint outline */}
                      <svg className="w-full h-full opacity-30" viewBox="0 0 200 200">
                        <ellipse cx="100" cy="80" rx="55" ry="40" fill="none" stroke="white" strokeWidth="1" />
                        <ellipse cx="100" cy="130" rx="50" ry="35" fill="none" stroke="white" strokeWidth="1" />
                        <line x1="60" y1="95" x2="60" y2="110" stroke="white" strokeWidth="0.5" />
                        <line x1="140" y1="95" x2="140" y2="110" stroke="white" strokeWidth="0.5" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded">{uploadedFileName}</span>
                    <span className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded">{selectedView} · {activeModality.toUpperCase()}</span>
                  </div>
                </motion.div>
              ) : (
                /* Processing stages */
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-96 p-6 rounded-xl bg-background border shadow-card"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <p className="text-sm font-medium">Processing {activeModality === "xray" ? "X-Ray" : "MRI"} Scan</p>
                  </div>
                  <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">{uploadedFileName}</span>
                  </div>

                  <div className="space-y-3">
                    {stages.map((stage, i) => {
                      const isCompleted = stagesCompleted.includes(stage.id);
                      const isCurrent = i === currentStageIndex && diagnosticStage !== ("complete" as DiagnosticStage);
                      const isPending = !isCompleted && !isCurrent;

                      return (
                        <div key={stage.id} className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : isCurrent ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs ${isCurrent ? "text-foreground font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                              {stage.label}
                            </p>
                            {isCurrent && stage.id === "uploading" && (
                              <div className="mt-1.5">
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">{Math.min(Math.round(uploadProgress), 100)}%</p>
                              </div>
                            )}
                            {isCurrent && stage.id === "inference" && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Brain className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[10px] text-primary">Majority voting in progress...</span>
                              </div>
                            )}
                            {isCurrent && stage.id === "artifact-removal" && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[10px] text-primary">Removing motion blur & stripe artifacts...</span>
                              </div>
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

          {/* Image Controls */}
          <div className="h-12 border-t flex items-center gap-4 px-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(parseInt(e.target.value))} className="w-20 accent-primary h-1" />
              <span className="text-mono text-[10px] text-muted-foreground w-8">{brightness}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast className="w-3.5 h-3.5 text-muted-foreground" />
              <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(parseInt(e.target.value))} className="w-20 accent-primary h-1" />
              <span className="text-mono text-[10px] text-muted-foreground w-8">{contrast}%</span>
            </div>
            <button className="ml-auto p-1.5 rounded hover:bg-muted transition-colors" title="Fullscreen">
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {activeModality === "mri" && diagnosticStage === "complete" && <MriPipelinePanel scan={currentScan} />}
        </div>

        {/* Right: AI Output */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="section-header">AI Analysis</span>
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              {activeModality === "mri" && diagnosticStage === "complete" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Enhanced (Artifact-Free)</span>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {models.map((model) => (
                <button key={model.id} onClick={() => setActiveModel(model.id)} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${activeModel === model.id ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground hover:text-foreground"}`}>
                  {model.name.length > 20 ? model.name.split(" ").slice(0, 2).join(" ") : model.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-foreground/[0.02] flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {diagnosticStage === "complete" ? (
                /* Mock Grad-CAM result */
                <motion.div
                  key="gradcam-result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-80 h-80 rounded-xl relative overflow-hidden"
                >
                  {/* Base image (dark) */}
                  <div className={`absolute inset-0 ${activeModality === "xray" ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"}`}>
                    <svg className="w-full h-full opacity-20" viewBox="0 0 200 200">
                      <ellipse cx="100" cy="80" rx="55" ry="40" fill="none" stroke="white" strokeWidth="1" />
                      <ellipse cx="100" cy="130" rx="50" ry="35" fill="none" stroke="white" strokeWidth="1" />
                    </svg>
                  </div>
                  {/* Grad-CAM heatmap overlay */}
                  {showGradCAM && (
                    <div className="absolute inset-0" style={{ opacity: gradcamOpacity / 100 }}>
                      <div className="absolute top-1/4 left-1/3 w-32 h-24 rounded-full bg-gradient-radial from-red-500/60 via-yellow-500/30 to-transparent blur-lg" />
                      <div className="absolute top-1/2 left-1/4 w-20 h-16 rounded-full bg-gradient-radial from-orange-500/40 via-yellow-500/20 to-transparent blur-md" />
                      <div className="absolute bottom-1/3 right-1/3 w-16 h-12 rounded-full bg-gradient-radial from-yellow-500/30 to-transparent blur-md" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded font-medium">
                      Grad-CAM · {models.find(m => m.id === activeModel)?.name}
                    </span>
                    <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                      Grade {result.grade} · {result.confidence}%
                    </span>
                  </div>
                </motion.div>
              ) : isProcessing ? (
                /* Processing state on right */
                <motion.div key="processing-right" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for analysis to complete...</p>
                  <p className="text-[10px] text-muted-foreground">Grad-CAM heatmap will appear here</p>
                </motion.div>
              ) : (
                /* Idle placeholder */
                <motion.div key="idle-right" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-80 h-80 rounded-xl bg-foreground/5 border border-dashed border-border flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-primary-muted flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 15l4-4 3 3 4-4 7 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Grad-CAM Heatmap</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload a scan to begin analysis</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grad-CAM Controls */}
            {diagnosticStage === "complete" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-card border">
                <button onClick={() => setShowGradCAM(!showGradCAM)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${showGradCAM ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Grad-CAM {showGradCAM ? "On" : "Off"}
                </button>
                {showGradCAM && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Opacity</span>
                    <input type="range" min="10" max="100" value={gradcamOpacity} onChange={e => setGradcamOpacity(parseInt(e.target.value))} className="w-16 accent-primary h-1" />
                    <span className="text-mono text-[10px] text-muted-foreground w-6">{gradcamOpacity}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model & Pipeline Info */}
          <div className="px-4 py-2 border-t bg-muted/20">
            <div className="flex items-center gap-4 text-[11px] flex-wrap">
              <div><span className="text-muted-foreground">Pipeline: </span><span className="font-medium">{activeModality === "xray" ? "X-Ray (Phase I)" : "MRI (Phase II)"}</span></div>
              <div><span className="text-muted-foreground">Model: </span><span className="font-medium">{models.find(m => m.id === activeModel)?.name}</span></div>
              <div><span className="text-muted-foreground">Accuracy: </span><span className="font-medium">{models.find(m => m.id === activeModel)?.accuracy}</span></div>
              {activeModality === "xray" && <div><span className="text-muted-foreground">Strategy: </span><span className="font-medium">Ensemble + Majority Voting</span></div>}
              {activeModality === "mri" && <div><span className="text-muted-foreground">Restoration: </span><span className="font-medium">Swin-UNet (KMAR-50K)</span></div>}
            </div>
          </div>

          {/* Results / Agree-Disagree */}
          <div className="border-t px-5 py-3">
            {diagnosticStage === "complete" ? (
              <>
                {/* Findings summary */}
                <div className="mb-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <p className="text-xs font-medium text-success">Analysis Complete</p>
                  </div>
                  <div className="space-y-1">
                    {result.findings.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="w-1 h-1 rounded-full bg-foreground/30 mt-1.5 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">AI Classification: </span>
                    <span className="font-medium">Grade {result.grade} Osteoarthritis</span>
                    <span className="text-muted-foreground ml-1">({result.confidence}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-success hover:bg-success hover:text-success-foreground transition-colors">
                      <Check className="w-4 h-4" />Agree
                    </button>
                    <button onClick={() => setShowOverridePanel(!showOverridePanel)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-warning hover:bg-warning hover:text-warning-foreground transition-colors">
                      <X className="w-4 h-4" />Disagree & Override
                    </button>
                  </div>
                </div>

                {showOverridePanel && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 p-4 rounded-lg bg-warning/5 border border-warning/20">
                    <p className="text-xs font-medium mb-3">Manual Grade Override</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Correct Grade:</span>
                      {[0, 1, 2, 3, 4].map(g => (
                        <button key={g} onClick={() => setOverrideGrade(g)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${overrideGrade === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{g}</button>
                      ))}
                    </div>
                    <textarea value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)} placeholder="Clinical reasoning for override (required for retraining data)..." className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    <div className="flex justify-end mt-2 gap-2">
                      <button onClick={() => setShowOverridePanel(false)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">Cancel</button>
                      <button className="px-3 py-1.5 text-xs rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors">Submit Override & Flag for Retraining</button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-2">
                <p className="text-xs text-muted-foreground">
                  {isProcessing ? "Analysis in progress..." : "Upload a scan to begin AI-assisted diagnosis"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
