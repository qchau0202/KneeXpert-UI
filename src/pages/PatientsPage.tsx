import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Filter } from "lucide-react";
import { mockPatients, Patient } from "@/data/patients";
import { StatusBadge } from "@/components/StatusBadge";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { PatientDetailPanel } from "@/components/PatientDetailPanel";
import { AddPatientDialog } from "@/components/AddPatientDialog";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);

  const filtered = mockPatients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === null || p.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-auto">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-6">
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">Patients</h1>
              <p className="text-sm text-muted-foreground mt-1">Electronic Health Records & Case Management</p>
            </div>
            <button
              onClick={() => setShowAddPatient(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Patient
            </button>
          </motion.div>

          {/* Search & Grade Filter */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setGradeFilter(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ease-clinical ${
                  gradeFilter === null ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Grades
              </button>
              {[1, 2, 3, 4].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ease-clinical ${
                    gradeFilter === g ? "bg-background text-foreground shadow-ring-light" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Patient Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3">
            {filtered.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`card-clinical cursor-pointer transition-all hover:shadow-card-hover ${
                  selectedPatient?.id === patient.id ? "ring-2 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-muted flex items-center justify-center text-sm font-medium text-primary">
                      {patient.name.split(" ").slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{patient.name}</p>
                        <span className="text-mono text-xs text-muted-foreground">{patient.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {patient.age}yo · {patient.gender} · BMI {patient.bmi} · Pain {patient.painLevel}/10
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <GradeBadge grade={patient.grade} />
                    <ConfidenceGauge value={patient.aiConfidence} />
                    <StatusBadge status={patient.status} />
                    <span className="text-xs text-muted-foreground">{patient.lastVisit}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {selectedPatient && (
        <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}

      <AddPatientDialog open={showAddPatient} onClose={() => setShowAddPatient(false)} />
    </div>
  );
}
