import { motion } from "framer-motion";
import { ArrowLeft, Download, Printer, Send, Edit3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockPatients } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient") || "PT-8842";
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];

  // Build progression data from timeline
  const diagnosisHistory = patient.timeline
    .filter(e => e.type === "diagnosis" && e.grade !== undefined)
    .reverse()
    .map(e => ({
      date: e.date,
      grade: e.grade!,
      confidence: e.confidence!,
      summary: e.summary,
    }));

  const progressionData = diagnosisHistory.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    grade: d.grade,
    confidence: d.confidence,
  }));

  const gradeChanged = diagnosisHistory.length >= 2;
  const gradeTrend = gradeChanged
    ? diagnosisHistory[diagnosisHistory.length - 1].grade - diagnosisHistory[0].grade
    : 0;

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-1 overflow-auto">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-[70ch] mx-auto py-10 px-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Report Header */}
          <div className="card-clinical mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="section-header mb-2">KneeXpert Clinical Diagnostic Report</p>
                <h1 className="text-2xl font-medium tracking-tight">{patient.name}</h1>
                <p className="text-mono text-xs text-muted-foreground mt-1">{patient.id} · Generated {new Date().toLocaleDateString()}</p>
              </div>
              <StatusBadge status={patient.status} />
            </div>

            <div className="grid grid-cols-5 gap-4 pt-4 border-t">
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
              <div>
                <p className="section-header mb-1">Last Visit</p>
                <p className="text-sm font-medium">{patient.lastVisit}</p>
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
                      AI Confidence: {patient.aiConfidence}% · Model: DenseNet201 · Pre-processing: CLAHE + GAN Denoise
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
                    {patient.grade >= 2 && " Cartilage thinning detected in the weight-bearing region."}
                    {" "}Grad-CAM activation maps highlight the areas of concern in the provided heatmap visualization.
                  </>
                ) : (
                  "Analysis pending. Please upload imaging data to generate AI diagnostic summary."
                )}
              </p>
            </div>

            {/* Key Findings */}
            {patient.grade !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium mb-1">Joint Space</p>
                  <p className="text-xs text-muted-foreground">{patient.grade >= 3 ? "Significant narrowing (>50%)" : patient.grade >= 2 ? "Moderate narrowing" : "Mild narrowing"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium mb-1">Osteophytes</p>
                  <p className="text-xs text-muted-foreground">{patient.grade >= 3 ? "Definite, multiple" : patient.grade >= 2 ? "Possible formation" : "Doubtful"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium mb-1">Sclerosis</p>
                  <p className="text-xs text-muted-foreground">{patient.grade >= 3 ? "Subchondral sclerosis present" : "Not significant"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-medium mb-1">Deformity</p>
                  <p className="text-xs text-muted-foreground">{patient.grade >= 4 ? "Bone deformity present" : "No significant deformity"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Progression / Diagnosis History */}
          {diagnosisHistory.length > 0 && (
            <div className="card-clinical mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="section-header">Diagnosis History & Progression</p>
                {gradeChanged && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    gradeTrend > 0 ? "text-destructive" : gradeTrend < 0 ? "text-success" : "text-muted-foreground"
                  }`}>
                    {gradeTrend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : gradeTrend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {gradeTrend > 0 ? "Worsening" : gradeTrend < 0 ? "Improving" : "Stable"}
                  </div>
                )}
              </div>

              {/* Progression Chart */}
              {progressionData.length >= 2 && (
                <div className="mb-4">
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={progressionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
                      <Line type="monotone" dataKey="grade" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(217, 91%, 60%)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* History Table */}
              <div className="space-y-2">
                {diagnosisHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground w-20 flex-shrink-0">{entry.date}</div>
                    <GradeBadge grade={entry.grade} />
                    <div className="flex-1 text-xs">{entry.summary}</div>
                    <div className="text-mono text-xs text-muted-foreground">{entry.confidence}%</div>
                    {i < diagnosisHistory.length - 1 && (
                      <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        diagnosisHistory[i + 1].grade < entry.grade ? "bg-destructive/10 text-destructive" : 
                        diagnosisHistory[i + 1].grade > entry.grade ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {diagnosisHistory[i + 1].grade < entry.grade ? "↑ Worse" : 
                         diagnosisHistory[i + 1].grade > entry.grade ? "↓ Better" : "= Same"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Treatment Recommendations */}
          <div className="card-clinical mb-6">
            <p className="section-header mb-3">Treatment Recommendations</p>
            <div className="space-y-2">
              {patient.grade !== null && patient.grade >= 3 ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Referral to orthopedic surgery for evaluation of total knee arthroplasty (TKA)
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Consider intra-articular corticosteroid injection for pain management
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Physical therapy: strengthening and range of motion exercises
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Weight management counseling (BMI: {patient.bmi})
                  </div>
                </>
              ) : patient.grade !== null ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Conservative management: NSAIDs and lifestyle modifications
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Follow-up imaging in 6 months to monitor progression
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    Physical therapy and low-impact exercise recommended
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Awaiting diagnosis to generate recommendations.</p>
              )}
            </div>
          </div>

          {/* Complete Timeline */}
          <div className="card-clinical mb-6">
            <p className="section-header mb-3">Complete Patient Timeline</p>
            <div className="space-y-0">
              {patient.timeline.map((entry, i) => (
                <div key={i} className="flex gap-3 pb-3 relative">
                  {i < patient.timeline.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                  )}
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border-2 ${
                    entry.type === "diagnosis" ? "border-primary bg-primary-muted" :
                    entry.type === "scan" ? "border-muted-foreground bg-muted" :
                    entry.type === "report" ? "border-success bg-success/10" :
                    "border-warning bg-warning/10"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{entry.date}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{entry.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{entry.summary}</p>
                  </div>
                </div>
              ))}
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

      {/* Actions Sidebar */}
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
          <p className="section-header mb-3">Report Summary</p>
          <div className="space-y-2">
            <div className="text-xs">
              <p className="text-muted-foreground">Current Grade</p>
              <p className="font-medium">{patient.grade !== null ? `Grade ${patient.grade}` : "Pending"}</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-medium">{patient.aiConfidence ? `${patient.aiConfidence}%` : "—"}</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Diagnoses Count</p>
              <p className="font-medium">{diagnosisHistory.length}</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Progression</p>
              <p className={`font-medium ${gradeTrend > 0 ? "text-destructive" : gradeTrend < 0 ? "text-success" : ""}`}>
                {gradeChanged ? (gradeTrend > 0 ? "Worsening" : gradeTrend < 0 ? "Improving" : "Stable") : "Insufficient data"}
              </p>
            </div>
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
