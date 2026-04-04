import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import ReportsHubPage from "./pages/ReportsHubPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { AdminOverviewPage, AdminUsersPage, AdminAITrainingPage, AdminDatasetsPage, AdminModelsPage, AdminMRIPipelinePage, AdminSystemPage } from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth routes - no layout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Admin routes - separate layout */}
            <Route path="/admin" element={<AdminLayout><AdminOverviewPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
            <Route path="/admin/ai-training" element={<AdminLayout><AdminAITrainingPage /></AdminLayout>} />
            <Route path="/admin/datasets" element={<AdminLayout><AdminDatasetsPage /></AdminLayout>} />
            <Route path="/admin/models" element={<AdminLayout><AdminModelsPage /></AdminLayout>} />
            <Route path="/admin/mri-pipeline" element={<AdminLayout><AdminMRIPipelinePage /></AdminLayout>} />
            <Route path="/admin/system" element={<AdminLayout><AdminSystemPage /></AdminLayout>} />

            {/* Doctor routes - main layout */}
            <Route path="/" element={<AppLayout><DashboardPage /></AppLayout>} />
            <Route path="/patients" element={<AppLayout><PatientsPage /></AppLayout>} />
            <Route path="/diagnostics" element={<AppLayout><DiagnosticsPage /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsHubPage /></AppLayout>} />
            <Route path="/reports/:patientId" element={<AppLayout><ReportDetailPage /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
