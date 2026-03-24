import { ReactNode, createContext, useContext, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Activity, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Scan, FileText, Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Patients", path: "/patients" },
  { icon: Scan, label: "Diagnostics", path: "/diagnostics" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const location = useLocation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="h-14 flex items-center px-4 gap-3 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-accent-foreground">KneeXpert</span>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-1">
            <span className="section-header px-2 pb-2 block">Workspace</span>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          {/* Notifications */}
          <div className="px-2 pb-1">
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 w-full text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
              <div className="relative flex-shrink-0">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-sidebar" />
              </div>
              <span>Notifications</span>
              <span className="ml-auto text-[10px] font-medium bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">3</span>
            </button>
          </div>
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="w-4 h-4 text-sidebar-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">Dr. Quốc Châu</p>
                <p className="text-[10px] text-sidebar-foreground truncate">Radiologist</p>
              </div>
              <button className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors p-1">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {!isMobile && <AppSidebar />}
      <div className="flex-1 min-w-0 flex flex-col">
        {isMobile && (
          <header className="h-12 flex items-center px-4 gap-3 border-b bg-background sticky top-0 z-40">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Activity className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">KneeXpert</span>
            </div>
          </header>
        )}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
      {isMobile && <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />}
    </div>
  );
}
