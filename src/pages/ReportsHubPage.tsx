import { useState } from "react";
import { motion } from "framer-motion";
import { Search, FileText, Clock, AlertTriangle, CheckCircle2, Eye, Download, TrendingUp, TrendingDown, Minus, Filter, ArrowRight, BarChart3 } from "lucide-react";
import { mockPatients, Patient } from "@/data/patients";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

// Simulated recently viewed
const recentlyViewed = ["PT-8842", "PT-6105", "PT-5530"];

// Simulated report metadata per patient
const reportMeta: Record<string, { generatedDate: string; version: number; exported: boolean; lastViewedAgo: string }> = {
  "PT-8842": { generatedDate: "2026-03-15", version: 3, exported: true, lastViewedAgo: "10 min ago" },
  "PT-7291": { generatedDate: "2026-03-14", version: 1, exported: false, lastViewedAgo: "2 hrs ago" },
  "PT-6105": { generatedDate: "2026-03-12", version: 2, exported: true, lastViewedAgo: "25 min ago" },
  "PT-5530": { generatedDate: "2026-03-10", version: 1, exported: false, lastViewedAgo: "1 hr ago" },
  "PT-4417": { generatedDate: "", version: 0, exported: false, lastViewedAgo: "3 hrs ago" },
};

function getProgressionLabel(patient: Patient) {
  const diagnoses = patient.timeline.filter(e => e.type === "diagnosis" && e.grade !== undefined);
  if (diagnoses.length < 2) return { label: "Insufficient data", trend: 0 };
  const first = diagnoses[diagnoses.length - 1].grade!;
  const last = diagnoses[0].grade!;
  const diff = last - first;
  if (diff > 0) return { label: "Worsening", trend: 1 };
  if (diff < 0) return { label: "Improving", trend: -1 };
  return { label: "Stable", trend: 0 };
}

// Reports needing review: flagged or low confidence
const needsReview = mockPatients.filter(p => p.status === "flagged" || (p.aiConfidence !== null && p.aiConfidence < 80));
const pendingReports = mockPatients.filter(p => p.status === "pending");
const completedReports = mockPatients.filter(p => p.status === "confirmed");

const statusBreakdown = [
  { name: "Confirmed", value: mockPatients.filter(p => p.status === "confirmed").length, color: "hsl(160, 84%, 39%)" },
  { name: "Analyzed", value: mockPatients.filter(p => p.status === "analyzed").length, color: "hsl(217, 91%, 60%)" },
  { name: "Flagged", value: mockPatients.filter(p => p.status === "flagged").length, color: "hsl(38, 92%, 50%)" },
  { name: "Pending", value: mockPatients.filter(p => p.status === "pending").length, color: "hsl(215, 16%, 70%)" },
];

export default function ReportsHubPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "review" | "pending" | "completed" | "recent">("all");

  const getFilteredPatients = () => {
    let list = mockPatients;
    if (tabFilter === "review") list = needsReview;
    else if (tabFilter === "pending") list = pendingReports;
    else if (tabFilter === "completed") list = completedReports;
    else if (tabFilter === "recent") list = mockPatients.filter(p => recentlyViewed.includes(p.id));

    if (search) {
      list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  };

  const filtered = getFilteredPatients();

  const tabs = [
    { id: "all" as const, label: "All Reports", count: mockPatients.length },
    { id: "recent" as const, label: "Recently Viewed", count: recentlyViewed.length },
    { id: "review" as const, label: "Needs Review", count: needsReview.length },
    { id: "pending" as const, label: "Pending", count: pendingReports.length },
    { id: "completed" as const, label: "Completed", count: completedReports.length },
  ];

  return (
    <div className="h-screen overflow-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Clinical diagnostic reports & patient documentation</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <Download className="w-4 h-4" />
              Batch Export
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
          <div className="card-clinical">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-muted flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-medium">{mockPatients.length}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </div>
          <div className="card-clinical">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-xl font-medium">{needsReview.length}</p>
                <p className="text-xs text-muted-foreground">Needs Review</p>
              </div>
            </div>
          </div>
          <div className="card-clinical">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-medium">{pendingReports.length}</p>
                <p className="text-xs text-muted-foreground">Pending Analysis</p>
              </div>
            </div>
          </div>
          <div className="card-clinical">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xl font-medium">{completedReports.length}</p>
                <p className="text-xs text-muted-foreground">Confirmed & Exported</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chart + Needs Review side by side */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          {/* Report Status Breakdown */}
          <div className="card-clinical">
            <p className="section-header mb-3">Report Status Breakdown</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  strokeWidth={2}
                  stroke="hsl(0, 0%, 100%)"
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {statusBreakdown.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Review Queue */}
          <div className="card-clinical col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="section-header">Priority Review Queue</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">{needsReview.length} cases</span>
            </div>
            {needsReview.length > 0 ? (
              <div className="space-y-2">
                {needsReview.map(p => {
                  const meta = reportMeta[p.id];
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/reports/${p.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <span className="text-mono text-[10px] text-muted-foreground">{p.id}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.status === "flagged" ? "Flagged: Low confidence – Doctor review needed" : `Confidence: ${p.aiConfidence}% – Below threshold`}
                        </p>
                      </div>
                      <GradeBadge grade={p.grade} />
                      <ConfidenceGauge value={p.aiConfidence} />
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">All reports reviewed ✓</p>
            )}
          </div>
        </motion.div>

        {/* Tabs + Search + Patient Report List */}
        <motion.div variants={itemVariants} className="card-clinical !p-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-3 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tabFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[10px] ${tabFilter === tab.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-lg border bg-background text-xs w-52 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition"
              />
            </div>
          </div>

          {/* Report List Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-3 section-header">Patient</th>
                <th className="text-left px-4 py-3 section-header">Grade</th>
                <th className="text-left px-4 py-3 section-header">Confidence</th>
                <th className="text-left px-4 py-3 section-header">Progression</th>
                <th className="text-left px-4 py-3 section-header">Status</th>
                <th className="text-left px-4 py-3 section-header">Report Date</th>
                <th className="text-left px-4 py-3 section-header">Last Viewed</th>
                <th className="text-left px-4 py-3 section-header">Version</th>
                <th className="text-left px-4 py-3 section-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(patient => {
                const meta = reportMeta[patient.id] || { generatedDate: "", version: 0, exported: false, lastViewedAgo: "—" };
                const prog = getProgressionLabel(patient);
                const isRecent = recentlyViewed.includes(patient.id);
                return (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/reports/${patient.id}`)}
                    className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center text-xs font-medium text-primary">
                          {patient.name.split(" ").slice(-1)[0][0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{patient.name}</p>
                          <p className="text-mono text-[10px] text-muted-foreground">{patient.id} · {patient.age}yo</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><GradeBadge grade={patient.grade} /></td>
                    <td className="px-4 py-3"><ConfidenceGauge value={patient.aiConfidence} /></td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        prog.trend > 0 ? "text-destructive" : prog.trend < 0 ? "text-success" : "text-muted-foreground"
                      }`}>
                        {prog.trend > 0 ? <TrendingUp className="w-3 h-3" /> : prog.trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {prog.label}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{meta.generatedDate || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isRecent && <Eye className="w-3 h-3 text-primary" />}
                        <span className="text-xs text-muted-foreground">{meta.lastViewedAgo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {meta.version > 0 ? (
                        <span className="text-mono text-xs text-muted-foreground">v{meta.version}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {meta.exported && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Exported</span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No reports found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </div>
  );
}
