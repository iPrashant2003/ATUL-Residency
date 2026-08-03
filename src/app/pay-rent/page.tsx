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
  Zap,
  Home,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

function PayRentFormInner() {
  const searchParams = useSearchParams();
  const rentRecordIdParam = searchParams.get("rentRecordId") || searchParams.get("id");

  const [bills, setBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [selectedTower, setSelectedTower] = useState<string>("Tower A");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedBill, setSelectedBill] = useState<any>(null);

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

  // Load public active bills list on mount
  useEffect(() => {
    setLoadingBills(true);
    fetch("/api/public/bills")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBills(data);

          // If rentRecordIdParam is passed in URL, auto-select that tenant/bill
          if (rentRecordIdParam) {
            const found = data.find((b) => b.rentRecordId === rentRecordIdParam);
            if (found) {
              if (found.towerName) setSelectedTower(found.towerName);
              setSelectedTenantId(found.tenantId);
              setSelectedBill(found);
              setForm((prev) => ({
                ...prev,
                amount: found.balance > 0 ? found.balance.toString() : found.totalAmount.toString(),
              }));
            }
          }
        }
      })
      .catch((err) => console.error("Error loading public bills:", err))
      .finally(() => setLoadingBills(false));
  }, [rentRecordIdParam]);

  // Handle Tower card selection
  function handleTowerSelect(tower: string) {
    setSelectedTower(tower);
    setSelectedTenantId("");
    setSelectedBill(null);
    setForm((prev) => ({ ...prev, amount: "" }));
  }

  // Handle Tenant selection change
  function handleTenantChange(tid: string) {
    setSelectedTenantId(tid);
    if (!tid) {
      setSelectedBill(null);
      setForm((prev) => ({ ...prev, amount: "" }));
      return;
    }

    const b = bills.find((item) => item.tenantId === tid);
    if (b) {
      setSelectedBill(b);
      const totalDue = b.balance > 0 ? b.balance : b.totalAmount;
      setForm((prev) => ({
        ...prev,
        amount: totalDue.toString(),
      }));
    }
  }

  // Filter bills by selected tower and sort sequentially by room number
  const towerBills = bills
    .filter((b) => (selectedTower === "Tower A" ? b.towerName === "Tower A" : b.towerName === "Tower B"))
    .sort((a, b) => {
      const numA = parseInt(a.roomNumber.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.roomNumber.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });

  const towerACount = bills.filter((b) => b.towerName === "Tower A").length;
  const towerBCount = bills.filter((b) => b.towerName === "Tower B").length;

  function copyUPI() {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied to clipboard!");
  }

  // Generate deep UPI App URL
  function getDeepUpiUrl(appScheme: "gpay" | "phonepe" | "paytm" | "generic") {
    const amt = form.amount ? parseFloat(form.amount) : 0;
    const note = encodeURIComponent(`Rent Payment - Atul Residency ${selectedBill ? selectedBill.roomNumber : ""}`);
    const base = `pa=${upiId}&pn=${encodeURIComponent(upiName)}&cu=INR&tn=${note}`;
    const amtParam = amt > 0 ? `&am=${amt}` : "";

    if (appScheme === "gpay") return `gpay://upi/pay?${base}${amtParam}`;
    if (appScheme === "phonepe") return `phonepe://pay?${base}${amtParam}`;
    if (appScheme === "paytm") return `paytmmp://pay?${base}${amtParam}`;
    return `upi://pay?${base}${amtParam}`;
  }

  function handleAppPay(appScheme: "gpay" | "phonepe" | "paytm" | "generic", appName: string) {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please select a tenant/room or enter amount first");
      return;
    }

    const url = getDeepUpiUrl(appScheme);
    toast.info(`Opening ${appName}... Complete payment & upload screenshot below! 📲`);
    window.location.href = url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTenantId && !selectedBill) {
      toast.error("Please select your Room or Tenant Name");
      return;
    }

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
        rentRecordId: selectedBill?.rentRecordId || rentRecordIdParam || null,
        tenantId: selectedBill?.tenantId || selectedTenantId || null,
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

      {/* Ambient Glow Orbs */}
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

      <div style={{ maxWidth: "600px", margin: "0 auto", position: "relative" }}>
        {/* Logo Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
            ✦ Quick Rent & Utility Payment Desk ✦
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
                marginBottom: "20px",
              }}
            >
              Your payment of <strong style={{ color: "#14b8a6" }}>₹{form.amount}</strong> for{" "}
              <strong style={{ color: "#FFE259" }}>{selectedBill?.tenantName || "your room"}</strong> has been submitted to Admin for verification and will reflect immediately in the payment tracer.
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
              <span>Admin Verification: Instant / 15 mins</span>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedTenantId("");
                setSelectedBill(null);
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
            {/* Step 1: Tower Selection Header Cards */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                🏢 Select Building Tower
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Tower A Card */}
                <div
                  onClick={() => handleTowerSelect("Tower A")}
                  style={{
                    background: selectedTower === "Tower A"
                      ? "linear-gradient(135deg, rgba(20,184,166,0.22) 0%, rgba(20,184,166,0.08) 100%)"
                      : "rgba(255,255,255,0.03)",
                    border: selectedTower === "Tower A"
                      ? "2px solid #14b8a6"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "18px",
                    padding: "18px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                    boxShadow: selectedTower === "Tower A" ? "0 0 24px rgba(20,184,166,0.25)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ width: "36px", height: "36px", background: selectedTower === "Tower A" ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.05)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building size={20} color={selectedTower === "Tower A" ? "#14b8a6" : "rgba(226,232,240,0.6)"} />
                    </div>
                    {selectedTower === "Tower A" && <CheckCircle2 size={18} color="#14b8a6" />}
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: selectedTower === "Tower A" ? "#14b8a6" : "#e2e8f0" }}>
                    Tower A
                  </h3>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", marginTop: "2px" }}>
                    {towerACount} Active Rooms
                  </p>
                </div>

                {/* Tower B Card */}
                <div
                  onClick={() => handleTowerSelect("Tower B")}
                  style={{
                    background: selectedTower === "Tower B"
                      ? "linear-gradient(135deg, rgba(255,226,89,0.22) 0%, rgba(255,167,81,0.08) 100%)"
                      : "rgba(255,255,255,0.03)",
                    border: selectedTower === "Tower B"
                      ? "2px solid #FFE259"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "18px",
                    padding: "18px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                    boxShadow: selectedTower === "Tower B" ? "0 0 24px rgba(255,226,89,0.25)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ width: "36px", height: "36px", background: selectedTower === "Tower B" ? "rgba(255,226,89,0.2)" : "rgba(255,255,255,0.05)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building size={20} color={selectedTower === "Tower B" ? "#FFE259" : "rgba(226,232,240,0.6)"} />
                    </div>
                    {selectedTower === "Tower B" && <CheckCircle2 size={18} color="#FFE259" />}
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: selectedTower === "Tower B" ? "#FFE259" : "#e2e8f0" }}>
                    Tower B
                  </h3>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", marginTop: "2px" }}>
                    {towerBCount} Active Rooms
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Room Sequence Dropdown for Selected Tower */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(13, 184, 166, 0.25)",
                borderRadius: "24px",
                padding: "24px",
                marginBottom: "20px",
                backdropFilter: "blur(20px)",
              }}
            >
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#14b8a6", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🚪 Select Room ({selectedTower} Sequential Order) *
              </label>

              {loadingBills ? (
                <div style={{ padding: "14px", background: "rgba(0,0,0,0.2)", borderRadius: "10px", color: "rgba(226,232,240,0.5)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 size={16} className="animate-spin" color="#14b8a6" />
                  Loading {selectedTower} room list...
                </div>
              ) : (
                <select
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: "rgba(5, 20, 18, 0.95)",
                    border: "1.5px solid rgba(13, 184, 166, 0.4)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">-- Choose room from {selectedTower} --</option>
                  {towerBills.map((b) => (
                    <option key={b.tenantId} value={b.tenantId}>
                      Room {b.roomNumber} — {b.tenantName} — Due: ₹{b.balance > 0 ? b.balance : b.totalAmount}
                    </option>
                  ))}
                </select>
              )}

              {/* Auto-Calculated Breakdown Card */}
              {selectedBill && (
                <div
                  style={{
                    marginTop: "20px",
                    background: "linear-gradient(135deg, rgba(13,184,166,0.12) 0%, rgba(13,184,166,0.03) 100%)",
                    border: "1px solid rgba(13,184,166,0.35)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid rgba(13,184,166,0.2)", paddingBottom: "10px" }}>
                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                        {selectedBill.tenantName}
                      </h4>
                      <p style={{ fontSize: "12px", color: "rgba(13,184,166,0.9)", fontWeight: 600 }}>
                        Room {selectedBill.roomNumber} ({selectedBill.towerName})
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", background: "rgba(255,226,89,0.15)", border: "1px solid rgba(255,226,89,0.3)", color: "#FFE259", borderRadius: "100px", padding: "4px 10px", fontWeight: 700 }}>
                        {selectedBill.monthName} {selectedBill.year}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Calculated Rent + Electricity Itemized Lines */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.85)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Home size={14} color="#14b8a6" /> Monthly Rent:
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{selectedBill.rentAmount}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.85)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={14} color="#FFE259" /> Electricity Bill:
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{selectedBill.electricityBill}
                        {selectedBill.meterReading && (
                          <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.45)", marginLeft: "6px" }}>
                            ({selectedBill.meterReading} units)
                          </span>
                        )}
                      </span>
                    </div>

                    {selectedBill.maintenanceCharge > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.85)" }}>
                        <span>🔧 Maintenance Charge:</span>
                        <span style={{ fontWeight: 600 }}>₹{selectedBill.maintenanceCharge}</span>
                      </div>
                    )}

                    {selectedBill.lateFee > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                        <span>⏳ Late Fee Penalty:</span>
                        <span style={{ fontWeight: 600 }}>₹{selectedBill.lateFee}</span>
                      </div>
                    )}

                    {selectedBill.discount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                        <span>🎁 Discount:</span>
                        <span style={{ fontWeight: 600 }}>-₹{selectedBill.discount}</span>
                      </div>
                    )}
                  </div>

                  {/* Auto Total Highlight */}
                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(13,184,166,0.3)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0" }}>
                      💰 Auto Total (Rent + Electricity):
                    </span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "#14b8a6" }}>
                      ₹{selectedBill.balance > 0 ? selectedBill.balance : selectedBill.totalAmount}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Direct App Payment Buttons (GPay / PhonePe / Paytm) */}
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
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>Pay Directly via App</p>
                    <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)" }}>One-tap auto pre-filled amount</p>
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

              {/* Direct UPI App Launch Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <button
                  onClick={() => handleAppPay("gpay", "Google Pay")}
                  style={{
                    background: "linear-gradient(135deg, rgba(66,133,244,0.2) 0%, rgba(52,168,83,0.15) 100%)",
                    border: "1px solid rgba(66,133,244,0.35)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  💳 Google Pay
                </button>

                <button
                  onClick={() => handleAppPay("phonepe", "PhonePe")}
                  style={{
                    background: "linear-gradient(135deg, rgba(95,37,159,0.2) 0%, rgba(95,37,159,0.1) 100%)",
                    border: "1px solid rgba(95,37,159,0.4)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  📲 PhonePe
                </button>

                <button
                  onClick={() => handleAppPay("paytm", "Paytm")}
                  style={{
                    background: "linear-gradient(135deg, rgba(0,185,245,0.2) 0%, rgba(0,46,134,0.15) 100%)",
                    border: "1px solid rgba(0,185,245,0.35)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  🔷 Paytm
                </button>

                <button
                  onClick={() => handleAppPay("generic", "UPI App")}
                  style={{
                    background: "linear-gradient(135deg, rgba(255,226,89,0.15) 0%, rgba(255,167,81,0.15) 100%)",
                    border: "1px solid rgba(255,226,89,0.3)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    color: "#FFE259",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  ✨ Any UPI App
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
                    background: "rgba(255,226,89,0.12)",
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

            {/* Step 4: Payment Proof Upload Form */}
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
                Upload Payment Screenshot for Instant Verification
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
                    placeholder="Auto-filled rent + electricity"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(13,184,166,0.4)",
                      borderRadius: "10px",
                      color: "#14b8a6",
                      fontSize: "16px",
                      fontWeight: 800,
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
