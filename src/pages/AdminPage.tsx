import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Eye, Activity, Globe, TrendingUp, ArrowUpRight, ArrowDownRight,
  Monitor, Smartphone, Clock, BarChart3, Shield, Database, HardDrive,
  CheckCircle2, AlertTriangle, Server, Zap, Calendar
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

const trafficData = [
  { date: "Mar 1", visitors: 42, pageViews: 128, sessions: 56 },
  { date: "Mar 5", visitors: 58, pageViews: 187, sessions: 73 },
  { date: "Mar 10", visitors: 71, pageViews: 234, sessions: 91 },
  { date: "Mar 15", visitors: 65, pageViews: 198, sessions: 82 },
  { date: "Mar 20", visitors: 89, pageViews: 312, sessions: 114 },
  { date: "Mar 25", visitors: 97, pageViews: 345, sessions: 128 },
  { date: "Mar 26", visitors: 103, pageViews: 367, sessions: 135 },
];

const pageViews = [
  { page: "Dashboard", views: 1247, pct: 31 },
  { page: "Diagnostics", views: 986, pct: 25 },
  { page: "Patients", views: 743, pct: 19 },
  { page: "Reports", views: 521, pct: 13 },
  { page: "Settings", views: 312, pct: 8 },
  { page: "Admin", views: 156, pct: 4 },
];

const deviceBreakdown = [
  { name: "Desktop", value: 68, color: "hsl(217, 91%, 60%)" },
  { name: "Tablet", value: 22, color: "hsl(217, 91%, 78%)" },
  { name: "Mobile", value: 10, color: "hsl(215, 16%, 75%)" },
];

const userAccounts = [
  { name: "Dr. Quốc Châu", role: "Admin", email: "chau.nguyen@hmu.edu.vn", lastActive: "Just now", status: "online" },
  { name: "Dr. Minh Tuấn", role: "Radiologist", email: "tuan.nguyen@hmu.edu.vn", lastActive: "15 min ago", status: "online" },
  { name: "Dr. Thanh Hà", role: "Orthopedist", email: "ha.le@hmu.edu.vn", lastActive: "2 hrs ago", status: "offline" },
  { name: "Dr. Phương Anh", role: "Resident", email: "anh.pham@hmu.edu.vn", lastActive: "1 day ago", status: "offline" },
  { name: "Nurse Linh", role: "Staff", email: "linh.tran@hmu.edu.vn", lastActive: "5 hrs ago", status: "offline" },
];

const activeHours = [
  { hour: "6AM", active: 2 }, { hour: "8AM", active: 8 }, { hour: "10AM", active: 14 },
  { hour: "12PM", active: 11 }, { hour: "2PM", active: 16 }, { hour: "4PM", active: 12 },
  { hour: "6PM", active: 7 }, { hour: "8PM", active: 4 }, { hour: "10PM", active: 1 },
];

const systemLogs = [
  { time: "10:42 AM", event: "Model v3.2.1 inference completed", type: "success" as const },
  { time: "10:38 AM", event: "New user login: Dr. Minh Tuấn", type: "info" as const },
  { time: "10:15 AM", event: "Database backup completed (2.4 GB)", type: "success" as const },
  { time: "09:50 AM", event: "High memory usage detected (87%)", type: "warning" as const },
  { time: "09:30 AM", event: "Edge function deployed: report-generator", type: "info" as const },
  { time: "08:15 AM", event: "Scheduled model retraining started", type: "info" as const },
];

const kpiStats = [
  { label: "Total Visitors", value: "1,247", icon: Eye, trend: "+18%", trendLabel: "vs last month", up: true },
  { label: "Active Accounts", value: "12", icon: Users, trend: "+3", trendLabel: "this month", up: true },
  { label: "Page Views", value: "4,523", icon: Globe, trend: "+24%", trendLabel: "vs last month", up: true },
  { label: "Avg. Session", value: "8m 42s", icon: Clock, trend: "+1m 12s", trendLabel: "vs last month", up: true },
  { label: "Uptime", value: "99.97%", icon: Server, trend: "0.02%", trendLabel: "downtime", up: false },
  { label: "API Calls", value: "12.4K", icon: Zap, trend: "+32%", trendLabel: "vs last month", up: true },
];

