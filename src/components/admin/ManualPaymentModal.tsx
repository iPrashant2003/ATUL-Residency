"use client";

import { useState } from "react";
import { X, Loader2, Upload, Camera, CreditCard, CheckCircle2, IndianRupee, FileText, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface RentRecord {
  id: string;
  month: number;
  year: number;
  totalAmount: number;
  amountPaid: number;
  status: string;
}

interface TenantProps {
  id: string;
  name: string;
  phone: string;
  rentAmount: number;
  room?: {
    number: string;
    tower?: { name: string };
  };
  rentRecords?: RentRecord[];
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ManualPaymentModal({
  tenant,
  onClose,
  onSuccess,
}: {
  tenant: TenantProps;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const latestRecord = tenant.rentRecords?.[0];
  const defaultDue = latestRecord ? Math.max(0, latestRecord.totalAmount - latestRecord.amountPaid) : tenant.rentAmount;

  const [rentRecordId, setRentRecordId] = useState<string>(latestRecord?.id || "");
  const [amount, setAmount] = useState<string>(defaultDue > 0 ? String(defaultDue) : String(tenant.rentAmount));
  const [method, setMethod] = useState<"UPI" | "CASH" | "BANK_TRANSFER" | "QR_CODE">("UPI");
  const [transactionId, setTransactionId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle file selection & upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image");
      }

      setScreenshotUrl(data.url);
      toast.success("Payment screenshot uploaded successfully! 📸");
    } catch (err: any) {
      toast.error(err.message || "Screenshot upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Selected record calculations
  const selectedRecord = tenant.rentRecords?.find((r) => r.id === rentRecordId) || latestRecord;
  const currentTotalDue = selectedRecord ? selectedRecord.totalAmount : tenant.rentAmount + 500;
  const currentAmountPaid = selectedRecord ? selectedRecord.amountPaid : 0;
  const currentBalance = Math.max(0, currentTotalDue - currentAmountPaid);
  
  const paymentNum = parseFloat(amount) || 0;
  const newRemainingBalance = Math.max(0, currentBalance - paymentNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          rentRecordId: rentRecordId || undefined,
          amount: parseFloat(amount),
          method,
          transactionId: transactionId.trim() || undefined,
          screenshotUrl: screenshotUrl || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
      } else {
        toast.success(`Payment of ${formatCurrency(paymentNum)} recorded & approved! 🎉`);
        onSuccess();
        onClose();
      }
    } catch {
      toast.error("Network error - could not save payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "540px",
          width: "100%",
          padding: "28px",
          borderRadius: "20px",
          background: "linear-gradient(145deg, rgba(20, 27, 45, 0.98) 0%, rgba(13, 17, 28, 0.99) 100%)",
          border: "1px solid rgba(20, 184, 166, 0.25)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(20,184,166,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(20,184,166,0.12)",
                border: "1px solid rgba(20,184,166,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#14B8A6",
              }}
            >
              <CreditCard size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>
                Upload Payment Screenshot
              </h2>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>
                Record offline payment for <strong style={{ color: "#14B8A6" }}>{tenant.name}</strong> (Room {tenant.room?.number || "—"})
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
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Target Month Selector */}
          {tenant.rentRecords && tenant.rentRecords.length > 0 && (
            <div>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600 }}>
                Select Billing Month
              </label>
              <select
                className="form-input"
                value={rentRecordId}
                onChange={(e) => {
                  setRentRecordId(e.target.value);
                  const rec = tenant.rentRecords?.find((r) => r.id === e.target.value);
                  if (rec) {
                    const due = Math.max(0, rec.totalAmount - rec.amountPaid);
                    setAmount(due > 0 ? String(due) : String(rec.totalAmount));
                  }
                }}
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {tenant.rentRecords.map((r) => {
                  const due = Math.max(0, r.totalAmount - r.amountPaid);
                  return (
                    <option key={r.id} value={r.id}>
                      {MONTH_NAMES[r.month]} {r.year} — Total: {formatCurrency(r.totalAmount)} ({r.status === "PAID" ? "PAID" : `Due: ${formatCurrency(due)}`})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Amount Paid & Method Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600 }}>
                Amount Received (₹) *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{
                    paddingLeft: "32px",
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#34d399",
                    background: "rgba(15,23,42,0.6)",
                    borderColor: "rgba(52,211,153,0.3)",
                  }}
                />
                <IndianRupee
                  size={15}
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#34d399" }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600 }}>
                Payment Method
              </label>
              <select
                className="form-input"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <option value="UPI">UPI (Google Pay/PhonePe)</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                <option value="QR_CODE">QR Code Scan</option>
              </select>
            </div>
          </div>

          {/* Screenshot Upload Drag & Drop Box */}
          <div>
            <label className="form-label" style={{ fontSize: "12px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
              <span>Payment Screenshot</span>
              <span style={{ color: "rgba(226,232,240,0.4)" }}>(Optional)</span>
            </label>

            {screenshotUrl ? (
              <div
                style={{
                  position: "relative",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid rgba(20,184,166,0.3)",
                  background: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  gap: "14px",
                }}
              >
                <img
                  src={screenshotUrl}
                  alt="Payment Screenshot Preview"
                  style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={14} /> Screenshot Attached
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", marginTop: "2px" }}>Ready to save to database</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshotUrl("")}
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  borderRadius: "14px",
                  border: "2px dashed rgba(20,184,166,0.3)",
                  background: "rgba(20,184,166,0.03)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
                {uploading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#14B8A6" }}>
                    <Loader2 size={20} className="animate-spin" />
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Uploading screenshot...</span>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "rgba(20,184,166,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#14B8A6",
                        marginBottom: "8px",
                      }}
                    >
                      <Camera size={20} />
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Click or Drag Screenshot Here</p>
                    <p style={{ fontSize: "11.5px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>Supports PNG, JPG, Google Pay/PhonePe screenshots</p>
                  </>
                )}
              </label>
            )}
          </div>

          {/* Reference / Transaction ID & Notes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600 }}>
                Transaction ID / Ref
              </label>
              <input
                className="form-input"
                placeholder="e.g. UPI 41920192"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600 }}>
                Admin Notes
              </label>
              <input
                className="form-input"
                placeholder="e.g. Paid via cash to landlord"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
          </div>

          {/* Summary Box */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            <div>
              <span style={{ color: "rgba(226,232,240,0.5)", display: "block", fontSize: "11.5px" }}>Remaining After Payment</span>
              <strong style={{ fontSize: "16px", color: newRemainingBalance === 0 ? "#34d399" : "#fbbf24" }}>
                {newRemainingBalance === 0 ? "₹0 (Fully Paid ✅)" : `${formatCurrency(newRemainingBalance)} (Partial)`}
              </strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "rgba(226,232,240,0.5)", display: "block", fontSize: "11.5px" }}>Auto-Approved</span>
              <span style={{ color: "#14B8A6", fontWeight: 700, fontSize: "12px" }}>Instant DB & Receipt</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: "10px 18px", borderRadius: "10px" }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || uploading}
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Record & Approve Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
