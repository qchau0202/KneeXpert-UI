import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Users, SlidersHorizontal } from "lucide-react";
import { mockPatients, Patient } from "@/data/patients";
import { StatusBadge } from "@/components/StatusBadge";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { PatientDetailPanel } from "@/components/PatientDetailPanel";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { cn } from "@/lib/utils";

const anim = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } };

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const filtered = mockPatients.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
    const matchGrade = gradeFilter === null || p.grade === gradeFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 overflow-auto">
        <motion.div variants={anim} initial="hidden" animate="visible" className="p-3 sm:p-4 lg:p-5 space-y-4 max-w-[1400px] mx-auto">
          {/* Header */}
          <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Patients</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Electronic Health Records & Case Management</p>
            </div>
            <button
              onClick={() => setShowAddPatient(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors self-start"
            >
              <Plus className="w-4 h-4" />New Patient
            </button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={item} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter */}
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                  {["all", "pending", "analyzed", "confirmed", "flagged"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium capitalize transition-all",
                        statusFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {/* Grade filter */}
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                  <button onClick={() => setGradeFilter(null)} className={cn("px-2 py-1.5 rounded-md text-xs font-medium transition-all", gradeFilter === null ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>All</button>
                  {[0, 1, 2, 3, 4].map((g) => (
                    <button key={g} onClick={() => setGradeFilter(g)} className={cn("px-2 py-1.5 rounded-md text-xs font-medium transition-all", gradeFilter === g ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>G{g}</button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</p>
          </motion.div>

          {/* Patient Cards */}
          <motion.div variants={item} className="space-y-2">
            {filtered.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={cn(
                  "card-clinical cursor-pointer transition-all hover:shadow-card-hover",
                  selectedPatient?.id === patient.id && "ring-2 ring-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                      {patient.name.split(" ").slice(-1)[0][0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{patient.name}</p>
                        <span className="text-mono text-[10px] text-muted-foreground">{patient.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {patient.age}yo · {patient.gender} · BMI {patient.bmi} · Pain {patient.painLevel}/10
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <GradeBadge grade={patient.grade} />
                    <ConfidenceGauge value={patient.aiConfidence} />
                    <StatusBadge status={patient.status} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{patient.lastVisit}</span>
                  </div>
                </div>
                {/* Mobile-only badges */}
                <div className="flex sm:hidden items-center gap-2 mt-2 flex-wrap">
                  <GradeBadge grade={patient.grade} />
                  <StatusBadge status={patient.status} />
                  <span className="text-xs text-muted-foreground">{patient.lastVisit}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No patients match your criteria
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {selectedPatient && <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
      <AddPatientDialog open={showAddPatient} onClose={() => setShowAddPatient(false)} />
    </div>
  );
}
