import { motion } from "framer-motion";
import { ArrowLeft, Download, Printer, Send, Edit3 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockPatients } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient") || "PT-8842";
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Main report content */}
      <div className="flex-1 overflow-auto">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-[65ch] mx-auto py-10 px-6">
          {/* Back */}
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Report Header */}
          <div className="card-clinical mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="section-header mb-2">Clinical Diagnostic Report</p>
                <h1 className="text-2xl font-medium tracking-tight">{patient.name}</h1>
                <p className="text-mono text-xs text-muted-foreground mt-1">{patient.id} · Generated {new Date().toLocaleDateString()}</p>
              </div>
              <StatusBadge status={patient.status} />
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="section-header mb-1">Age</p>
                <p className="text-sm font-medium">{patient.age}</p>
              </div>
              <div>
                <p className="section-header mb-1">Gender</p>
                <p className="text-sm font-medium">{patient.gender}</p>
              </div>
              <div>
                <p className="section-header mb-1">BMI</p>
                <p className="text-sm font-medium">{patient.bmi}</p>
              </div>
              <div>
                <p className="section-header mb-1">Pain Level</p>
                <p className="text-sm font-medium">{patient.painLevel}/10</p>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="card-clinical mb-6">
            <p className="section-header mb-3">Medical History</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{patient.history}</p>
            <p className="section-header mb-3 mt-4">Current Symptoms</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{patient.symptoms}</p>
          </div>

          {/* AI Analysis Summary */}
          <div className="card-clinical mb-6">
            <p className="section-header mb-3">AI Diagnostic Summary</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <GradeBadge grade={patient.grade} className="!w-10 !h-10 !text-base" />
                <div>
                  <p className="text-sm font-medium">
                    {patient.grade !== null ? `Grade ${patient.grade} Osteoarthritis` : "Pending Analysis"}
                  </p>
                  {patient.aiConfidence && (
                    <p className="text-xs text-muted-foreground">
                      AI Confidence: {patient.aiConfidence}% · Model: DenseNet201
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-primary-muted rounded-lg p-4 mt-3">
              <p className="text-sm leading-relaxed">
                {patient.grade !== null ? (
                  <>
                    Automated analysis of the submitted radiographic images indicates <strong>Grade {patient.grade} Osteoarthritis</strong> with
                    a confidence score of <strong>{patient.aiConfidence}%</strong>. Key findings include joint space narrowing
                    in the medial compartment with {patient.grade >= 3 ? "definite" : "possible"} osteophyte formation.
                    {patient.grade >= 3 && " Subchondral sclerosis is also noted."}
                    {" "}Grad-CAM activation maps highlight the areas of concern in the provided heatmap visualization.
                  </>
                ) : (
                  "Analysis pending. Please upload imaging data to generate AI diagnostic summary."
                )}
              </p>
            </div>
          </div>

          {/* Imaging */}
          <div className="card-clinical mb-6">
            <p className="section-header mb-3">Imaging & Grad-CAM</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-lg bg-foreground/[0.03] border border-dashed flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Original X-ray</p>
              </div>
              <div className="aspect-square rounded-lg bg-primary-muted/50 border border-dashed flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Grad-CAM Heatmap</p>
              </div>
            </div>
          </div>

          {/* Doctor Notes */}
          <div className="card-clinical mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="section-header">Clinical Notes</p>
              <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            </div>
            <textarea
              className="w-full h-32 resize-none border rounded-lg p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 bg-background"
              placeholder="Add clinical notes, observations, and treatment recommendations..."
              defaultValue={patient.status === "confirmed" ? "Findings confirmed. Patient referred to Orthopedic Surgery for evaluation of total knee arthroplasty. Follow-up imaging in 6 months recommended." : ""}
            />
          </div>
        </motion.div>
      </div>

      {/* Sticky Actions Sidebar */}
      <div className="w-56 border-l bg-muted/30 p-4 space-y-3 flex-shrink-0">
        <p className="section-header mb-4">Quick Actions</p>

        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <Printer className="w-4 h-4" />
          Print Report
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <Send className="w-4 h-4" />
          Refer to Specialist
        </button>

        <div className="pt-4 border-t mt-4">
          <p className="section-header mb-3">Report History</p>
          <div className="space-y-2">
            <div className="text-xs">
              <p className="text-muted-foreground">Generated</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Last Modified</p>
              <p className="font-medium">{patient.lastVisit}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
