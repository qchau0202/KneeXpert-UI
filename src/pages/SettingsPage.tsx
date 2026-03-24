import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Database, Image, Upload, Settings as SettingsIcon, User, Bell, Shield, Monitor,
  ChevronRight, ToggleLeft, ToggleRight, RefreshCw, Trash2, Download, Check, AlertTriangle,
  Cpu, BarChart3, FileImage, Layers, Zap, Clock, HardDrive, Eye, Lock, Mail, Globe, Palette
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

type SettingsTab = "ai-training" | "dataset" | "models" | "mri-pipeline" | "profile" | "notifications" | "appearance" | "security" | "system";

const tabs: { id: SettingsTab; label: string; icon: any; group: string }[] = [
  { id: "ai-training", label: "AI Training & Agent", icon: Brain, group: "AI & Data" },
  { id: "dataset", label: "Labeled Datasets", icon: Database, group: "AI & Data" },
  { id: "models", label: "Model Management", icon: Cpu, group: "AI & Data" },
  { id: "mri-pipeline", label: "MRI Pipeline (Phase II)", icon: Layers, group: "AI & Data" },
  { id: "profile", label: "Doctor Profile", icon: User, group: "General" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "General" },
  { id: "appearance", label: "Appearance", icon: Palette, group: "General" },
  { id: "security", label: "Security & Privacy", icon: Shield, group: "General" },
  { id: "system", label: "System", icon: Monitor, group: "General" },
];

// Mock training data stats
const trainingStats = {
  totalImages: 2847,
  xrayImages: 2103,
  mriImages: 744,
  labeledImages: 2561,
  unlabeledImages: 286,
  doctorOverrides: 43,
  lastTrainingDate: "2026-03-10",
  currentEpoch: 150,
  modelVersion: "v3.2.1",
};

const datasetBreakdown = [
  { grade: 0, xray: 312, mri: 98, total: 410, label: "Normal" },
  { grade: 1, xray: 487, mri: 156, total: 643, label: "Doubtful" },
  { grade: 2, xray: 582, mri: 201, total: 783, label: "Minimal" },
  { grade: 3, xray: 498, mri: 178, total: 676, label: "Moderate" },
  { grade: 4, xray: 224, mri: 111, total: 335, label: "Severe" },
];

const recentOverrides = [
  { id: "PT-5530", date: "2026-03-10", aiGrade: 1, doctorGrade: 2, modality: "X-ray", status: "pending" },
  { id: "PT-8842", date: "2026-03-08", aiGrade: 2, doctorGrade: 3, modality: "X-ray", status: "approved" },
  { id: "PT-7291", date: "2026-03-05", aiGrade: 3, doctorGrade: 3, modality: "MRI", status: "approved" },
  { id: "PT-6105", date: "2026-03-01", aiGrade: 3, doctorGrade: 4, modality: "X-ray", status: "approved" },
];

