"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldCheck,
  Building2,
  ChevronRight,
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
  { id: "ELECTRICIAN", label: "Electrical", icon: "⚡", desc: "Fan, light, switchboard, power socket" },
  { id: "CARPENTER", label: "Carpentry", icon: "🪵", desc: "Door lock, cabinet, bed, window, table" },
  { id: "CLEANING", label: "Cleaning & Pest", icon: "🧹", desc: "Room cleaning, waste, pest control" },
  { id: "SECURITY", label: "Security & Lock", icon: "🔒", desc: "Main gate, key replacement, safety" },
  { id: "OTHER", label: "Other Query", icon: "🔧", desc: "General repair or custom maintenance" },
];

function MaintenanceRequestForm() {
  const searchParams = useSearchParams();
  const initialRoomQuery = searchParams.get("room") || searchParams.get("roomId") || "";

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("PLUMBING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Auto-detected tenant info
  const selectedRoom = rooms.find((r) => r.roomId === selectedRoomId || r.roomNumber === selectedRoomId);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      setLoadingRooms(true);
      const res = await fetch("/api/public/rooms");
      if (res.ok) {
        const data: RoomOption[] = await res.json();
        setRooms(data);

        // Match initial room from URL search parameter
        if (initialRoomQuery) {
          const match = data.find(
            (r) =>
              r.roomNumber.toLowerCase() === initialRoomQuery.toLowerCase() ||
              r.roomId === initialRoomQuery
          );
          if (match) {
            setSelectedRoomId(match.roomId);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load room directory:", e);
    } finally {
      setLoadingRooms(false);
    }
  }

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
      toast.error("Please describe your maintenance issue");
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
        toast.success("Maintenance request submitted! Check WhatsApp for confirmation.");
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
        background: "radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 60%, #090d16 100%)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        padding: "24px 16px 60px 16px",
      }}
    >
      <Toaster position="top-center" />

      {/* Header Container */}
      <div style={{ maxWidth: "540px", margin: "0 auto" }}>
        {/* Brand Bar */}
        <div style={{ textAlign: "center", marginBottom: "32px", paddingTop: "12px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(20, 184, 166, 0.3)",
              borderRadius: "9999px",
              padding: "8px 20px",
              boxShadow: "0 0 25px rgba(20, 184, 166, 0.15)",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              A
            </div>
            <span style={{ fontWeight: 700, letterSpacing: "1px", fontSize: "15px", color: "#f8fafc" }}>
              ATUL RESIDENCY
            </span>
            <span
              style={{
                fontSize: "11px",
                background: "rgba(20, 184, 166, 0.2)",
                color: "#2dd4bf",
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: "600",
              }}
            >
              24h Service
            </span>
          </div>

          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            Maintenance Desk 🛠️
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            Quick repair request form for Atul Residency residents
          </p>
        </div>

        {/* Form / Success Card */}
        {submitted ? (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(20, 184, 166, 0.4)",
              borderRadius: "24px",
              padding: "36px 24px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
              animation: "fadeIn 0.4s ease-out",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(20, 184, 166, 0.15)",
                border: "2px solid #14b8a6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                color: "#2dd4bf",
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
              Query Logged Successfully! 🎉
            </h2>

            <div
              style={{
                display: "inline-block",
                background: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "8px 16px",
                fontSize: "13px",
                color: "#94a3b8",
                marginBottom: "20px",
              }}
            >
              Ticket Number: <strong style={{ color: "#2dd4bf" }}>#{ticketId}</strong>
            </div>

            {/* Promise Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
                border: "1px solid rgba(20, 184, 166, 0.5)",
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2dd4bf", fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
                <Clock size={20} />
                Work Done in 24 Hours Max!
              </div>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
                Our maintenance technician has been assigned to <strong>Room {selectedRoom?.roomNumber}</strong>. You will receive progress updates on WhatsApp.
              </p>
            </div>

            {/* Auto Detected Tenant summary */}
            <div
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                borderRadius: "14px",
                padding: "14px",
                textAlign: "left",
                fontSize: "13px",
                color: "#94a3b8",
                marginBottom: "28px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Resident Name:</span>
                <strong style={{ color: "#f8fafc" }}>{selectedRoom?.tenantName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Room Number:</span>
                <strong style={{ color: "#f8fafc" }}>Room {selectedRoom?.roomNumber} ({selectedRoom?.towerName})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Confirmation Sent To:</span>
                <strong style={{ color: "#2dd4bf" }}>{selectedRoom?.tenantPhone} (WhatsApp)</strong>
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
                padding: "14px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "15px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 10px 25px rgba(20, 184, 166, 0.3)",
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
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* 1. Room Selection */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
                1. Select Room Number *
              </label>
              {loadingRooms ? (
                <div style={{ padding: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "12px", color: "#94a3b8", fontSize: "13px" }}>
                  Loading occupied rooms directory...
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
                    background: "rgba(30, 41, 59, 0.9)",
                    border: selectedRoomId ? "1px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "15px",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="">-- Choose Room Number --</option>
                  {rooms.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Room {r.roomNumber} ({r.towerName}) — {r.tenantName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Auto Detected Resident Badge */}
            {selectedRoom && (
              <div
                style={{
                  background: "rgba(20, 184, 166, 0.1)",
                  border: "1px solid rgba(20, 184, 166, 0.3)",
                  borderRadius: "14px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={20} style={{ color: "#2dd4bf" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                      Verified Resident: {selectedRoom.tenantName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Room {selectedRoom.roomNumber} ({selectedRoom.towerName}) • WhatsApp: {selectedRoom.tenantPhone}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "11px", background: "#14b8a6", color: "#0f172a", fontWeight: 700, padding: "3px 8px", borderRadius: "10px" }}>
                  Auto-Detected
                </span>
              </div>
            )}

            {/* 3. Issue Category Grid */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "10px" }}>
                2. Select Issue Category *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "14px",
                        background: isSelected ? "rgba(20, 184, 166, 0.2)" : "rgba(30, 41, 59, 0.6)",
                        border: isSelected ? "1px solid #14b8a6" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{cat.icon}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? "#2dd4bf" : "#f8fafc" }}>
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

            {/* 4. Issue Title */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
                3. What is the issue? (Short Title) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tap leaking in bathroom / Fan not working"
                required
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(30, 41, 59, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* 5. Additional Notes */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
                4. Additional Notes / Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any specific details (e.g. preferred time for technician to visit)..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(30, 41, 59, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* 6. Attach Photo */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
                5. Attach Photo (Optional)
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
                    padding: "20px",
                    borderRadius: "14px",
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "2px dashed rgba(255, 255, 255, 0.15)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <UploadCloud size={28} style={{ color: "#94a3b8", marginBottom: "6px" }} />
                  <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 600 }}>
                    {uploadingPhoto ? "Uploading Photo..." : "Click to Upload Issue Photo"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>JPG, PNG up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* 7. Priority Switch */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(30, 41, 59, 0.5)", padding: "12px 16px", borderRadius: "14px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Urgent Priority Request</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Mark if immediate emergency (water burst, main power failure)</div>
              </div>
              <button
                type="button"
                onClick={() => setPriority(priority === "NORMAL" ? "URGENT" : "NORMAL")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  background: priority === "URGENT" ? "#f43f5e" : "rgba(255,255,255,0.1)",
                  color: priority === "URGENT" ? "#ffffff" : "#94a3b8",
                }}
              >
                {priority === "URGENT" ? "🚨 URGENT" : "Normal"}
              </button>
            </div>

            {/* Promise Banner */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(20, 184, 166, 0.1)", padding: "12px 16px", borderRadius: "14px", border: "1px solid rgba(20, 184, 166, 0.2)" }}>
              <Clock size={18} style={{ color: "#2dd4bf", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", color: "#2dd4bf", fontWeight: 600 }}>
                Guaranteed Resolution: Work will be done in 24 hours max. Confirmation sent via WhatsApp.
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
                fontWeight: 800,
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
                  Submit Request Now <ChevronRight size={18} />
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
