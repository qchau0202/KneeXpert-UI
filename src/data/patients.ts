export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  bmi: number;
  history: string;
  symptoms: string;
  painLevel: number;
  grade: number | null;
  aiConfidence: number | null;
  lastVisit: string;
  status: "pending" | "analyzed" | "confirmed" | "flagged";
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  date: string;
  type: "scan" | "diagnosis" | "note" | "report";
  summary: string;
  grade?: number;
  confidence?: number;
}

export const mockPatients: Patient[] = [
  {
    id: "PT-8842",
    name: "Nguyễn Văn An",
    age: 65,
    gender: "Male",
    bmi: 27.3,
    history: "Chronic bilateral knee pain, 3 years. Previous meniscus repair (2019).",
    symptoms: "Morning stiffness >30min, crepitus on flexion, reduced ROM.",
    painLevel: 7,
    grade: 3,
    aiConfidence: 94.2,
    lastVisit: "2026-03-15",
    status: "confirmed",
    timeline: [
      { date: "2026-03-15", type: "scan", summary: "Bilateral AP knee X-ray uploaded" },
      { date: "2026-03-15", type: "diagnosis", summary: "AI Classification: Grade 3 OA (94.2%)", grade: 3, confidence: 94.2 },
      { date: "2026-03-15", type: "note", summary: "Confirmed by Dr. Châu. Joint space narrowing noted." },
      { date: "2025-09-10", type: "scan", summary: "Follow-up AP knee X-ray" },
      { date: "2025-09-10", type: "diagnosis", summary: "AI Classification: Grade 2 OA (88.1%)", grade: 2, confidence: 88.1 },
    ],
  },
  {
    id: "PT-7291",
    name: "Trần Thị Mai",
    age: 52,
    gender: "Female",
    bmi: 24.1,
    history: "No prior knee conditions. Family history of OA.",
    symptoms: "Intermittent pain after prolonged walking, mild swelling.",
    painLevel: 4,
    grade: 2,
    aiConfidence: 87.6,
    lastVisit: "2026-03-14",
    status: "analyzed",
    timeline: [
      { date: "2026-03-14", type: "scan", summary: "Right knee AP X-ray uploaded" },
      { date: "2026-03-14", type: "diagnosis", summary: "AI Classification: Grade 2 OA (87.6%)", grade: 2, confidence: 87.6 },
    ],
  },
  {
    id: "PT-6105",
    name: "Lê Hoàng Dũng",
    age: 71,
    gender: "Male",
    bmi: 30.2,
    history: "Bilateral knee OA diagnosed 2020. Total knee replacement (L) 2023.",
    symptoms: "Right knee: severe pain at rest, bone-on-bone sensation.",
    painLevel: 9,
    grade: 4,
    aiConfidence: 97.8,
    lastVisit: "2026-03-12",
    status: "confirmed",
    timeline: [
      { date: "2026-03-12", type: "scan", summary: "Right knee AP & lateral X-ray uploaded" },
      { date: "2026-03-12", type: "diagnosis", summary: "AI Classification: Grade 4 OA (97.8%)", grade: 4, confidence: 97.8 },
      { date: "2026-03-12", type: "report", summary: "Clinical report generated. Referred to orthopedics." },
    ],
  },
  {
    id: "PT-5530",
    name: "Phạm Minh Châu",
    age: 45,
    gender: "Female",
    bmi: 22.8,
    history: "ACL reconstruction (2018). Active runner.",
    symptoms: "Mild discomfort after exercise, no swelling.",
    painLevel: 2,
    grade: 1,
    aiConfidence: 72.3,
    lastVisit: "2026-03-10",
    status: "flagged",
    timeline: [
      { date: "2026-03-10", type: "scan", summary: "Bilateral knee X-ray uploaded" },
      { date: "2026-03-10", type: "diagnosis", summary: "AI Classification: Grade 1 OA (72.3%)", grade: 1, confidence: 72.3 },
      { date: "2026-03-10", type: "note", summary: "Flagged: Low confidence. Doctor review pending." },
    ],
  },
  {
    id: "PT-4417",
    name: "Võ Thanh Sơn",
    age: 58,
    gender: "Male",
    bmi: 26.5,
    history: "Type 2 Diabetes. Hypertension. Sedentary lifestyle.",
    symptoms: "Bilateral knee pain, worse on stairs. Morning stiffness.",
    painLevel: 6,
    grade: null,
    aiConfidence: null,
    lastVisit: "2026-03-17",
    status: "pending",
    timeline: [
      { date: "2026-03-17", type: "scan", summary: "Bilateral AP knee X-ray uploaded. Awaiting analysis." },
    ],
  },
];
