"use client";

import { Bell, Menu, Search, X, AlertCircle, CheckCircle2, Info, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close panels on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchNotifications();
    } catch {}
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchNotifications();
    } catch {}
  }

  const getNotifIcon = (type: string) => {
    if (type === "RENT_OVERDUE") return { Icon: AlertCircle, color: "#ef4444" };
    if (type === "PAYMENT_APPROVED" || type === "PAYMENT_RECEIVED") return { Icon: CheckCircle2, color: "#10b981" };
    return { Icon: Info, color: "#3b82f6" };
  };

  const role = (session?.user as any)?.role;

  return (
    <header className="topbar" style={{ justifyContent: "space-between", gap: "16px" }}>
      {/* Left: Menu + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={onMenuClick}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(226,232,240,0.7)", display: "flex", alignItems: "center",
            padding: "6px", borderRadius: "8px", transition: "all 0.2s",
          }}
          className="lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 style={{ fontSize: "17px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0", lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "1px" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Search + Notif + User */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Search */}
        <div className="search-bar" style={{ display: "flex" }}>
          <Search size={16} color="rgba(226,232,240,0.4)" />
          <input placeholder="Search..." />
        </div>

        {/* Notifications Bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowNotifPanel(!showNotifPanel); setShowUserMenu(false); }}
            style={{
              position: "relative",
              background: showNotifPanel ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${showNotifPanel ? "rgba(139,92,246,0.4)" : "var(--glass-border)"}`,
              borderRadius: "10px",
              width: "38px", height: "38px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: showNotifPanel ? "#a78bfa" : "rgba(226,232,240,0.7)",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "-4px", right: "-4px",
                background: "#ef4444",
                color: "white", fontSize: "10px", fontWeight: 700,
                borderRadius: "999px", minWidth: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", border: "2px solid #0f172a",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifPanel && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: "340px", maxHeight: "420px",
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              zIndex: 1000,
              overflow: "hidden",
              backdropFilter: "blur(20px)",
            }}>
              {/* Header */}
              <div style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0" }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: "8px", fontSize: "11px", fontWeight: 600,
                      background: "rgba(139,92,246,0.2)", color: "#a78bfa",
                      padding: "1px 7px", borderRadius: "999px",
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: "11px", fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifPanel(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)", padding: "2px" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: "auto", maxHeight: "320px" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <Bell size={28} style={{ margin: "0 auto 10px", opacity: 0.2, display: "block" }} />
                    <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.35)" }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const { Icon, color } = getNotifIcon(n.type);
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markRead(n.id)}
                        style={{
                          padding: "12px 16px",
                          display: "flex", gap: "12px", alignItems: "flex-start",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: n.isRead ? "transparent" : "rgba(139,92,246,0.04)",
                          cursor: n.isRead ? "default" : "pointer",
                          transition: "background 0.2s",
                        }}
                      >
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: `${color}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={15} color={color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                            <p style={{ fontSize: "13px", fontWeight: n.isRead ? 500 : 700, color: "#e2e8f0", lineHeight: 1.3 }}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#7c3aed", flexShrink: 0, marginTop: "4px" }} />
                            )}
                          </div>
                          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.45)", marginTop: "2px", lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                          <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.25)", marginTop: "4px" }}>
                            {formatDateTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <button
                  onClick={() => { setShowNotifPanel(false); router.push(role === "ADMIN" ? "/admin/notifications" : "/tenant/notifications"); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: "12px", fontWeight: 600 }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar + dropdown */}
        <div ref={userRef} style={{ position: "relative" }}>
          <div
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifPanel(false); }}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <div
              style={{
                width: "36px", height: "36px",
                background: "var(--gradient-primary)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 700, color: "white",
                flexShrink: 0, overflow: "hidden",
                border: showUserMenu ? "2px solid rgba(139,92,246,0.5)" : "2px solid transparent",
                transition: "border 0.2s",
              }}
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || "A"
              )}
            </div>
            <div style={{ display: "none" }} className="md:block">
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                {session?.user?.name || "User"}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>
                {role === "ADMIN" ? "Administrator" : "Renter"}
              </div>
            </div>
          </div>

          {/* User dropdown */}
          {showUserMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: "200px",
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              zIndex: 1000,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
            }}>
              {/* User info header */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>{session?.user?.name}</p>
                <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>{session?.user?.email}</p>
              </div>

              {/* Menu items */}
              <div style={{ padding: "6px" }}>
                <button
                  onClick={() => { setShowUserMenu(false); signOut({ callbackUrl: "/login" }); }}
                  style={{
                    width: "100%", padding: "9px 12px",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "#f87171", fontSize: "13px", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: "8px",
                    borderRadius: "8px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
