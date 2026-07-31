"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Calendar, Clock, CheckCircle2, AlertCircle, IndianRupee, Eye, Image as ImageIcon, ExternalLink, Download, FileText, Zap, ShieldCheck, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface HistoryModalProps {
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  towerName?: string;
  onClose: () => void;
  onOpenUploadModal?: () => void;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RenterHistoryModal({
  tenantId,
  tenantName,
  roomNumber,
  towerName,
  onClose,
  onOpenUploadModal,
}: {
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  towerName?: string;
  onClose: () => void;
  onOpenUploadModal?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [tenantId]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/history`);
      if (!res.ok) throw new Error("Failed to load history");
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Failed to load renter payment history");
    } finally {
      setLoading(false);
    }
  }

  const tenant = data?.tenant;
  const stats = data?.stats;
  const rentRecords: any[] = data?.rentRecords || [];

  const filteredRecords = rentRecords.filter((rec) => {
    if (statusFilter === "PAID") return rec.status === "PAID" || rec.status === "ADVANCE_PAID";
    if (statusFilter === "UNPAID") return rec.status === "PENDING" || rec.status === "OVERDUE" || rec.status === "PARTIAL";
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9990 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: "28px",
          borderRadius: "20px",
          background: "linear-gradient(145deg, rgba(20, 27, 45, 0.98) 0%, rgba(13, 17, 28, 0.99) 100%)",
          border: "1px solid rgba(20, 184, 166, 0.25)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(20,184,166,0.12)",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(20,184,166,0.12)",
                border: "1px solid rgba(20,184,166,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#14B8A6",
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>
                1-Year Payment & Rent History
              </h2>
              <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>
                Tenant: <strong style={{ color: "#14B8A6" }}>{tenantName}</strong> • Room {roomNumber || tenant?.room?.number || "—"} ({towerName || tenant?.room?.tower?.name || ""})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "6px",
              color: "rgba(226,232,240,0.6)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={36} className="animate-spin" style={{ color: "#14B8A6", marginBottom: "12px" }} />
            <p style={{ color: "rgba(226,232,240,0.6)", fontSize: "14px" }}>Loading tenant payment records & screenshots...</p>
          </div>
        ) : (
          <>
            {/* Summary KPI Strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", fontWeight: 700 }}>
                  12-Month Total Paid
                </span>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
                  {formatCurrency(stats?.totalPaidLastYear || 0)}
                </p>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", fontWeight: 700 }}>
                  Current Pending Balance
                </span>
                <p style={{ fontSize: "18px", fontWeight: 800, color: (stats?.outstandingBalance || 0) > 0 ? "#f87171" : "#34d399", marginTop: "4px" }}>
                  {formatCurrency(stats?.outstandingBalance || 0)}
                </p>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", fontWeight: 700 }}>
                  Payment Reliability
                </span>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#14B8A6", marginTop: "4px" }}>
                  {stats?.paymentEfficiency || 100}% Paid
                </p>
              </div>
            </div>

            {/* Controls Bar: Filter & Quick Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["ALL", "PAID", "UNPAID"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: statusFilter === f ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.03)",
                      borderColor: statusFilter === f ? "#14B8A6" : "rgba(255,255,255,0.1)",
                      color: statusFilter === f ? "#14B8A6" : "rgba(226,232,240,0.6)",
                    }}
                  >
                    {f === "ALL" ? "All Months" : f === "PAID" ? "Paid Only" : "Pending / Due"}
                  </button>
                ))}
              </div>

              {onOpenUploadModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenUploadModal();
                  }}
                  className="btn-primary"
                  style={{
                    padding: "6px 14px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
                  }}
                >
                  + Upload New Payment
                </button>
              )}
            </div>

            {/* Scrollable Month Timeline List */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "6px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(226,232,240,0.4)", fontSize: "14px" }}>
                  No payment history matching filter criteria.
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const isPaid = rec.status === "PAID" || rec.status === "ADVANCE_PAID";
                  const isPartial = rec.status === "PARTIAL";
                  const isOverdue = rec.status === "OVERDUE";
                  const dueBalance = Math.max(0, rec.totalAmount - rec.amountPaid);

                  return (
                    <div
                      key={rec.id}
                      style={{
                        borderRadius: "14px",
                        background: "rgba(15,23,42,0.5)",
                        border: "1px solid",
                        borderColor: isPaid
                          ? "rgba(52,211,153,0.2)"
                          : isPartial
                          ? "rgba(251,191,36,0.2)"
                          : "rgba(248,113,113,0.2)",
                        padding: "18px",
                        position: "relative",
                      }}
                    >
                      {/* Month Header Line */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>
                            {MONTH_NAMES[rec.month]} {rec.year}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: "20px",
                              border: "1px solid",
                              background: isPaid
                                ? "rgba(52,211,153,0.1)"
                                : isPartial
                                ? "rgba(251,191,36,0.1)"
                                : "rgba(248,113,113,0.1)",
                              borderColor: isPaid
                                ? "rgba(52,211,153,0.3)"
                                : isPartial
                                ? "rgba(251,191,36,0.3)"
                                : "rgba(248,113,113,0.3)",
                              color: isPaid ? "#34d399" : isPartial ? "#fbbf24" : "#f87171",
                            }}
                          >
                            {rec.status}
                          </span>
                        </div>

                        <div style={{ fontSize: "13px" }}>
                          <span style={{ color: "rgba(226,232,240,0.5)", marginRight: "6px" }}>Paid:</span>
                          <strong style={{ color: isPaid ? "#34d399" : "#fff" }}>{formatCurrency(rec.amountPaid)}</strong>
                          <span style={{ color: "rgba(226,232,240,0.4)" }}> / {formatCurrency(rec.totalAmount)}</span>
                        </div>
                      </div>

                      {/* Breakdown Details */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "8px",
                          fontSize: "12px",
                          color: "rgba(226,232,240,0.6)",
                          background: "rgba(0,0,0,0.2)",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <span>Rent: </span>
                          <strong style={{ color: "#fff" }}>{formatCurrency(rec.rentAmount)}</strong>
                        </div>
                        {rec.electricityBill > 0 && (
                          <div>
                            <span>Electricity: </span>
                            <strong style={{ color: "#fff" }}>{formatCurrency(rec.electricityBill)}</strong>
                          </div>
                        )}
                        {rec.maintenanceCharge > 0 && (
                          <div>
                            <span>Maintenance: </span>
                            <strong style={{ color: "#fff" }}>{formatCurrency(rec.maintenanceCharge)}</strong>
                          </div>
                        )}
                        {dueBalance > 0 && (
                          <div>
                            <span>Remaining Due: </span>
                            <strong style={{ color: "#f87171" }}>{formatCurrency(dueBalance)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Associated Payments list & Screenshots */}
                      {rec.payments && rec.payments.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase" }}>
                            Payment Records & Screenshots ({rec.payments.length})
                          </span>
                          {rec.payments.map((p: any) => (
                            <div
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                background: "rgba(20,184,166,0.05)",
                                border: "1px solid rgba(20,184,166,0.15)",
                                gap: "12px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {p.screenshotUrl ? (
                                  <div
                                    onClick={() => setSelectedImage(p.screenshotUrl)}
                                    style={{
                                      position: "relative",
                                      cursor: "pointer",
                                      borderRadius: "8px",
                                      overflow: "hidden",
                                      border: "1px solid rgba(20,184,166,0.3)",
                                    }}
                                  >
                                    <img
                                      src={p.screenshotUrl}
                                      alt="Payment Screenshot"
                                      style={{ width: "42px", height: "42px", objectFit: "cover" }}
                                    />
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "rgba(0,0,0,0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#fff",
                                      }}
                                    >
                                      <Eye size={14} />
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      width: "42px",
                                      height: "42px",
                                      borderRadius: "8px",
                                      background: "rgba(255,255,255,0.05)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "rgba(226,232,240,0.4)",
                                    }}
                                  >
                                    <ImageIcon size={18} />
                                  </div>
                                )}

                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <strong style={{ fontSize: "14px", color: "#34d399" }}>{formatCurrency(p.amount)}</strong>
                                    <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", color: "rgba(226,232,240,0.7)" }}>
                                      {p.method}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", marginTop: "2px" }}>
                                    Date: {formatDate(p.createdAt)} {p.transactionId ? `• Ref: ${p.transactionId}` : ""}
                                  </p>
                                </div>
                              </div>

                              {p.screenshotUrl && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedImage(p.screenshotUrl)}
                                  className="btn-ghost"
                                  style={{ fontSize: "11.5px", padding: "5px 10px", color: "#14B8A6" }}
                                >
                                  View Screenshot 🔍
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", fontStyle: "italic" }}>
                          No explicit payment screenshots attached for this month.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal for viewing full-size payment screenshot */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                padding: "8px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
            <img
              src={selectedImage}
              alt="Payment Screenshot Lightbox"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "12px",
                border: "2px solid rgba(20,184,166,0.4)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
