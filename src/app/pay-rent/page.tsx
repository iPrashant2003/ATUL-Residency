"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Clock,
  ShieldCheck,
  Building,
  ChevronDown,
  Phone,
  User,
  Copy,
  QrCode,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

function PayRentFormInner() {
  const searchParams = useSearchParams();
  const rentRecordId = searchParams.get("rentRecordId") || searchParams.get("id");

  const [loadingBill, setLoadingBill] = useState(true);
  const [billData, setBillData] = useState<any>(null);
  const [billError, setBillError] = useState<string | null>(null);

  const [form, setForm] = useState({
    amount: "",
    method: "UPI",
    transactionId: "",
    screenshotUrl: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const upiId = "atultiwari123321@oksbi";
  const upiName = "Atul Tiwari (Atul Residency)";

  useEffect(() => {
    if (!rentRecordId) {
      setLoadingBill(false);
      return;
    }

    setLoadingBill(true);
    fetch(`/api/public/rent/${rentRecordId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load bill details");
        return res.json();
      })
      .then((data) => {
        setBillData(data);
        setForm((prev) => ({
          ...prev,
          amount: data.balance > 0 ? data.balance.toString() : data.totalAmount.toString(),
        }));
      })
      .catch((err) => {
        console.error(err);
        setBillError("Failed to load bill details. You can still enter payment manually.");
      })
      .finally(() => setLoadingBill(false));
  }, [rentRecordId]);

  function copyUPI() {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied to clipboard!");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!form.screenshotUrl) {
      toast.error("Please upload your payment screenshot / receipt proof");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rentRecordId: rentRecordId || null,
        tenantId: billData?.tenantId || null,
        amount: parseFloat(form.amount),
        method: form.method,
        transactionId: form.transactionId || null,
        screenshotUrl: form.screenshotUrl,
        notes: form.notes || null,
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit payment");
      }

      setSubmitted(true);
      toast.success("Payment submitted successfully for verification! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #040d0c 0%, #071a17 40%, #0a2420 70%, #04100e 100%)",
        color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: "32px 16px",
        position: "relative",
      }}
    >
      <Toaster position="top-right" theme="dark" />

      {/* Ambient Sea-Green Glow Orbs */}
      <div
        style={{
          position: "fixed",
          top: "-100px",
          left: "-100px",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, rgba(13,184,166,0.16) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-80px",
          right: "-80px",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, rgba(255,185,0,0.10) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "580px", margin: "0 auto", position: "relative" }}>
        {/* Logo Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, #FFE259 0%, #FFA751 50%, #FF6B6B 100%)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 0 3px rgba(255,215,0,0.25), 0 0 30px rgba(255,165,0,0.4)",
            }}
          >
            <Building size={36} color="#051210" />
          </div>

          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              background: "linear-gradient(90deg, #FFE259 0%, #FFA751 50%, #FFD700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "4px",
            }}
          >
            ATUL RESIDENCY
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(13,184,166,0.85)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            ✦ Quick Rent Payment Desk ✦
          </p>
        </div>

        {/* Submitted Confirmation State */}
        {submitted ? (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              borderRadius: "24px",
              padding: "40px 24px",
              textAlign: "center",
              backdropFilter: "blur(20px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle2 size={40} color="#10b981" />
            </div>

            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "10px",
              }}
            >
              Payment Submitted! 🎉
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(226,232,240,0.7)",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              Your payment of <strong style={{ color: "#14b8a6" }}>₹{form.amount}</strong> has been submitted to the Admin for verification. Once approved, your status will update automatically.
            </p>

            <div
              style={{
                background: "rgba(13,184,166,0.08)",
                border: "1px solid rgba(13,184,166,0.25)",
                borderRadius: "14px",
                padding: "16px",
                fontSize: "13px",
                color: "rgba(226,232,240,0.8)",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <Clock size={18} color="#14b8a6" />
              <span>Admin Verification: Usually within 15–30 mins</span>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ amount: "", method: "UPI", transactionId: "", screenshotUrl: "", notes: "" });
              }}
              style={{
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Submit Another Payment
            </button>
          </div>
        ) : (
          <div>
            {/* Rent Bill Summary Card (If loaded) */}
            {loadingBill ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(13,184,166,0.2)",
                  borderRadius: "20px",
                  padding: "24px",
                  textAlign: "center",
                  color: "#14b8a6",
                  marginBottom: "20px",
                }}
              >
                <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: "13px" }}>Loading invoice details...</p>
              </div>
            ) : billData ? (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(13,184,166,0.10) 0%, rgba(13,184,166,0.03) 100%)",
                  border: "1px solid rgba(13,184,166,0.30)",
                  borderRadius: "20px",
                  padding: "20px 24px",
                  marginBottom: "20px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff", marginBottom: "2px" }}>
                      {billData.tenantName}
                    </h3>
                    <p style={{ fontSize: "12px", color: "rgba(13,184,166,0.9)", fontWeight: 600 }}>
                      Room {billData.roomNumber} ({billData.towerName})
                    </p>
                  </div>
                  <div
                    style={{
                      background: billData.status === "PAID" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                      border: `1px solid ${billData.status === "PAID" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                      color: billData.status === "PAID" ? "#10b981" : "#f59e0b",
                      borderRadius: "100px",
                      padding: "4px 12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {billData.monthName} {billData.year}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    marginTop: "12px",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)" }}>Total Invoice</p>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0" }}>₹{billData.totalAmount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)" }}>Balance Due</p>
                    <p style={{ fontSize: "16px", fontWeight: 800, color: "#14b8a6" }}>₹{billData.balance}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Payment Methods Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(13, 184, 166, 0.25)",
                borderRadius: "24px",
                padding: "24px",
                marginBottom: "24px",
                backdropFilter: "blur(20px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      background: "rgba(13,184,166,0.15)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CreditCard size={20} color="#14b8a6" />
                  </div>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>UPI Payment Details</p>
                    <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)" }}>Pay to landlord directly</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQR(!showQR)}
                  style={{
                    background: "rgba(13,184,166,0.12)",
                    border: "1px solid rgba(13,184,166,0.3)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    color: "#14b8a6",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <QrCode size={14} />
                  {showQR ? "Hide QR" : "Show QR Code"}
                </button>
              </div>

              {/* UPI ID Row */}
              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>UPI ID</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#FFE259", fontFamily: "monospace" }}>{upiId}</p>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", marginTop: "2px" }}>{upiName}</p>
                </div>

                <button
                  onClick={copyUPI}
                  style={{
                    background: "linear-gradient(135deg, rgba(255,226,89,0.15) 0%, rgba(255,167,81,0.15) 100%)",
                    border: "1px solid rgba(255,226,89,0.3)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    color: "#FFE259",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Copy size={14} />
                  Copy ID
                </button>
              </div>

              {/* QR Code Popup */}
              {showQR && (
                <div style={{ marginTop: "16px", textAlign: "center", background: "#ffffff", borderRadius: "16px", padding: "16px" }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${form.amount || "0"}&cu=INR`}
                    alt="UPI QR Code"
                    style={{ width: "200px", height: "200px", display: "block", margin: "0 auto" }}
                  />
                  <p style={{ fontSize: "12px", color: "#0f172a", fontWeight: 700, marginTop: "8px" }}>Scan to pay ₹{form.amount || "0"}</p>
                </div>
              )}
            </div>

            {/* Payment Upload Form */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(13, 184, 166, 0.25)",
                borderRadius: "24px",
                padding: "28px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "20px" }}>
                Upload Payment Screenshot
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.7)", marginBottom: "6px" }}>
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="Enter amount paid"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(13,184,166,0.3)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.7)", marginBottom: "6px" }}>
                    Payment Method
                  </label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(5,20,18,0.9)",
                      border: "1px solid rgba(13,184,166,0.3)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.7)", marginBottom: "6px" }}>
                    Transaction ID / UTR Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.transactionId}
                    onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                    placeholder="e.g. 421098765432"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Screenshot Uploader */}
                <div>
                  <ImageUpload
                    value={form.screenshotUrl}
                    onChange={(url) => setForm({ ...form, screenshotUrl: url })}
                    label="Payment Receipt / Screenshot *"
                    placeholder="Upload payment receipt image"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.7)", marginBottom: "6px" }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any notes for landlord..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "13px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                    border: "1px solid rgba(13,184,166,0.4)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 20px rgba(13,184,166,0.25)",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting Payment...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Submit Payment for Verification
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayRentPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#040d0c", display: "flex", alignItems: "center", justifyContent: "center", color: "#14b8a6" }}>Loading payment portal...</div>}>
      <PayRentFormInner />
    </Suspense>
  );
}
