"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  CheckCircle2, XCircle, Clock, IndianRupee, Filter, Search,
  ExternalLink, Eye, MessageCircle, RefreshCw, Bell, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  transactionId?: string;
  screenshotUrl?: string;
  notes?: string;
  createdAt: string;
  verifiedAt?: string;
  tenant: {
    id: string;
    name: string;
    phone: string;
    whatsapp?: string;
    room?: { number: string; tower?: { name: string } };
  };
  rentRecord?: { month: number; year: number; totalAmount: number };
}

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusConfig = {
  PENDING: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", icon: Clock },
  APPROVED: { label: "Approved", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", icon: XCircle },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/api/payments" : `/api/payments?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [filter]);

  async function handleAction(paymentId: string, status: "APPROVED" | "REJECTED", rentRecordId?: string) {
    setProcessing(paymentId);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status, rentRecordId }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "APPROVED" ? "Payment approved! Rent record updated ✅" : "Payment rejected ❌");
      fetchPayments();
      setViewPayment(null);
    } catch {
      toast.error("Failed to update payment");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!window.confirm("Are you sure you want to delete this payment permanently? This will remove it from the database, adjust any approved amounts, and notify the renter via WhatsApp.")) {
      return;
    }
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete payment");
      }
      toast.success("Payment deleted successfully and renter notified 🗑️");
      fetchPayments();
      setViewPayment(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment");
    } finally {
      setProcessing(null);
    }
  }

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.tenant?.name?.toLowerCase().includes(q) || p.tenant?.room?.number?.includes(q) || p.transactionId?.toLowerCase().includes(q);
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return (
    <AppLayout role="ADMIN" title="Payment Approvals" subtitle="Review and approve renter payment submissions">
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        {/* Alert for pending */}
        {pendingCount > 0 && (
          <div style={{
            padding: "14px 20px", marginBottom: "20px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "12px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <Bell size={18} color="#f59e0b" />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#fbbf24" }}>
              {pendingCount} payment{pendingCount > 1 ? "s" : ""} awaiting your approval
            </span>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "3px" }}>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: "7px", border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: 600, transition: "all 0.2s",
                  background: filter === f ? "rgba(139,92,246,0.25)" : "transparent",
                  color: filter === f ? "#a78bfa" : "rgba(226,232,240,0.4)",
                }}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                {f === "PENDING" && pendingCount > 0 && (
                  <span style={{ marginLeft: "6px", background: "#f59e0b", color: "#000", fontSize: "10px", fontWeight: 800, borderRadius: "999px", padding: "1px 5px" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="search-bar" style={{ flex: 1, minWidth: "200px" }}>
            <Search size={14} color="rgba(226,232,240,0.4)" />
            <input
              placeholder="Search by name, room, transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button onClick={fetchPayments} className="btn-ghost" style={{ padding: "8px 12px" }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Payment list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: "90px", borderRadius: "12px" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
            <CheckCircle2 size={40} style={{ margin: "0 auto 16px", opacity: 0.2, display: "block" }} />
            <h3 style={{ fontWeight: 600, marginBottom: "6px" }}>No payments found</h3>
            <p style={{ color: "rgba(226,232,240,0.4)", fontSize: "13px" }}>
              {filter === "PENDING" ? "All caught up! No pending approvals." : "No payments match the filter."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((p) => {
              const cfg = statusConfig[p.status];
              const StatusIcon = cfg.icon;
              const waPhone = (p.tenant?.whatsapp || p.tenant?.phone || "").replace(/\D/g, "");
              const waNum = waPhone.startsWith("91") ? waPhone : `91${waPhone}`;

              return (
                <div
                  key={p.id}
                  className="glass-card"
                  style={{
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    borderLeft: `3px solid ${cfg.color}`,
                  }}
                >
                  {/* Status icon */}
                  <div style={{ width: "40px", height: "40px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <StatusIcon size={20} color={cfg.color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#e2e8f0" }}>{p.tenant?.name}</span>
                      {p.tenant?.room && (
                        <span style={{ fontSize: "11px", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", padding: "1px 8px", color: "#a78bfa" }}>
                          Room {p.tenant.room.number} · {p.tenant.room.tower?.name}
                        </span>
                      )}
                      <span style={{ fontSize: "11px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "6px", padding: "1px 8px", color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>
                        {formatDateTime(p.createdAt)}
                      </span>
                      {p.method && (
                        <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.4)" }}>via {p.method}</span>
                      )}
                      {p.transactionId && (
                        <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.35)", fontFamily: "monospace" }}>
                          UTR: {p.transactionId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-display)" }}>
                      {formatCurrency(p.amount)}
                    </div>
                    {p.rentRecord && (
                      <div style={{ fontSize: "11px", color: "rgba(226,232,240,0.35)", marginTop: "2px" }}>
                        {MONTH_NAMES[p.rentRecord.month]} {p.rentRecord.year}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => setViewPayment(p)}
                      style={{ width: "34px", height: "34px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(226,232,240,0.5)" }}
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <a
                      href={`https://wa.me/${waNum}?text=${encodeURIComponent(`Hi ${p.tenant?.name}, we received your payment of ₹${p.amount.toLocaleString("en-IN")}. Status: ${p.status === "APPROVED" ? "✅ Approved" : p.status === "REJECTED" ? "❌ Rejected" : "⏳ Under review"}. - Atul Residency`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ width: "34px", height: "34px", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#25d366", textDecoration: "none" }}
                      title="WhatsApp renter"
                    >
                      <MessageCircle size={15} />
                    </a>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={processing === p.id}
                      style={{ width: "34px", height: "34px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}
                      title="Delete payment permanently"
                    >
                      <Trash2 size={15} />
                    </button>
                    {p.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction(p.id, "APPROVED", p.rentRecord ? (p as any).rentRecordId : undefined)}
                          disabled={processing === p.id}
                          style={{ padding: "0 14px", height: "34px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", cursor: "pointer", color: "#10b981", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(p.id, "REJECTED")}
                          disabled={processing === p.id}
                          style={{ padding: "0 14px", height: "34px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", cursor: "pointer", color: "#ef4444", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                    {p.status === "APPROVED" && (
                      <button
                        onClick={() => handleAction(p.id, "REJECTED")}
                        disabled={processing === p.id}
                        style={{ padding: "0 14px", height: "34px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", cursor: "pointer", color: "#f87171", fontSize: "12px", fontWeight: 600 }}
                      >
                        Mark Unpaid
                      </button>
                    )}
                    {p.status === "REJECTED" && (
                      <button
                        onClick={() => handleAction(p.id, "APPROVED")}
                        disabled={processing === p.id}
                        style={{ padding: "0 14px", height: "34px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", cursor: "pointer", color: "#34d399", fontSize: "12px", fontWeight: 600 }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {viewPayment && (
        <div className="modal-overlay" onClick={() => setViewPayment(null)}>
          <div className="modal-content" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "17px" }}>Payment Details</h3>
              <button onClick={() => setViewPayment(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "Renter", value: viewPayment.tenant?.name },
                { label: "Room", value: `${viewPayment.tenant?.room?.number} · ${viewPayment.tenant?.room?.tower?.name}` },
                { label: "Amount", value: formatCurrency(viewPayment.amount) },
                { label: "Method", value: viewPayment.method },
                { label: "Status", value: statusConfig[viewPayment.status].label },
                { label: "Submitted", value: formatDateTime(viewPayment.createdAt) },
                ...(viewPayment.transactionId ? [{ label: "UTR/TxnID", value: viewPayment.transactionId }] : []),
                ...(viewPayment.notes ? [{ label: "Notes", value: viewPayment.notes }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{label}</p>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Payment screenshot */}
            {viewPayment.screenshotUrl && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment Screenshot</p>
                <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", background: "rgba(0,0,0,0.2)", maxHeight: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={viewPayment.screenshotUrl} alt="Payment proof" style={{ maxWidth: "100%", maxHeight: "280px", objectFit: "contain" }} />
                </div>
                <a href={viewPayment.screenshotUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "12px", color: "#7c3aed", textDecoration: "none" }}>
                  <ExternalLink size={12} /> Open full size
                </a>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              {viewPayment.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handleAction(viewPayment.id, "APPROVED", (viewPayment as any).rentRecordId)}
                    disabled={processing === viewPayment.id}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    <CheckCircle2 size={16} /> Approve Payment
                  </button>
                  <button
                    onClick={() => handleAction(viewPayment.id, "REJECTED")}
                    disabled={processing === viewPayment.id}
                    style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", cursor: "pointer", color: "#ef4444", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(viewPayment.id)}
                disabled={processing === viewPayment.id}
                style={{
                  flex: viewPayment.status === "PENDING" ? "0 0 44px" : 1,
                  padding: "10px",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
                title="Delete payment permanently"
              >
                <Trash2 size={16} />
                {viewPayment.status !== "PENDING" && "Delete Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
