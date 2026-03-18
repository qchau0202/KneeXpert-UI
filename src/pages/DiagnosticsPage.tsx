import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ZoomIn, ZoomOut, Move, RotateCcw, Check, X, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockPatients } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { StatusBadge } from "@/components/StatusBadge";

const models = [
  { id: "densenet", name: "DenseNet201", description: "Detailed classification" },
  { id: "vit", name: "ViT-B/16", description: "Global context analysis" },
];

export default function DiagnosticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient") || "PT-8842";
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];

  const [activeModel, setActiveModel] = useState("densenet");
  const [showGradCAM, setShowGradCAM] = useState(true);

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
            <p className="text-xs text-muted-foreground">{patient.name} · {patient.age}yo · {patient.gender}</p>
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
        {/* Left: Original Image */}
        <div className="flex-1 border-r flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <span className="section-header">Original DICOM</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded hover:bg-muted transition-colors"><ZoomIn className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors"><ZoomOut className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors"><Move className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors"><RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="flex-1 bg-foreground/[0.02] flex items-center justify-center">
            <div className="w-80 h-80 rounded-xl bg-foreground/5 border border-dashed border-border flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">X-ray Viewer</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upload DICOM or drag image here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Output */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b flex items-center justify-between px-4">
            <span className="section-header">AI Analysis</span>
            {/* Model Switcher */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ease-clinical ${
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
            {/* Grad-CAM visualization placeholder */}
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
                <p className="text-xs text-muted-foreground mt-0.5">{models.find(m => m.id === activeModel)?.name} · {models.find(m => m.id === activeModel)?.description}</p>
              </div>
            </motion.div>

            {/* Grad-CAM toggle */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => setShowGradCAM(!showGradCAM)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shadow-card ${
                  showGradCAM ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                Grad-CAM {showGradCAM ? "On" : "Off"}
              </button>
            </div>
          </div>

          {/* Agree/Disagree Controls */}
          <div className="h-16 border-t flex items-center justify-between px-5">
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
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium text-warning hover:bg-warning hover:text-warning-foreground transition-colors">
                <X className="w-4 h-4" />
                Disagree
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
