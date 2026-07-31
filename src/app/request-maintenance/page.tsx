"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Clock,
  ShieldCheck,
  Building,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Building2,
  Sliders,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface RoomOption {
  roomId: string;
  roomNumber: string;
  towerName: string;
  tenantId: string | null;
  tenantName: string;
  tenantPhone: string;
}

const CATEGORIES = [
  { id: "PLUMBING", label: "Plumbing", icon: "🚰", desc: "Leaking tap, flush, pipe, shower" },
  { id: "ELECTRICIAN", label: "Electrical", icon: "⚡", desc: "Fan, light, switchboard, socket" },
  { id: "CARPENTER", label: "Carpentry", icon: "🪵", desc: "Door lock, cabinet, bed, window" },
  { id: "CLEANING", label: "Cleaning & Pest", icon: "🧹", desc: "Room cleaning, waste, pest control" },
  { id: "SECURITY", label: "Security & Lock", icon: "🔒", desc: "Main gate, key, door safety" },
  { id: "OTHER", label: "Other Repair", icon: "🔧", desc: "General repair or custom query" },
];

const PRIORITIES = [
  { id: "NORMAL", label: "Normal", badge: "🟢 Standard", desc: "Routine maintenance query", color: "#34d399", bg: "rgba(52, 211, 153, 0.15)", border: "rgba(52, 211, 153, 0.4)" },
  { id: "HIGH", label: "High Priority", badge: "🟡 Important", desc: "Repair needed soon", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.4)" },
  { id: "CRITICAL", label: "Critical Emergency", badge: "🚨 Urgent", desc: "Water burst, power outage, main lock issue", color: "#f87171", bg: "rgba(248, 113, 113, 0.2)", border: "rgba(248, 113, 113, 0.5)" },
];