const modelVersions = [
  { version: "v3.2.1", date: "2026-03-10", accuracy: "94.2%", dataset: "2561 images", status: "active" },
  { version: "v3.1.0", date: "2026-02-15", accuracy: "93.1%", dataset: "2340 images", status: "archived" },
  { version: "v3.0.0", date: "2026-01-20", accuracy: "91.8%", dataset: "2105 images", status: "archived" },
  { version: "v2.5.0", date: "2025-12-01", accuracy: "89.5%", dataset: "1820 images", status: "archived" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-training");

  // AI Training settings
  const [autoRetrain, setAutoRetrain] = useState(true);
  const [retrainThreshold, setRetrainThreshold] = useState(50);
  const [useOverridesForTraining, setUseOverridesForTraining] = useState(true);
  const [aiAgentEnabled, setAiAgentEnabled] = useState(true);
  const [agentSuggestions, setAgentSuggestions] = useState(true);
  const [agentAutoReport, setAgentAutoReport] = useState(false);
  const [agentConfidenceThreshold, setAgentConfidenceThreshold] = useState(85);

  // Dataset settings
  const [autoLabel, setAutoLabel] = useState(true);
  const [augmentData, setAugmentData] = useState(true);
  const [dataValidation, setDataValidation] = useState(true);

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
      {value ? (
        <ToggleRight className="w-8 h-8 text-primary" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
      )}
    </button>
  );

  const grouped = tabs.reduce((acc, tab) => {
    if (!acc[tab.group]) acc[tab.group] = [];
    acc[tab.group].push(tab);
    return acc;
  }, {} as Record<string, typeof tabs>);

  return (
    <div className="h-screen overflow-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6">
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure AI training, datasets, models, and application preferences</p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 space-y-4">
            {Object.entries(grouped).map(([group, groupTabs]) => (
              <div key={group}>
                <p className="section-header px-3 mb-2">{group}</p>
                <div className="space-y-0.5">
                  {groupTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
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
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* AI Training & Agent */}
            {activeTab === "ai-training" && (
              <>
                {/* AI Agent Configuration */}
                <div className="card-clinical">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">AI Diagnostic Agent</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    The AI agent uses your diagnostic history, overrides, and clinical notes to provide personalized suggestions
                    tailored to your practice patterns.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Enable AI Agent</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Agent learns from your diagnostic decisions to provide better suggestions</p>
                      </div>
                      <Toggle value={aiAgentEnabled} onChange={setAiAgentEnabled} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Proactive Suggestions</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Show AI suggestions during diagnosis based on patient context and history</p>
                      </div>
                      <Toggle value={agentSuggestions} onChange={setAgentSuggestions} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Auto-Generate Draft Reports</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Agent creates draft clinical reports after diagnosis confirmation</p>
                      </div>
                      <Toggle value={agentAutoReport} onChange={setAgentAutoReport} />
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">Agent Confidence Threshold</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Only show suggestions when AI confidence exceeds this threshold</p>
                        </div>
                        <span className="text-mono text-sm font-medium">{agentConfidenceThreshold}%</span>
                      </div>
                      <input
                        type="range" min="50" max="99" value={agentConfidenceThreshold}
                        onChange={e => setAgentConfidenceThreshold(parseInt(e.target.value))}
                        className="w-full accent-primary h-1.5"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">More suggestions</span>
                        <span className="text-[10px] text-muted-foreground">Higher accuracy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training Data from Doctor */}
                <div className="card-clinical">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Training Data Collection</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Your diagnostic decisions, overrides, and annotations are used to continuously improve AI accuracy.
                    All data is anonymized before use in training.
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary-muted text-center">
                      <p className="text-lg font-medium text-primary">{trainingStats.doctorOverrides}</p>
                      <p className="text-[10px] text-muted-foreground">Doctor Overrides</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary-muted text-center">
                      <p className="text-lg font-medium text-primary">{trainingStats.labeledImages}</p>
                      <p className="text-[10px] text-muted-foreground">Labeled Images</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary-muted text-center">
                      <p className="text-lg font-medium text-primary">{trainingStats.currentEpoch}</p>
                      <p className="text-[10px] text-muted-foreground">Training Epochs</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Use Overrides for Retraining</p>
                        <p className="text-xs text-muted-foreground mt-0.5">When you disagree with AI and override the grade, include it in training data</p>
                      </div>
                      <Toggle value={useOverridesForTraining} onChange={setUseOverridesForTraining} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Automatic Retraining</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Trigger model retraining when enough new labeled data is collected</p>
                      </div>
                      <Toggle value={autoRetrain} onChange={setAutoRetrain} />
                    </div>
                    {autoRetrain && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Retrain after new samples</p>
                          <span className="text-mono text-sm">{retrainThreshold}</span>
                        </div>
                        <input
                          type="range" min="10" max="200" step="10" value={retrainThreshold}
                          onChange={e => setRetrainThreshold(parseInt(e.target.value))}
                          className="w-full accent-primary h-1.5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Overrides */}
                <div className="card-clinical">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <p className="text-sm font-medium">Recent Doctor Overrides (Training Queue)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                      {recentOverrides.filter(o => o.status === "pending").length} pending
                    </span>
                  </div>
                  <div className="space-y-2">
                    {recentOverrides.map((override, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                        <span className="text-mono text-xs text-primary w-16">{override.id}</span>
                        <span className="text-xs text-muted-foreground w-20">{override.date}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">AI: G{override.aiGrade}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium">Dr: G{override.doctorGrade}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{override.modality}</span>
                        <div className="ml-auto">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            override.status === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>
                            {override.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Labeled Datasets */}
            {activeTab === "dataset" && (
              <>
                <div className="card-clinical">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Dataset Overview</p>
                  </div>

                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[
                      { label: "Total Images", value: trainingStats.totalImages, icon: FileImage },
                      { label: "X-ray Images", value: trainingStats.xrayImages, icon: Image },
                      { label: "MRI Images", value: trainingStats.mriImages, icon: Layers },
                      { label: "Labeled", value: trainingStats.labeledImages, icon: Check },
                      { label: "Unlabeled", value: trainingStats.unlabeledImages, icon: Clock },
                    ].map(stat => (
                      <div key={stat.label} className="p-3 rounded-lg bg-primary-muted text-center">
                        <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <p className="text-lg font-medium">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grade Breakdown Table */}
                  <p className="section-header mb-3">Grade Distribution by Modality</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-3 py-2 section-header">KL Grade</th>
                        <th className="text-left px-3 py-2 section-header">Label</th>
                        <th className="text-right px-3 py-2 section-header">X-ray</th>
                        <th className="text-right px-3 py-2 section-header">MRI</th>
                        <th className="text-right px-3 py-2 section-header">Total</th>
                        <th className="text-left px-3 py-2 section-header">Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasetBreakdown.map(row => (
                        <tr key={row.grade} className="border-b last:border-0">
                          <td className="px-3 py-2.5 text-sm font-medium">Grade {row.grade}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.label}</td>
                          <td className="px-3 py-2.5 text-mono text-sm text-right">{row.xray}</td>
                          <td className="px-3 py-2.5 text-mono text-sm text-right">{row.mri}</td>
                          <td className="px-3 py-2.5 text-mono text-sm font-medium text-right">{row.total}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${(row.total / trainingStats.totalImages) * 100}%` }}
                                />
                              </div>
                              <span className="text-mono text-[10px] text-muted-foreground w-8">
                                {Math.round((row.total / trainingStats.totalImages) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Dataset Actions */}
                <div className="card-clinical">
                  <p className="text-sm font-medium mb-4">Dataset Management</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Auto-Label Confirmed Diagnoses</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Automatically add confirmed graded images to the labeled dataset</p>
                      </div>
                      <Toggle value={autoLabel} onChange={setAutoLabel} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Data Augmentation</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Apply rotation, flipping, and contrast augmentation for training diversity</p>
                      </div>
                      <Toggle value={augmentData} onChange={setAugmentData} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Quality Validation</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Run quality checks (resolution, noise, artifacts) before adding to dataset</p>
                      </div>
                      <Toggle value={dataValidation} onChange={setDataValidation} />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Upload className="w-4 h-4" />
                      Import Dataset
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                      <Download className="w-4 h-4" />
                      Export Dataset
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                      <Eye className="w-4 h-4" />
                      Browse Images
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Model Management */}
            {activeTab === "models" && (
              <>
                <div className="card-clinical">
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Active Models</p>
                  </div>
                  <p className="section-header mb-3">X-Ray Models (Phase I — Ensemble + Majority Voting)</p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { name: "DenseNet201", task: "Detailed Classification", accuracy: "94.2%", status: "active" },
                      { name: "ViT-B/16", task: "Global Context Analysis", accuracy: "92.8%", status: "active" },
                      { name: "ResNet50", task: "Baseline Comparison", accuracy: "89.5%", status: "standby" },
                    ].map(model => (
                      <div key={model.name} className={`p-4 rounded-lg border ${model.status === "active" ? "border-primary/30 bg-primary-muted/30" : ""}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{model.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            model.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}>{model.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{model.task}</p>
                        <p className="text-xs mt-1">Accuracy: <span className="font-medium">{model.accuracy}</span></p>
                      </div>
                    ))}
                  </div>
                  <p className="section-header mb-3">MRI Models (Phase II — Swin-UNet + Classifier)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "Swin-UNet + DenseNet201", task: "Artifact Removal + Classification", accuracy: "93.5%", status: "active" },
                      { name: "Swin-UNet + ViT-B/16", task: "Artifact Removal + Global Analysis", accuracy: "91.7%", status: "active" },
                      { name: "Swin-UNet + ResNet50", task: "Artifact Removal + Baseline", accuracy: "88.2%", status: "standby" },
                    ].map(model => (
                      <div key={model.name} className={`p-4 rounded-lg border ${model.status === "active" ? "border-primary/30 bg-primary-muted/30" : ""}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-medium">{model.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            model.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}>{model.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{model.task}</p>
                        <p className="text-xs mt-1">Accuracy: <span className="font-medium">{model.accuracy}</span></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-clinical">
                  <p className="text-sm font-medium mb-4">Version History</p>
                  <div className="space-y-2">
                    {modelVersions.map(v => (
                      <div key={v.version} className={`flex items-center gap-4 p-3 rounded-lg border ${v.status === "active" ? "border-primary/30 bg-primary-muted/20" : ""}`}>
                        <span className="text-mono text-sm font-medium w-16">{v.version}</span>
                        <span className="text-xs text-muted-foreground w-24">{v.date}</span>
                        <span className="text-xs w-20">Acc: <span className="font-medium">{v.accuracy}</span></span>
                        <span className="text-xs text-muted-foreground flex-1">{v.dataset}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          v.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>{v.status}</span>
                        {v.status === "archived" && (
                          <button className="text-xs text-primary hover:text-primary/80 transition-colors">Restore</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-clinical">
                  <p className="text-sm font-medium mb-3">Training Configuration</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Learning Rate</label>
                      <input defaultValue="0.0001" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Batch Size</label>
                      <input defaultValue="32" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Epochs</label>
                      <input defaultValue="150" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Optimizer</label>
                      <select defaultValue="adam" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="adam">Adam</option>
                        <option value="sgd">SGD</option>
                        <option value="adamw">AdamW</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Image Size</label>
                      <input defaultValue="224x224" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Validation Split</label>
                      <input defaultValue="20%" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                  </div>
                  <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Start Training Run
                  </button>
                </div>
              </>
            )}

            {/* MRI Pipeline (Phase II) */}
            {activeTab === "mri-pipeline" && (
              <>
                <div className="card-clinical">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">MRI Artifact Removal & Enhancement Pipeline</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Three-stage framework for removing motion blur and stripe artifacts from real-world MRI scans,
                    preserving critical pathological structures for downstream diagnosis.
                  </p>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
                        <p className="text-sm font-medium">Pre-training: Image Restoration</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium ml-auto">Trained</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">Swin-UNet trained on KMAR-50K dataset to learn deep feature reconstruction from corrupted MRI inputs.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ l: "Architecture", v: "Swin-UNet" }, { l: "Training Data", v: "KMAR-50K" }, { l: "Samples", v: "50,000" }].map(s => (
                          <div key={s.l} className="p-2 rounded bg-background border text-center">
                            <p className="text-[10px] text-muted-foreground">{s.l}</p>
                            <p className="text-xs font-medium">{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
                        <p className="text-sm font-medium">Enhancement: Artifact Removal</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium ml-auto">Active</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">Raw SKM-TEA images passed through Swin-UNet to remove motion blur and stripe artifacts while preserving pathology.</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ l: "Input", v: "Raw SKM-TEA" }, { l: "Output", v: "Cleaned MRI" }, { l: "Avg Quality", v: "88.3%", c: "text-success" }, { l: "Processed", v: "744 images" }].map(s => (
                          <div key={s.l} className="p-2 rounded bg-background border text-center">
                            <p className="text-[10px] text-muted-foreground">{s.l}</p>
                            <p className={`text-xs font-medium ${s.c || ""}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
                        <p className="text-sm font-medium">Downstream Diagnosis: Classification</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium ml-auto">Active</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">Cleaned SKM-TEA data trains high-precision classifiers. Artifact removal improves soft-tissue lesion detection.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ l: "Classifier", v: "DenseNet201" }, { l: "MRI Accuracy", v: "93.5%" }, { l: "Improvement", v: "+6.2% vs raw", c: "text-success" }].map(s => (
                          <div key={s.l} className="p-2 rounded bg-background border text-center">
                            <p className="text-[10px] text-muted-foreground">{s.l}</p>
                            <p className={`text-xs font-medium ${s.c || ""}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-clinical">
                  <p className="text-sm font-medium mb-4">Pipeline Configuration</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Restoration Model</label>
                      <select defaultValue="swin-unet" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="swin-unet">Swin-UNet</option>
                        <option value="unet">Standard U-Net</option>
                        <option value="restormer">Restormer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pre-training Dataset</label>
                      <select defaultValue="kmar50k" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="kmar50k">KMAR-50K (Recommended)</option>
                        <option value="custom">Custom Dataset</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Dataset</label>
                      <select defaultValue="skm-tea" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="skm-tea">SKM-TEA</option>
                        <option value="fastmri">fastMRI</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quality Threshold</label>
                      <input defaultValue="75" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Artifact Types</label>
                      <select defaultValue="all" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                        <option value="all">All (Motion Blur + Stripe)</option>
                        <option value="motion">Motion Blur Only</option>
                        <option value="stripe">Stripe Artifacts Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Swin Window Size</label>
                      <input defaultValue="8" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
                    </div>
                  </div>
                </div>

                <div className="card-clinical">
                  <p className="text-sm font-medium mb-4">Research Contributions & Novelty</p>
                  <div className="space-y-3">
                    {[
                      { title: "Cross-Dataset Synergy", desc: "Leveraging large-scale artifact data (KMAR-50K) to improve specialized diagnostic performance on SKM-TEA." },
                      { title: "Clinical Transparency", desc: "Combining Ensemble Learning with Grad-CAM visualization to build physician trust." },
                      { title: "Dual-Modality Integration", desc: "Comprehensive framework: bone-level X-ray analysis (Phase I) + soft-tissue MRI complexity (Phase II)." },
                    ].map(item => (
                      <div key={item.title} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <p className="text-sm font-medium">{item.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Doctor Profile */}
            {activeTab === "profile" && (
              <div className="card-clinical">
                <p className="text-sm font-medium mb-4">Doctor Profile</p>
                <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-primary-muted/30 border">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium">
                    NC
                  </div>
                  <div>
                    <p className="text-lg font-medium">{doctorName}</p>
                    <p className="text-sm text-muted-foreground">{specialty}</p>
                    <p className="text-xs text-muted-foreground">{institution}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                    { label: "New Scan Uploaded", desc: "Notify when a new scan is uploaded for analysis", value: notifyNewScan, set: setNotifyNewScan },
                    { label: "Flagged Cases", desc: "Alert when AI flags a case for review (low confidence)", value: notifyFlagged, set: setNotifyFlagged },
                    { label: "Training Completed", desc: "Notify when a model retraining run completes", value: notifyTraining, set: setNotifyTraining },
                    { label: "Report Generated", desc: "Notify when a clinical report is auto-generated", value: notifyReport, set: setNotifyReport },
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
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Compact Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reduce spacing for more content density</p>
                    </div>
                    <Toggle value={compactMode} onChange={setCompactMode} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Show Confidence Scores</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Display AI confidence percentages in patient lists</p>
                    </div>
                    <Toggle value={showConfidence} onChange={setShowConfidence} />
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Default AI Model</p>
                    <select
                      value={defaultModel}
                      onChange={e => setDefaultModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
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
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Data Encryption</p>
                    </div>
                    <p className="text-xs text-muted-foreground">All patient data and images are encrypted at rest (AES-256) and in transit (TLS 1.3)</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs text-success font-medium">Active</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">HIPAA Compliance</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Data handling follows HIPAA guidelines for protected health information</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs text-success font-medium">Compliant</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm font-medium mb-1">Training Data Anonymization</p>
                    <p className="text-xs text-muted-foreground">Patient identifiers are stripped before images enter the training pipeline</p>
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
                    { label: "AI Engine", value: `Model ${trainingStats.modelVersion} · DenseNet201 + ViT + ResNet50` },
                    { label: "Last Training", value: trainingStats.lastTrainingDate },
                    { label: "Database", value: `${trainingStats.totalImages} images · ${5} patients` },
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
                    <HardDrive className="w-4 h-4" />
                    Clear Cache
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Reset All Settings
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
