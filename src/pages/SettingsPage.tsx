import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, Monitor, Palette,
  ToggleLeft, ToggleRight, Check, Lock, HardDrive, Trash2
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

type SettingsTab = "profile" | "notifications" | "appearance" | "security" | "system";

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: "profile", label: "Doctor Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security & Privacy", icon: Shield },
  { id: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile
  const [doctorName, setDoctorName] = useState("Dr. Quốc Châu");
  const [specialty, setSpecialty] = useState("Orthopedic Radiology");
  const [institution, setInstitution] = useState("Hanoi Medical University Hospital");
  const [email, setEmail] = useState("chau.nguyen@hmu.edu.vn");

  // Notifications
  const [notifyNewScan, setNotifyNewScan] = useState(true);
  const [notifyFlagged, setNotifyFlagged] = useState(true);
  const [notifyTraining, setNotifyTraining] = useState(false);
  const [notifyReport, setNotifyReport] = useState(true);

  // Appearance
  const [theme, setTheme] = useState("light");
  const [compactMode, setCompactMode] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const [defaultModel, setDefaultModel] = useState("densenet");

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)} className="flex-shrink-0">
      {value ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="min-h-screen overflow-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-4 sm:p-6">
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Personal preferences and application settings</p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar */}
          <div className="sm:w-48 flex-shrink-0">
            <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Profile */}
            {activeTab === "profile" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">Doctor Profile</p>
                <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-primary-muted/30 border">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium">QC</div>
                  <div>
                    <p className="text-lg font-medium">{doctorName}</p>
                    <p className="text-sm text-muted-foreground">{specialty}</p>
                    <p className="text-xs text-muted-foreground">{institution}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                      <input value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Specialty</label>
                      <input value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Institution</label>
                    <input value={institution} onChange={e => setInstitution(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Medical License Number</label>
                    <input defaultValue="VN-RAD-2015-08842" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                </div>
                <button className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Save Profile
                </button>
              </div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">Notification Preferences</p>
                <div className="space-y-3">
                  {[
                    { label: "New Scan Uploaded", desc: "Notify when a new scan is uploaded", value: notifyNewScan, set: setNotifyNewScan },
                    { label: "Flagged Cases", desc: "Alert when AI flags a case for review", value: notifyFlagged, set: setNotifyFlagged },
                    { label: "Training Completed", desc: "Notify when model retraining completes", value: notifyTraining, set: setNotifyTraining },
                    { label: "Report Generated", desc: "Notify when a report is auto-generated", value: notifyReport, set: setNotifyReport },
                  ].map(n => (
                    <div key={n.label} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{n.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                      </div>
                      <Toggle value={n.value} onChange={n.set} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance */}
            {activeTab === "appearance" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">Appearance & Display</p>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Theme</p>
                    <div className="flex gap-2">
                      {["light", "dark", "system"].map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                            theme === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                          }`}
                        >{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div><p className="text-sm font-medium">Compact Mode</p><p className="text-xs text-muted-foreground mt-0.5">Reduce spacing for more content density</p></div>
                    <Toggle value={compactMode} onChange={setCompactMode} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div><p className="text-sm font-medium">Show Confidence Scores</p><p className="text-xs text-muted-foreground mt-0.5">Display AI confidence in patient lists</p></div>
                    <Toggle value={showConfidence} onChange={setShowConfidence} />
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Default AI Model</p>
                    <select value={defaultModel} onChange={e => setDefaultModel(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                      <option value="densenet">DenseNet201 – Detailed Classification</option>
                      <option value="vit">ViT-B/16 – Global Context Analysis</option>
                      <option value="resnet">ResNet50 – Baseline Comparison</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">Security & Privacy</p>
                <div className="space-y-3">
                  {[
                    { icon: Lock, title: "Data Encryption", desc: "AES-256 at rest, TLS 1.3 in transit" },
                    { icon: Shield, title: "HIPAA Compliance", desc: "Protected health information handling" },
                  ].map(item => (
                    <div key={item.title} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{item.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs text-success font-medium">Active</span>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-1">Training Data Anonymization</p>
                    <p className="text-xs text-muted-foreground">Patient identifiers stripped before training</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs text-success font-medium">Enabled</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-1">Session Timeout</p>
                    <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
                    <select defaultValue="30" className="mt-2 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* System */}
            {activeTab === "system" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">System Information</p>
                <div className="space-y-3">
                  {[
                    { label: "App Version", value: "KneeXpert v1.4.0" },
                    { label: "AI Engine", value: "Model v3.2.1 · DenseNet201 + ViT + ResNet50" },
                    { label: "Last Training", value: "2026-03-10" },
                    { label: "Database", value: "2847 images · 5 patients" },
                    { label: "Storage Used", value: "12.4 GB / 50 GB" },
                    { label: "API Status", value: "Operational" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                    <HardDrive className="w-4 h-4" />Clear Cache
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />Reset Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
