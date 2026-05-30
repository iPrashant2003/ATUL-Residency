"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  CreditCard,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Building,
  BellRing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const adminNav = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Building2, label: "Towers", href: "/admin/towers" },
  { icon: DoorOpen, label: "Rooms", href: "/admin/rooms" },
  { icon: Users, label: "Renters", href: "/admin/tenants" },
  { icon: IndianRupee, label: "Rent Tracker", href: "/admin/rent" },
  { icon: CreditCard, label: "Payments", href: "/admin/payments" },
  { icon: Wrench, label: "Maintenance", href: "/admin/maintenance" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: BellRing, label: "Notifications", href: "/admin/notifications" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const tenantNav = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/tenant/dashboard" },
  { icon: CreditCard, label: "My Payments", href: "/tenant/payments" },
  { icon: Wrench, label: "Maintenance", href: "/tenant/maintenance" },
  { icon: BellRing, label: "Notifications", href: "/tenant/notifications" },
  { icon: Settings, label: "Profile", href: "/tenant/profile" },
];

interface SidebarProps {
  role: "ADMIN" | "TENANT";
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, userName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ payments: 0, maintenance: 0, notifications: 0, rent: 0 });
  const [clearedStats, setClearedStats] = useState<Record<string, number>>({});
  const navItems = role === "ADMIN" ? adminNav : tenantNav;

  useEffect(() => {
    navItems.forEach(item => {
      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
      let currentBadgeCount = 0;
      if (item.label === "Payments" || item.label === "My Payments") currentBadgeCount = stats.payments;
      else if (item.label === "Maintenance") currentBadgeCount = stats.maintenance;
      else if (item.label === "Notifications") currentBadgeCount = stats.notifications;
      else if (item.label === "Rent Tracker") currentBadgeCount = stats.rent;
      
      if (isActive && currentBadgeCount > 0) {
        setClearedStats(prev => {
          if ((prev[item.label] || 0) < currentBadgeCount) {
            return { ...prev, [item.label]: currentBadgeCount };
          }
          return prev;
        });
      }
    });
  }, [pathname, stats, navItems]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/sidebar-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchStats();
    // Poll every 30 seconds for new notifications/payments
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? "open" : ""}`}
        style={{
          width: collapsed ? "70px" : "var(--sidebar-width)",
        }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #FFD700, #F59E0B, #D97706)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 20px rgba(245,158,11,0.5), inset 0 2px 4px rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,215,0,0.6)",
                transform: "rotate(-5deg)",
              }}
            >
              <Building size={22} color="#1E1E1E" style={{ transform: "rotate(5deg)" }} />
            </div>
            {!collapsed && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0px", marginLeft: "4px" }}>
                <div style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  fontFamily: "var(--font-display)",
                  lineHeight: 1.05,
                  background: "linear-gradient(to right, #FFE259, #FFA751)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  textShadow: "0px 2px 10px rgba(255,165,0,0.3)"
                }}>
                  ATUL
                </div>
                <div style={{
                  fontSize: "8.5px",
                  color: "#FCD34D",
                  fontWeight: 800,
                  letterSpacing: "4px",
                  textTransform: "uppercase" as const,
                  opacity: 0.9,
                  textShadow: "0 0 5px rgba(252,211,77,0.5)",
                }}>
                  RESIDENCY
                </div>
                <div style={{
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(90deg, #F59E0B, transparent)",
                  marginTop: "2px",
                  borderRadius: "2px",
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav" style={{ flex: 1, overflowY: "auto" }}>
          {!collapsed && (
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1px", color: "rgba(226,232,240,0.3)", textTransform: "uppercase", padding: "8px 12px 4px" }}>
              {role === "ADMIN" ? "Management" : "My Portal"}
            </div>
          )}

          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            let badgeCount = 0;
            if (item.label === "Payments" || item.label === "My Payments") badgeCount = stats.payments;
            else if (item.label === "Maintenance") badgeCount = stats.maintenance;
            else if (item.label === "Notifications") badgeCount = stats.notifications;
            else if (item.label === "Rent Tracker") badgeCount = stats.rent;
            
            const displayBadgeCount = (clearedStats[item.label] !== undefined && badgeCount <= clearedStats[item.label]) ? 0 : badgeCount;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-item", isActive && "active")}
                title={collapsed ? item.label : ""}
                onClick={onClose}
                style={{ position: "relative" }}
              >
                <item.icon className="sidebar-icon" size={20} />
                {!collapsed && <span>{item.label}</span>}
                {displayBadgeCount > 0 && !collapsed && (
                  <span style={{
                    marginLeft: "auto",
                    background: "#ef4444",
                    color: "white",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "99px",
                    fontWeight: "bold",
                    lineHeight: 1
                  }}>
                    {displayBadgeCount > 99 ? "99+" : displayBadgeCount}
                  </span>
                )}
                {displayBadgeCount > 0 && collapsed && (
                  <div style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "8px",
                    height: "8px",
                    background: "#ef4444",
                    borderRadius: "50%",
                    boxShadow: "0 0 4px rgba(239,68,68,0.5)"
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--glass-border)" }}>
          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-item"
            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", color: "rgba(239,68,68,0.7)" }}
            title={collapsed ? "Sign out" : ""}
          >
            <LogOut size={20} />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-item"
            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer" }}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}



