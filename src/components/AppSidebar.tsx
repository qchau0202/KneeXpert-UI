import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Scan, FileText, Settings, Activity, User, LogOut,
  Bell, ChevronLeft, ChevronRight, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Patients", path: "/patients" },
  { icon: Scan, label: "Diagnostics", path: "/diagnostics" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: ShieldCheck, label: "Admin", path: "/admin" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("h-14 flex items-center gap-3 border-b border-sidebar-border flex-shrink-0", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm font-semibold text-sidebar-accent-foreground whitespace-nowrap overflow-hidden"
          >
            KneeXpert
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && <span className="section-header px-2 pb-2 block text-sidebar-foreground/60">Workspace</span>}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm transition-all duration-150",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Notifications */}
      <div className="px-2 pb-1 flex-shrink-0">
        <button
          title={collapsed ? "Notifications" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm transition-colors duration-150 w-full",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
            "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <div className="relative flex-shrink-0">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-sidebar" />
          </div>
          {!collapsed && <span className="whitespace-nowrap">Notifications</span>}
          {!collapsed && (
            <span className="ml-auto text-[10px] font-medium bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">3</span>
          )}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 flex-shrink-0">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">Dr. Quốc Châu</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Radiologist</p>
            </div>
          )}
          {!collapsed && (
            <button className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent/50">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border sticky top-0 overflow-hidden flex-shrink-0 relative"
    >
      <SidebarContent collapsed={collapsed} />
      {/* Collapse toggle - floating button at edge */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-[18px] -right-3 z-50 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}

export { SidebarContent, navItems };
