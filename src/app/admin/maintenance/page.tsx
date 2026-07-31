"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Wrench, AlertTriangle, Clock, CheckCircle, X, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, getMaintenanceStatusColor } from "@/lib/utils";

interface MaintenanceRequest {
  id: string;
  category: string;
  title: string;
  description: string;
  photoUrl?: string;
  status: string;
  priority: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  tenant: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    photoUrl?: string;
    room: { number: string; tower: { name: string } };
  };
}

const categoryIcons: Record<string, string> = {
  PLUMBING: "🔧",
  ELECTRICIAN: "⚡",
  CARPENTER: "🪚",
  CLEANING: "🧹",
  SECURITY: "🔒",
  OTHER: "🔨",
};

const priorityColors: Record<string, string> = {
  LOW: "#6b7280",
  NORMAL: "#3b82f6",
  HIGH: "#f59e0b",
  CRITICAL: "#ef4444",
};

function MaintenanceModal({ request, onClose, onSave }: { request: MaintenanceRequest; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ status: request.status, adminNotes: request.adminNotes || "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated!");
      onSave();
      onClose();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {categoryIcons[request.category]} Maintenance Request
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}><X size={20} /></button>
        </div>

        {/* Request details */}
        <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "16px" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "6px" }}>{request.title}</h3>
          <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.6)", lineHeight: 1.6, marginBottom: "10px" }}>{request.description}</p>
          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>
            <span>👤 {request.tenant.name}</span>
            <span>🏠 Room {request.tenant.room.number}</span>
            <span>🏢 {request.tenant.room.tower.name}</span>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.3)", marginTop: "6px" }}>
            Submitted: {formatDateTime(request.createdAt)}
          </p>
        </div>

        {request.photoUrl && (
          <div style={{ marginBottom: "16px", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
            <img src={request.photoUrl} alt="Issue photo" style={{ width: "100%", maxHeight: "250px", objectFit: "cover" }} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="form-label">Update Status</label>
            <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Admin Notes</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Update notes for renter..."
              value={form.adminNotes}
              onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <a
              href={(() => {
                const clean = (request.tenant.whatsapp || "").replace(/\D/g, "");
                const formatted = clean.length === 10 ? `91${clean}` : clean;
                return `https://wa.me/${formatted}?text=${encodeURIComponent(`🏢 Atul Residency\n\nDear ${request.tenant.name},\n\nYour maintenance request "${request.title}" status: ${form.status}\n\n${form.adminNotes ? `Note: ${form.adminNotes}` : ""}\n\nThank you!`)}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center", textDecoration: "none", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d366" }}
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import RoomQrModal from "@/components/admin/RoomQrModal";
import { QrCode as QrCodeIcon } from "lucide-react";

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("OPEN");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchData = async () => {
    try {
      const url = filterStatus !== "all" ? `/api/maintenance?status=${filterStatus}` : "/api/maintenance";
      const res = await fetch(url);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const open = requests.filter((r) => r.status === "OPEN").length;
  const inProgress = requests.filter((r) => r.status === "IN_PROGRESS").length;
  const resolved = requests.filter((r) => r.status === "RESOLVED").length;

  return (
    <AppLayout role="ADMIN" title="Maintenance Management" subtitle="Handle renter service requests">
      {/* Header action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "14px", color: "rgba(226,232,240,0.7)" }}>
          Track and update repair queries from portal & public QR form
        </div>
        <button
          onClick={() => setShowQrModal(true)}
          className="btn-primary"
          style={{
            background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: "13px",
            padding: "8px 16px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(20,184,166,0.3)",
          }}
        >
          <QrCodeIcon size={16} /> Public Form & QR Code
        </button>
      </div>

      {showQrModal && <RoomQrModal onClose={() => setShowQrModal(false)} />}
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Open", value: open, color: "#ef4444", icon: AlertTriangle },
          { label: "In Progress", value: inProgress, color: "#f59e0b", icon: Clock },
          { label: "Resolved", value: resolved, color: "#10b981", icon: CheckCircle },
          { label: "Total", value: requests.length, color: "#8b5cf6", icon: Wrench },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <s.icon size={13} color={s.color} />
              <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase" }}>{s.label}</span>
            </div>
            <p style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "all"].map((s) => {
          const colors: Record<string, string> = { OPEN: "#ef4444", IN_PROGRESS: "#f59e0b", RESOLVED: "#10b981", CLOSED: "#6b7280", all: "#8b5cf6" };
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: `1px solid ${filterStatus === s ? colors[s] + "40" : "var(--glass-border)"}`,
                background: filterStatus === s ? `${colors[s]}15` : "transparent",
                color: filterStatus === s ? colors[s] : "rgba(226,232,240,0.5)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
              }}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="shimmer" style={{ height: "100px", borderRadius: "14px" }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
          <Wrench size={40} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <h3 style={{ fontWeight: 600 }}>No {filterStatus !== "all" ? filterStatus.toLowerCase().replace("_", " ") : ""} requests</h3>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {requests.map((r) => (
            <div
              key={r.id}
              className="glass-card"
              style={{ padding: "18px", cursor: "pointer" }}
              onClick={() => setSelectedRequest(r)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                  >
                    {categoryIcons[r.category] || "🔨"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <h3 style={{ fontWeight: 700, fontSize: "14px" }}>{r.title}</h3>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: priorityColors[r.priority], background: `${priorityColors[r.priority]}15`, padding: "2px 8px", borderRadius: "999px", border: `1px solid ${priorityColors[r.priority]}25` }}>
                        {r.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)", marginBottom: "8px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description}
                    </p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "rgba(226,232,240,0.4)", alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "16px", height: "16px", background: "var(--gradient-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "8px", color: "white", flexShrink: 0, overflow: "hidden" }}>
                          {r.tenant.photoUrl ? (
                            <img src={r.tenant.photoUrl} alt={r.tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            r.tenant.name.charAt(0)
                          )}
                        </div>
                        {r.tenant.name}
                      </span>
                      <span>🏠 Room {r.tenant.room.number} · {r.tenant.room.tower.name}</span>
                      <span>📅 {formatDateTime(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                  <span className={`badge ${getMaintenanceStatusColor(r.status)}`}>
                    {r.status.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(139,92,246,0.8)" }}>{r.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <MaintenanceModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSave={fetchData}
        />
      )}
    </AppLayout>
  );
}
