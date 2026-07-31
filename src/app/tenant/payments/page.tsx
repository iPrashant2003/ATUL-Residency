"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { CreditCard, Upload, Loader2, CheckCircle, QrCode, Copy, X, AlertTriangle, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ui/ImageUpload";
import { getMonthName, formatCurrency } from "@/lib/utils";

export default function TenantPaymentsPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#14b8a6" }}>Loading...</div>}>
      <TenantPaymentsInner />
    </Suspense>
  );
}

function TenantPaymentsInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [profileLoading, setProfileLoading] = useState(true);
  const [dbTenantId, setDbTenantId] = useState<string | null>(null);
  const [invoicePrefilled, setInvoicePrefilled] = useState(false);
  
  const userId = (session?.user as any)?.id;
  const sessionTenantId = (session?.user as any)?.tenantId;

  useEffect(() => {
    // If we have tenantId in the session, use it!
    if (sessionTenantId) {
      setDbTenantId(sessionTenantId);
      setProfileLoading(false);
      return;
    }

    // If session doesn't have it (or it's stale), fetch from database profile API
    if (userId) {
      fetch("/api/tenant/profile")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (data?.tenant?.id) {
            setDbTenantId(data.tenant.id);
          }
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    } else {
      setProfileLoading(false);
    }
  }, [userId, sessionTenantId]);

  const [form, setForm] = useState({
    amount: "",
    method: "UPI",
    transactionId: "",
    screenshotUrl: "",
    notes: "",
    rentRecordId: "",
  });

  // Pre-fill from PDF Pay Now link: ?rentRecordId=X&amount=Y&month=Z&year=W
  useEffect(() => {
    const paramAmount = searchParams.get("amount");
    const paramRentRecordId = searchParams.get("rentRecordId");
    if (paramAmount || paramRentRecordId) {
      setForm((prev) => ({
        ...prev,
        amount: paramAmount || prev.amount,
        rentRecordId: paramRentRecordId || prev.rentRecordId,
      }));
      setInvoicePrefilled(true);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [upiDetails, setUpiDetails] = useState({
    upiId: "atultiwari123321@oksbi",
    upiName: "Atul Tiwari",
  });
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const fetchMyPayments = async (tid: string) => {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/payments?tenantId=${tid}`);
      if (res.ok) {
        const data = await res.json();
        setMyPayments(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally { setPaymentsLoading(false); }
  };

  useEffect(() => {
    if (!dbTenantId) return;
    fetch(`/api/rent?tenantId=${dbTenantId}&status=PENDING`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const pending = data.filter(r => r.status !== "PAID");
          setPendingRecords(pending);
          if (pending.length > 0) {
            const latest = pending[0];
            const outstanding = latest.totalAmount - (latest.amountPaid || 0);
            setForm((prev) => ({
              ...prev,
              amount: outstanding.toString(),
              rentRecordId: latest.id,
            }));
          }
        }
      })
      .catch((err) => console.error("Error fetching pending rent records:", err));

    fetchMyPayments(dbTenantId);
  }, [dbTenantId]);

  useEffect(() => {
    fetch("/api/upi")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        if (data.upiId && data.upiName) {
          setUpiDetails({ upiId: data.upiId, upiName: data.upiName });
        }
      })
      .catch(() => {
        const savedUpiId = localStorage.getItem("landlord_upi_id");
        const savedUpiName = localStorage.getItem("landlord_upi_name");
        if (savedUpiId && savedUpiName) {
          setUpiDetails({ upiId: savedUpiId, upiName: savedUpiName });
        }
      });
  }, []);

  function copyUPI() {
    navigator.clipboard.writeText(upiDetails.upiId);
    toast.success("UPI ID copied!");
  }

  function getUpiUrl(appScheme: string) {
    const amount = form.amount ? parseFloat(form.amount) : 0;
    const note = encodeURIComponent("Rent & Bill Payment - Atul Residency");
    const base = `pa=${upiDetails.upiId}&pn=${encodeURIComponent(upiDetails.upiName)}&cu=INR&tn=${note}`;
    const amtParam = amount > 0 ? `&am=${amount}` : "";

    if (appScheme === "phonepe") {
      return `phonepe://pay?${base}${amtParam}`;
    } else if (appScheme === "paytm") {
      return `paytmmp://pay?${base}${amtParam}`;
    } else if (appScheme === "gpay") {
      return `gpay://upi/pay?${base}${amtParam}`;
    }
    // GPay and others can use the default upi:// protocol
    return `upi://pay?${base}${amtParam}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dbTenantId) {
      toast.error("No active room assignment found. Cannot submit payment.");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tenantId: dbTenantId }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      toast.success("Payment submitted for verification! 🎉");
      // Refresh payment history immediately after submission
      fetchMyPayments(dbTenantId!);
    } catch {
      toast.error("Failed to submit payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (profileLoading) {
    return (
      <AppLayout role="TENANT" title="Payments" subtitle="Upload your payment proof">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px", margin: "0 auto" }}>
          <div className="shimmer" style={{ height: "180px", borderRadius: "16px" }} />
          <div className="shimmer" style={{ height: "450px", borderRadius: "16px" }} />
        </div>
      </AppLayout>
    );
  }

  if (!dbTenantId) {
    return (
      <AppLayout role="TENANT" title="Payments" subtitle="Upload your payment proof">
        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
          <div className="glass-card" style={{
            padding: "36px",
            border: "1px solid rgba(245,158,11,0.25)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)",
            textAlign: "center",
          }}>
            <div style={{
              width: "64px", height: "64px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0", marginBottom: "12px" }}>
              Room Assignment Pending
            </h2>
            <p style={{ color: "rgba(226,232,240,0.55)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              Your account has been registered, but you have not been assigned to a room yet. Please contact the administrator to assign your room. Once assigned, you will be able to upload payment proof.
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "10px", padding: "12px", fontSize: "14px", color: "rgba(226,232,240,0.7)"
            }}>
              <Phone size={16} color="#14B8A6" />
              <span>Contact Landlord: <strong>+91 6392651108</strong> (Atul Tiwari)</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (submitted) {
    return (
      <AppLayout role="TENANT" title="Payments" subtitle="Upload your payment proof">
        <div style={{ maxWidth: "500px", margin: "60px auto", textAlign: "center" }}>
          <div className="glass-card" style={{ padding: "48px" }}>
            <div style={{ width: "80px", height: "80px", background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "10px" }}>Payment Submitted!</h2>
            <p style={{ color: "rgba(226,232,240,0.5)", marginBottom: "24px", fontSize: "14px" }}>
              Your payment has been submitted and is awaiting admin verification. You'll be notified once approved.
            </p>
            <button className="btn-primary" onClick={() => setSubmitted(false)} style={{ width: "100%", justifyContent: "center" }}>
              Submit Another Payment
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="TENANT" title="My Payments" subtitle="Pay rent and upload proof">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        {/* Invoice Pre-fill Banner */}
        {invoicePrefilled && (
          <div style={{
            display: "flex", alignItems: "center", gap: "14px",
            background: "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0.06) 100%)",
            border: "1px solid rgba(20,184,166,0.35)",
            borderRadius: "14px", padding: "16px 20px", marginBottom: "20px",
          }}>
            <div style={{ width: "40px", height: "40px", background: "rgba(20,184,166,0.15)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText size={20} color="#14B8A6" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "14px", color: "#14B8A6", marginBottom: "2px" }}>✅ Amount pre-filled from your invoice</p>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.55)", lineHeight: 1.5 }}>Your rent amount has been automatically filled in below. Just pay via UPI and upload the screenshot.</p>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          {/* UPI Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(229,9,20,0.15) 0%, rgba(184,29,36,0.1) 100%)",
              border: "1px solid rgba(229,9,20,0.25)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", background: "rgba(229,9,20,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={20} color="#ff3333" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "15px" }}>UPI Payment</p>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Pay to landlord</p>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", marginBottom: "4px" }}>UPI ID</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#ff3333" }}>{upiDetails.upiId}</p>
                <button onClick={copyUPI} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}>
                  <Copy size={14} />
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", marginTop: "4px" }}>{upiDetails.upiName}</p>
            </div>

            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => setShowQR(true)}
                className="btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
              >
                <QrCode size={16} />
                Show QR Code
              </button>
            </div>

            <div style={{ marginTop: "16px", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(226,232,240,0.45)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📱 Quick Pay on Mobile</span>
                {form.amount && parseFloat(form.amount) > 0 && (
                  <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#34d399", padding: "1px 6px", borderRadius: "4px" }}>
                    Auto ₹{parseFloat(form.amount).toLocaleString("en-IN")}
                  </span>
                )}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <a
                  href={getUpiUrl("gpay")}
                  className="btn-ghost"
                  style={{
                    justifyContent: "center",
                    fontSize: "12px",
                    background: "rgba(66,133,244,0.06)",
                    border: "1px solid rgba(66,133,244,0.2)",
                    color: "#4285f4",
                    padding: "8px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 600,
                  }}
                >
                  Google Pay
                </a>
                <a
                  href={getUpiUrl("phonepe")}
                  className="btn-ghost"
                  style={{
                    justifyContent: "center",
                    fontSize: "12px",
                    background: "rgba(95,37,159,0.06)",
                    border: "1px solid rgba(95,37,159,0.2)",
                    color: "#a78bfa",
                    padding: "8px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 600,
                  }}
                >
                  PhonePe
                </a>
                <a
                  href={getUpiUrl("paytm")}
                  className="btn-ghost"
                  style={{
                    justifyContent: "center",
                    fontSize: "12px",
                    background: "rgba(0,185,245,0.06)",
                    border: "1px solid rgba(0,185,245,0.2)",
                    color: "#00b9f5",
                    padding: "8px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 600,
                  }}
                >
                  Paytm
                </a>
                <a
                  href={getUpiUrl("generic")}
                  className="btn-ghost"
                  style={{
                    justifyContent: "center",
                    fontSize: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#e2e8f0",
                    padding: "8px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 600,
                  }}
                >
                  UPI App
                </a>
              </div>
            </div>
          </div>

          {/* Steps card */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px" }}>How to Pay</p>
            {[
              { step: "1", text: "Scan QR or copy UPI ID" },
              { step: "2", text: "Pay the exact amount" },
              { step: "3", text: "Take screenshot of payment" },
              { step: "4", text: "Upload screenshot below" },
              { step: "5", text: "Enter Transaction ID" },
              { step: "6", text: "Submit for verification" },
            ].map((s) => (
              <div key={s.step} style={{ display: "flex", gap: "12px", marginBottom: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "22px", height: "22px", background: "var(--gradient-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white", flexShrink: 0 }}>
                  {s.step}
                </div>
                <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.7)", paddingTop: "2px" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment form */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "20px" }}>
            Upload Payment Proof
          </h3>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {pendingRecords.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <label className="form-label">Select Rent Invoice / Bill to Pay</label>
                <select
                  className="form-input"
                  value={form.rentRecordId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      setForm(prev => ({ ...prev, rentRecordId: "", amount: "" }));
                      return;
                    }
                    const selected = pendingRecords.find(r => r.id === selectedId);
                    if (selected) {
                      const outstanding = selected.totalAmount - (selected.amountPaid || 0);
                      setForm(prev => ({
                        ...prev,
                        rentRecordId: selectedId,
                        amount: outstanding.toString()
                      }));
                    }
                  }}
                >
                  {pendingRecords.map((record) => {
                    const outstanding = record.totalAmount - (record.amountPaid || 0);
                    return (
                      <option key={record.id} value={record.id}>
                        {getMonthName(record.month)} {record.year} — Outstanding: {formatCurrency(outstanding)}
                      </option>
                    );
                  })}
                  <option value="">Other / Custom Payment</option>
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="form-label">Amount Paid (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="8000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select className="form-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="QR_CODE">QR Code</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Transaction ID / UTR Number</label>
              <input
                className="form-input"
                placeholder="Enter transaction ID"
                value={form.transactionId}
                onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              />
            </div>

            <ImageUpload
              value={form.screenshotUrl}
              onChange={(url) => setForm({ ...form, screenshotUrl: url })}
              label="Payment Screenshot *"
              placeholder="Take a photo of your payment receipt or upload"
            />

            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="form-input"
                placeholder="Any notes about this payment..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {loading ? "Submitting..." : "Submit Payment"}
            </button>
          </form>
        </div>

        {/* My Payment History */}
        <div className="glass-card" style={{ padding: "28px", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, fontFamily: "var(--font-display)" }}>My Payment History</h3>
            <button
              onClick={() => dbTenantId && fetchMyPayments(dbTenantId)}
              style={{ background: "transparent", border: "1px solid rgba(20,184,166,0.3)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", color: "#14B8A6", fontSize: "12px", fontWeight: 600 }}
            >
              ↻ Refresh
            </button>
          </div>

          {paymentsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: "64px", borderRadius: "12px" }} />)}
            </div>
          ) : myPayments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(226,232,240,0.35)", fontSize: "14px" }}>
              No payments submitted yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myPayments.map((p) => {
                const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
                  PENDING:  { label: "⏳ Under Review",  color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)"  },
                  APPROVED: { label: "✅ Approved",       color: "#10b981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)"  },
                  REJECTED: { label: "❌ Rejected",       color: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)"   },
                };
                const s = statusMap[p.status] || statusMap.PENDING;
                const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: s.bg, border: `1px solid ${s.border}`,
                    borderRadius: "12px", padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#e2e8f0" }}>
                        ₹{p.amount.toLocaleString("en-IN")}
                      </span>
                      <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>
                        {p.method} &nbsp;·&nbsp;
                        {p.rentRecord ? `${MONTHS[p.rentRecord.month]} ${p.rentRecord.year}` : "Custom"} &nbsp;·&nbsp;
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      {p.transactionId && (
                        <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.35)" }}>ID: {p.transactionId}</span>
                      )}
                    </div>
                    <div style={{
                      padding: "5px 14px", borderRadius: "100px",
                      background: s.bg, border: `1px solid ${s.border}`,
                      color: s.color, fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap",
                    }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal-content" style={{ maxWidth: "380px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px" }}>Scan to Pay</h3>
              <button onClick={() => setShowQR(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}><X size={20} /></button>
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiDetails.upiId}&pn=${encodeURIComponent(upiDetails.upiName)}&cu=INR`}
                alt="UPI QR Code"
                style={{ width: "200px", height: "200px", display: "block", margin: "0 auto" }}
              />
            </div>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#ff3333", marginBottom: "4px" }}>{upiDetails.upiId}</p>
            <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)", marginBottom: "16px" }}>{upiDetails.upiName}</p>
            <button onClick={copyUPI} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              <Copy size={16} />
              Copy UPI ID
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
