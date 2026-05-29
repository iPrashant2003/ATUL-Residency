"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Bell, Check, Trash2, MailOpen, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.success("All marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to update notifications");
    }
  }

  async function markSingleRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      fetchNotifications();
    } catch {
      toast.error("Failed to update notification");
    }
  }

  return (
    <AppLayout role="ADMIN" title="Notifications" subtitle="System alerts, payment updates, and renter requests">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Actions bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "14px", color: "rgba(226,232,240,0.5)" }}>
            {notifications.filter(n => !n.isRead).length} unread alerts
          </span>
          {notifications.some(n => !n.isRead) && (
            <button onClick={markAllRead} className="btn-ghost" style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}>
              <Check size={14} />
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: "70px", borderRadius: "10px" }} />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
            <Bell size={40} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
            <h3 style={{ fontWeight: 600, marginBottom: "6px" }}>No notifications</h3>
            <p style={{ color: "rgba(226,232,240,0.4)", fontSize: "13px" }}>You are all caught up! System logs are clear.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.map((n) => {
              const Icon = n.type === "RENT_OVERDUE" ? AlertCircle : n.type === "PAYMENT_APPROVED" ? CheckCircle2 : Info;
              const iconColor = n.type === "RENT_OVERDUE" ? "#ef4444" : n.type === "PAYMENT_APPROVED" ? "#10b981" : "#3b82f6";
              
              return (
                <div
                  key={n.id}
                  className="glass-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    borderLeft: `3px solid ${n.isRead ? "transparent" : "#ff3333"}`,
                    background: n.isRead ? "" : "rgba(229,9,20,0.03)",
                  }}
                >
                  <div style={{
                    width: "36px", height: "36px", background: `${iconColor}15`,
                    borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={18} color={iconColor} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: n.isRead ? "rgba(226,232,240,0.85)" : "#e2e8f0" }}>
                        {n.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.6)", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => markSingleRead(n.id)}
                      title="Mark as read"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)", padding: "4px" }}
                    >
                      <MailOpen size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