type AdminTab = "overview" | "users" | "system";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  return (
    <div className="min-h-screen overflow-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Admin Panel</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">App analytics, user management & system monitoring</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["overview", "users", "system"] as AdminTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {activeTab === "overview" && (
          <>
            {/* KPI Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpiStats.map(stat => (
                <div key={stat.label} className="card-clinical">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                      <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-medium ${stat.up ? "text-success" : "text-warning"}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.trend}
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Traffic Chart + Device Breakdown */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card-clinical lg:col-span-2">
                <p className="section-header mb-3">Traffic Overview</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="adminTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
                    <Area type="monotone" dataKey="pageViews" stroke="hsl(217, 91%, 60%)" fill="url(#adminTrafficGrad)" strokeWidth={2} name="Page Views" />
                    <Area type="monotone" dataKey="visitors" stroke="hsl(160, 84%, 39%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Visitors" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card-clinical">
                <p className="section-header mb-3">Device Breakdown</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={deviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} strokeWidth={2} stroke="hsl(0,0%,100%)">
                      {deviceBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
                  {deviceBreakdown.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="text-xs font-medium">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Page Views + Active Hours */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-clinical">
                <p className="section-header mb-3">Page Views Breakdown</p>
                <div className="space-y-2.5">
                  {pageViews.map(p => (
                    <div key={p.page} className="flex items-center gap-3">
                      <span className="text-xs w-24 text-muted-foreground">{p.page}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{p.views.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-clinical">
                <p className="section-header mb-3">Peak Activity Hours</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={activeHours} barCategoryGap="25%">
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)" }} />
                    <Bar dataKey="active" radius={[4, 4, 0, 0]} fill="hsl(217, 91%, 60%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </>
        )}

        {activeTab === "users" && (
          <>
            {/* User Accounts */}
            <motion.div variants={itemVariants} className="card-clinical !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <p className="text-sm font-medium">User Accounts</p>
                <span className="text-xs text-muted-foreground">{userAccounts.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 section-header">User</th>
                      <th className="text-left px-4 py-3 section-header">Role</th>
                      <th className="text-left px-4 py-3 section-header">Email</th>
                      <th className="text-left px-4 py-3 section-header">Last Active</th>
                      <th className="text-left px-4 py-3 section-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAccounts.map(user => (
                      <tr key={user.email} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center text-xs font-medium text-primary">
                              {user.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            user.role === "Admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>{user.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{user.lastActive}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${user.status === "online" ? "bg-success" : "bg-muted-foreground/40"}`} />
                            <span className="text-xs capitalize text-muted-foreground">{user.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

        {activeTab === "system" && (
          <>
            {/* System Health */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "CPU Usage", value: "34%", icon: Monitor, color: "text-success" },
                { label: "Memory", value: "4.2 / 8 GB", icon: HardDrive, color: "text-primary" },
                { label: "Storage", value: "12.8 / 50 GB", icon: Database, color: "text-primary" },
                { label: "GPU (Inference)", value: "62%", icon: Zap, color: "text-warning" },
              ].map(item => (
                <div key={item.label} className="card-clinical">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </motion.div>

            {/* System Logs */}
            <motion.div variants={itemVariants} className="card-clinical">
              <p className="section-header mb-3">System Activity Log</p>
              <div className="space-y-2">
                {systemLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      log.type === "success" ? "bg-success/10" : log.type === "warning" ? "bg-warning/10" : "bg-primary-muted"
                    }`}>
                      {log.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> :
                       log.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-warning" /> :
                       <Activity className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{log.event}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{log.time} · Today</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