function MaintenanceRequestForm() {
  const searchParams = useSearchParams();
  const initialRoomQuery = searchParams.get("room") || searchParams.get("roomId") || "";
  const initialTowerQuery = searchParams.get("tower") || "";

  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Step state
  const [selectedTower, setSelectedTower] = useState<string>("Tower A");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("PLUMBING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      setLoadingRooms(true);
      const res = await fetch("/api/public/rooms");
      if (res.ok) {
        const data: RoomOption[] = await res.json();
        setAllRooms(data);

        // Auto-match room from URL search param if present
        if (initialRoomQuery) {
          const match = data.find(
            (r) =>
              r.roomNumber.toLowerCase() === initialRoomQuery.toLowerCase() ||
              r.roomId === initialRoomQuery
          );
          if (match) {
            setSelectedTower(match.towerName || "ALL");
            setSelectedRoomId(match.roomId);
          }
        } else if (initialTowerQuery) {
          setSelectedTower(initialTowerQuery.toUpperCase().includes("A") ? "Tower A" : "Tower B");
        }
      }
    } catch (e) {
      console.error("Failed to load room directory:", e);
    } finally {
      setLoadingRooms(false);
    }
  }

  // Filter available towers and rooms sequentially
  const towers = Array.from(new Set(allRooms.map((r) => r.towerName))).filter(Boolean);

  const filteredRooms = allRooms
    .filter((r) => selectedTower === "ALL" || r.towerName.toLowerCase().includes(selectedTower.toLowerCase()))
    .sort((a, b) => (parseInt(a.roomNumber, 10) || 0) - (parseInt(b.roomNumber, 10) || 0));

  // Selected Room & Tenant Details
  const selectedRoom = allRooms.find((r) => r.roomId === selectedRoomId || r.roomNumber === selectedRoomId);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo size must be under 10MB");
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPhotoUrl(data.url);
        toast.success("Photo attached successfully!");
      } else {
        toast.error(data.error || "Failed to upload photo");
      }
    } catch {
      toast.error("Upload error. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId || !selectedRoom) {
      toast.error("Please select your room number");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a short description of the issue");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.roomId,
          tenantId: selectedRoom.tenantId,
          category: selectedCategory,
          title: title.trim(),
          description: description.trim() || title.trim(),
          photoUrl,
          priority,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit request");
      } else {
        setSubmitted(true);
        setTicketId(data.requestId ? data.requestId.slice(-6).toUpperCase() : "REQ-101");
        toast.success("Maintenance query logged! Confirmation sent to your WhatsApp.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% -10%, #0f2b28 0%, #070d19 60%, #030712 100%)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        padding: "24px 16px 80px 16px",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <Toaster position="top-center" />

      {/* Decorative Floating Sea-Green Glass Glow Orbs */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(6, 182, 212, 0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "100px",
          right: "-100px",
          width: "250px",
          height: "250px",
          background: "radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* ─── ORIGINAL YELLOW LOGO HEADER ─── */}
        <div style={{ textAlign: "center", marginBottom: "32px", paddingTop: "12px" }}>
          {/* Original Golden Yellow Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(255, 215, 0, 0.4)",
              borderRadius: "20px",
              padding: "10px 22px",
              boxShadow: "0 0 30px rgba(245, 158, 11, 0.25)",
              marginBottom: "16px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                background: "linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #D97706 100%)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.6), inset 0 2px 4px rgba(255,255,255,0.4)",
                border: "1px solid rgba(255, 215, 0, 0.7)",
                transform: "rotate(-4deg)",
              }}
            >
              <Building size={24} color="#1E1E1E" style={{ transform: "rotate(4deg)" }} />
            </div>

            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  fontFamily: "var(--font-display)",
                  lineHeight: 1.1,
                  background: "linear-gradient(135deg, #FFE259 0%, #FFA751 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                ATUL RESIDENCY
              </div>
              <div style={{ fontSize: "11px", color: "#2dd4bf", fontWeight: 600, letterSpacing: "0.5px" }}>
                ✨ A SYMBOL OF LUXURY LIVING
              </div>
            </div>
          </div>

          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#f8fafc",
              marginBottom: "6px",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            Maintenance & Service Desk 🛠️
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            Submit repair queries • Work completed in 24 hours max
          </p>
        </div>

        {/* ─── FORM / SUCCESS CONTAINER ─── */}
        {submitted ? (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(20, 184, 166, 0.5)",
              borderRadius: "28px",
              padding: "36px 24px",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
              animation: "fadeIn 0.4s ease-out",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(20, 184, 166, 0.15)",
                border: "2px solid #14b8a6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#2dd4bf",
                boxShadow: "0 0 30px rgba(20, 184, 166, 0.4)",
              }}
            >
              <CheckCircle2 size={46} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
              Request Logged Successfully! 🎉
            </h2>

            <div
              style={{
                display: "inline-block",
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(20, 184, 166, 0.3)",
                borderRadius: "12px",
                padding: "8px 18px",
                fontSize: "14px",
                color: "#cbd5e1",
                marginBottom: "20px",
              }}
            >
              Ticket Number: <strong style={{ color: "#2dd4bf" }}>#{ticketId}</strong>
            </div>

            {/* Promise Box */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)",
                border: "1px solid rgba(20, 184, 166, 0.6)",
                borderRadius: "18px",
                padding: "18px",
                marginBottom: "24px",
                boxShadow: "0 10px 25px rgba(20, 184, 166, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2dd4bf", fontWeight: 800, fontSize: "17px", marginBottom: "4px" }}>
                <Clock size={22} />
                Work Done in 24 Hours Max!
              </div>
              <p style={{ fontSize: "13.5px", color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>
                Our technician has been assigned to <strong>Room {selectedRoom?.roomNumber} ({selectedRoom?.towerName})</strong>. Updates will be sent to your WhatsApp.
              </p>
            </div>

            {/* Details Summary */}
            <div
              style={{
                background: "rgba(30, 41, 59, 0.6)",
                borderRadius: "16px",
                padding: "16px",
                textAlign: "left",
                fontSize: "13px",
                color: "#94a3b8",
                marginBottom: "28px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Resident Name:</span>
                <strong style={{ color: "#f8fafc" }}>{selectedRoom?.tenantName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Room & Tower:</span>
                <strong style={{ color: "#f8fafc" }}>Room {selectedRoom?.roomNumber} ({selectedRoom?.towerName})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Priority:</span>
                <strong style={{ color: priority === "CRITICAL" ? "#f87171" : priority === "HIGH" ? "#fbbf24" : "#34d399" }}>
                  {priority === "CRITICAL" ? "🚨 Critical Emergency" : priority === "HIGH" ? "🟡 High Priority" : "🟢 Normal"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>WhatsApp Receipt:</span>
                <strong style={{ color: "#2dd4bf" }}>{selectedRoom?.tenantPhone}</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setTitle("");
                setDescription("");
                setPhotoUrl(null);
              }}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(20, 184, 166, 0.4)",
              }}
            >
              Raise Another Query 🔧
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(20, 184, 166, 0.35)",
              borderRadius: "28px",
              padding: "26px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(20, 184, 166, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {/* 1. STEP 1: Tower Selection (Two Dedicated Cards) */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", fontWeight: 700, color: "#2dd4bf", marginBottom: "10px" }}>
                <Building2 size={16} /> 1. Select Tower *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {[
                  { name: "Tower A", count: allRooms.filter((r) => r.towerName.toLowerCase().includes("a")).length, icon: "🏢" },
                  { name: "Tower B", count: allRooms.filter((r) => r.towerName.toLowerCase().includes("b")).length, icon: "🏢" },
                ].map((t) => {
                  const isSel = selectedTower.toLowerCase().includes(t.name.slice(-1).toLowerCase());
                  return (
                    <div
                      key={t.name}
                      onClick={() => {
                        setSelectedTower(t.name);
                        setSelectedRoomId(""); // Reset room selection on tower change
                      }}
                      style={{
                        padding: "16px 14px",
                        borderRadius: "18px",
                        background: isSel
                          ? "linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(6, 182, 212, 0.25) 100%)"
                          : "rgba(30, 41, 59, 0.6)",
                        border: isSel ? "1.5px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: "pointer",
                        textAlign: "center",
                        boxShadow: isSel ? "0 0 20px rgba(20, 184, 166, 0.3)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "4px" }}>{t.icon}</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: isSel ? "#2dd4bf" : "#f8fafc" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: "12px", color: isSel ? "#99f6e4" : "#94a3b8", marginTop: "2px" }}>
                        {t.count} Occupied Rooms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. STEP 2: Sequential Room Selection */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#2dd4bf", marginBottom: "8px" }}>
                2. Select Room (Sequential List) *
              </label>
              {loadingRooms ? (
                <div style={{ padding: "14px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "14px", color: "#94a3b8", fontSize: "13px" }}>
                  Loading occupied room directory...
                </div>
              ) : (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(30, 41, 59, 0.95)",
                    border: selectedRoomId ? "1.5px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "15px",
                    fontWeight: 700,
                    outline: "none",
                    boxShadow: selectedRoomId ? "0 0 15px rgba(20, 184, 166, 0.2)" : "none",
                  }}
                >
                  <option value="">-- Choose Room Number ({filteredRooms.length} Occupied Rooms) --</option>
                  {filteredRooms.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Room {r.roomNumber} ({r.towerName}) — {r.tenantName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Auto Detected Resident Card */}
            {selectedRoom && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)",
                  border: "1px solid rgba(20, 184, 166, 0.4)",
                  borderRadius: "16px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 8px 20px rgba(20, 184, 166, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <ShieldCheck size={24} style={{ color: "#2dd4bf" }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>
                      Verified Resident: {selectedRoom.tenantName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Room {selectedRoom.roomNumber} ({selectedRoom.towerName}) • WhatsApp: {selectedRoom.tenantPhone}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    background: "#14b8a6",
                    color: "#0f172a",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "12px",
                  }}
                >
                  Auto-Detected
                </span>
              </div>
            )}

            {/* 3. Category Grid */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#2dd4bf", marginBottom: "10px" }}>
                3. Select Repair Category *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "16px",
                        background: isSelected
                          ? "linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)"
                          : "rgba(30, 41, 59, 0.6)",
                        border: isSelected ? "1.5px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? "0 0 15px rgba(20, 184, 166, 0.2)" : "none",
                      }}
                    >
                      <div style={{ fontSize: "22px", marginBottom: "4px" }}>{cat.icon}</div>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: isSelected ? "#2dd4bf" : "#f8fafc" }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {cat.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Priority Selector (Normal, High, Critical / Urgent) */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", fontWeight: 700, color: "#2dd4bf", marginBottom: "10px" }}>
                <Sliders size={16} /> 4. Priority Level *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {PRIORITIES.map((p) => {
                  const isSel = priority === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPriority(p.id as any)}
                      style={{
                        padding: "12px 10px",
                        borderRadius: "14px",
                        background: isSel ? p.bg : "rgba(30, 41, 59, 0.6)",
                        border: isSel ? `1.5px solid ${p.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                        boxShadow: isSel ? `0 0 15px ${p.color}40` : "none",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 800, color: p.color, marginBottom: "2px" }}>
                        {p.badge}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {p.desc.split(",")[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Issue Title */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "8px" }}>
                5. What is the issue? (Short Title) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tap leaking in bathroom / Fan not spinning"
                required
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(30, 41, 59, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* 6. Notes & Photo */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "8px" }}>
                6. Additional Notes / Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Preferred time for technician visit, specific instructions..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(30, 41, 59, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* 7. Attach Photo */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "8px" }}>
                7. Attach Issue Photo (Optional)
              </label>
              {photoUrl ? (
                <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "14px", overflow: "hidden", border: "1px solid #14b8a6" }}>
                  <img src={photoUrl} alt="Attached issue" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(239, 68, 68, 0.9)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "18px",
                    borderRadius: "14px",
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "2px dashed rgba(20, 184, 166, 0.3)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <UploadCloud size={26} style={{ color: "#2dd4bf", marginBottom: "4px" }} />
                  <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 600 }}>
                    {uploadingPhoto ? "Uploading Photo..." : "Click to Upload Photo"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>JPG, PNG up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Promise Banner */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(20, 184, 166, 0.12)", padding: "14px 16px", borderRadius: "16px", border: "1px solid rgba(20, 184, 166, 0.3)" }}>
              <Clock size={20} style={{ color: "#2dd4bf", flexShrink: 0 }} />
              <div style={{ fontSize: "12.5px", color: "#2dd4bf", fontWeight: 700 }}>
                Resolution Commitment: Work done in 24 hours max. Confirmation receipt sent via WhatsApp.
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                color: "#0f172a",
                fontWeight: 900,
                fontSize: "16px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 10px 30px rgba(20, 184, 166, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {submitting ? (
                "Logging Request..."
              ) : (
                <>
                  Submit Repair Request <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "32px", color: "#64748b", fontSize: "12px" }}>
          © {new Date().getFullYear()} Atul Residency Maintenance Portal • Powered by WhatsApp Management
        </div>
      </div>
    </div>
  );
}

export default function RequestMaintenancePage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>}>
      <MaintenanceRequestForm />
    </Suspense>
  );
}
