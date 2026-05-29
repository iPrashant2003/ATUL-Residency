"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppLayoutProps {
  children: React.ReactNode;
  role: "ADMIN" | "TENANT";
  title: string;
  subtitle?: string;
  userName?: string;
}

export default function AppLayout({ children, role, title, subtitle, userName }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-mesh" style={{ minHeight: "100vh" }}>
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Sidebar */}
      <Sidebar
        role={role}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main style={{ padding: "24px", flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
