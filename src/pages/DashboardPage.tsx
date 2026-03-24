import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, TrendingUp, Users, Clock, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Scan, FileText, CheckCircle2 } from "lucide-react";
import { mockPatients, Patient } from "@/data/patients";
import { StatusBadge } from "@/components/StatusBadge";
import { GradeBadge } from "@/components/GradeBadge";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { PatientDetailPanel } from "@/components/PatientDetailPanel";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";
import { useNavigate } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

const gradeDistribution = [
  { grade: "Grade 0", count: 12, color: "hsl(215, 16%, 80%)" },
  { grade: "Grade 1", count: 28, color: "hsl(217, 91%, 80%)" },
  { grade: "Grade 2", count: 35, color: "hsl(217, 91%, 65%)" },
  { grade: "Grade 3", count: 32, color: "hsl(217, 91%, 50%)" },
  { grade: "Grade 4", count: 20, color: "hsl(217, 91%, 35%)" },
];

const weeklyTrend = [
  { day: "Mon", scans: 12, confirmed: 9 },
  { day: "Tue", scans: 18, confirmed: 14 },
  { day: "Wed", scans: 15, confirmed: 12 },
  { day: "Thu", scans: 22, confirmed: 18 },
  { day: "Fri", scans: 19, confirmed: 15 },
  { day: "Sat", scans: 8, confirmed: 6 },
  { day: "Sun", scans: 5, confirmed: 4 },
];

const confidenceTrend = [
  { month: "Oct", avg: 87.2 },
  { month: "Nov", avg: 88.5 },
  { month: "Dec", avg: 89.1 },
  { month: "Jan", avg: 90.3 },
  { month: "Feb", avg: 91.0 },
  { month: "Mar", avg: 91.4 },
];

const recentActivity = [
  { time: "10 min ago", action: "AI analysis completed", patient: "PT-8842", detail: "Grade 3 OA (94.2%)", type: "diagnosis" as const },
  { time: "25 min ago", action: "New scan uploaded", patient: "PT-4417", detail: "Bilateral AP knee X-ray", type: "scan" as const },
  { time: "1 hr ago", action: "Report exported", patient: "PT-6105", detail: "PDF sent to orthopedics", type: "report" as const },
  { time: "2 hrs ago", action: "Grade confirmed", patient: "PT-7291", detail: "Dr. Quốc Châu confirmed Grade 2", type: "confirmed" as const },
  { time: "3 hrs ago", action: "Case flagged", patient: "PT-5530", detail: "Low confidence - review needed", type: "flagged" as const },
];

const activityIcons = {
  diagnosis: Activity,
  scan: Scan,
  report: FileText,
  confirmed: CheckCircle2,
  flagged: AlertTriangle,
};

const stats = [
  { label: "Total Patients", value: "127", icon: Users, trend: "+12", trendLabel: "this month", up: true },
  { label: "Pending Analysis", value: "8", icon: Clock, trend: "3", trendLabel: "urgent", up: false },
  { label: "Avg. Confidence", value: "91.4%", icon: TrendingUp, trend: "+2.1%", trendLabel: "vs last month", up: true },
  { label: "Flagged Cases", value: "4", icon: AlertTriangle, trend: "2", trendLabel: "new this week", up: false },
  { label: "Scans This Week", value: "99", icon: Scan, trend: "+15%", trendLabel: "vs last week", up: true },
  { label: "Reports Generated", value: "43", icon: FileText, trend: "+8", trendLabel: "this month", up: true },
];

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const navigate = useNavigate();

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
              <p className="text-sm text-muted-foreground mt-1">KneeXpert Clinical Overview · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <button
              onClick={() => setShowAddPatient(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Patient
            </button>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-6 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="card-clinical">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? "text-success" : "text-warning"}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-xl font-medium tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {/* Grade Distribution */}
            <div className="card-clinical">
              <p className="section-header mb-3">OA Grade Distribution</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gradeDistribution} barCategoryGap="20%">
                  <XAxis dataKey="grade" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Scan Activity */}
            <div className="card-clinical">
              <p className="section-header mb-3">Weekly Scan Activity</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
                  <Area type="monotone" dataKey="scans" stroke="hsl(217, 91%, 60%)" fill="url(#scanGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="confirmed" stroke="hsl(160, 84%, 39%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Confidence Trend */}
            <div className="card-clinical">
              <p className="section-header mb-3">AI Confidence Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={confidenceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[85, 95]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} formatter={(value: number) => [`${value}%`, "Avg Confidence"]} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(217, 91%, 60%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Activity + Patient Table */}
          <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
            {/* Recent Activity */}
            <div className="card-clinical col-span-1">
              <p className="section-header mb-3">Recent Activity</p>
              <div className="space-y-0">
                {recentActivity.map((item, i) => {
                  const Icon = activityIcons[item.type];
                  return (
                    <div key={i} className="flex gap-2.5 py-2.5 border-b last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{item.action}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-mono text-[10px] text-primary">{item.patient}</span>
                          <span className="text-[10px] text-muted-foreground">· {item.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patient Table */}
            <div className="card-clinical !p-0 overflow-hidden col-span-3">
              {/* Search & Filter */}
              <div className="flex items-center gap-3 p-4 border-b">
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
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
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
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 section-header">Patient ID</th>
                    <th className="text-left px-4 py-3 section-header">Name</th>
                    <th className="text-left px-4 py-3 section-header">Age</th>
                    <th className="text-left px-4 py-3 section-header">Knee</th>
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">Bilateral</td>
                      <td className="px-4 py-3"><GradeBadge grade={patient.grade} /></td>
                      <td className="px-4 py-3"><ConfidenceGauge value={patient.aiConfidence} /></td>
                      <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{patient.lastVisit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Detail Panel */}
      {selectedPatient && (
        <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}

      {/* Add Patient Dialog */}
      <AddPatientDialog open={showAddPatient} onClose={() => setShowAddPatient(false)} />
    </div>
  );
}
