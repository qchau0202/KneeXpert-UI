import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Filter, Calendar, TrendingUp, Users, Clock, AlertTriangle } from "lucide-react";
import { mockPatients, Patient } from "@/data/patients";
import { StatusBadge } from "@/components/StatusBadge";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { PatientDetailPanel } from "@/components/PatientDetailPanel";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

const stats = [
  { label: "Total Patients", value: "127", icon: Users, trend: "+12 this month" },
  { label: "Pending Analysis", value: "8", icon: Clock, trend: "3 urgent" },
  { label: "Avg. Confidence", value: "91.4%", icon: TrendingUp, trend: "+2.1% vs last month" },
  { label: "Flagged Cases", value: "4", icon: AlertTriangle, trend: "Requires review" },
];

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockPatients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-auto">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-6">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Clinical Patient Management Overview</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Patient
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card-clinical flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-muted flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-medium tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.trend}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Search & Filter Bar */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Patient ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {["all", "pending", "analyzed", "confirmed", "flagged"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-200 ease-clinical ${
                    statusFilter === s
                      ? "bg-background text-foreground shadow-ring-light"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Patient Table */}
          <motion.div variants={itemVariants} className="card-clinical !p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 section-header">Patient ID</th>
                  <th className="text-left px-4 py-3 section-header">Name</th>
                  <th className="text-left px-4 py-3 section-header">Age</th>
                  <th className="text-left px-4 py-3 section-header">Grade</th>
                  <th className="text-left px-4 py-3 section-header">Confidence</th>
                  <th className="text-left px-4 py-3 section-header">Status</th>
                  <th className="text-left px-4 py-3 section-header">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedPatient?.id === patient.id ? "bg-primary-muted" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-mono text-sm font-medium">{patient.id}</td>
                    <td className="px-4 py-3 text-sm">{patient.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{patient.age}</td>
                    <td className="px-4 py-3"><GradeBadge grade={patient.grade} /></td>
                    <td className="px-4 py-3"><ConfidenceGauge value={patient.aiConfidence} /></td>
                    <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{patient.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      </div>

      {/* Detail Panel */}
      {selectedPatient && (
        <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  );
}
