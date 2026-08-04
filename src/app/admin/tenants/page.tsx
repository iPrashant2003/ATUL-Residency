"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  Users, Plus, X, Loader2, Search, Phone, MessageCircle, Send,
  Building2, Home, Calendar, Shield, Trash2, ChevronRight,
  IndianRupee, CreditCard, FileText, UserCheck,
  AlertTriangle, Eye, Mail, Hash, Camera, Key, Copy, CheckCircle, Zap,
  Archive, RotateCcw, Clock, History, FileCheck, Edit, Save,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, getRentStatusColor, formatDate } from "@/lib/utils";
import ImageUpload from "@/components/ui/ImageUpload";
import ManualPaymentModal from "@/components/admin/ManualPaymentModal";
import RenterHistoryModal from "@/components/admin/RenterHistoryModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tower {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  category: string;
  baseRent: number;
  tower: Tower;
}

interface RentRecord {
  id: string;
  month: number;
  year: number;
  electricityBill?: number;
  totalAmount: number;
  amountPaid: number;
  status: string;
  dueDate?: string;
  meterPhotoUrl?: string | null;
}

interface Renter {
  id: string;
  name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  alternatePhone?: string;
  aadhaarNumber?: string;
  photoUrl?: string;
  aadhaarImageUrl?: string;
  rentAmount: number;
  securityDeposit?: number;
  joiningDate: string;
  isActive: boolean;
  room?: Room;
  rentRecords?: RentRecord[];
  latestRent?: RentRecord | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Add Renter Modal ─────────────────────────────────────────────────────────

function AddRenterModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [vacantRooms, setVacantRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ loginId: string; password: string } | null>(null);
  const [copied, setCopied] = useState("");
  
  // Tower selection state for dynamic room filtering
  const [selectedTowerId, setSelectedTowerId] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    alternatePhone: "",
    roomId: "",
    rentAmount: "",
    securityDeposit: "",
    joiningDate: new Date().toISOString().split("T")[0],
    aadhaarNumber: "",
    photoUrl: "",
    aadhaarImageUrl: "",
  });

  useEffect(() => {
    fetch("/api/rooms?vacant=true")
      .then((r) => r.json())
      .then((d) => setVacantRooms(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load vacant rooms"));
  }, []);

  // Extract unique towers that have vacant rooms
  const towersWithVacantRooms = useMemo(() => {
    const map = new Map<string, string>();
    vacantRooms.forEach((r) => {
      if (r.tower) {
        map.set(r.tower.id, r.tower.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [vacantRooms]);

  const selectedRoom = vacantRooms.find((r) => r.id === form.roomId);

  // Auto-fill rent from room base rent when room is selected
  useEffect(() => {
    if (selectedRoom && !form.rentAmount) {
      setForm((f) => ({ ...f, rentAmount: String(selectedRoom.baseRent) }));
    }
  }, [selectedRoom]);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.roomId) {
      toast.error("Name, phone and room are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rentAmount: Number(form.rentAmount),
          securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create renter");
      } else {
        setCredentials({ loginId: data.generatedLoginId, password: data.generatedPassword });
        onSave();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (credentials) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: "440px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ width: "60px", height: "60px", background: "rgba(20,184,166,0.12)", border: "2px solid rgba(20,184,166,0.35)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Key size={26} color="#14B8A6" />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0" }}>Renter Login Credentials</h2>
            <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)", marginTop: "6px" }}>Share these credentials with the renter. The password is shown <strong style={{ color: "#f87171" }}>only once</strong>.</p>
          </div>

          {/* Login ID */}
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14B8A6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>🔐 Login ID (Email)</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(20,184,166,0.3)", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "#e2e8f0", wordBreak: "break-all" }}>{credentials.loginId}</p>
              <button type="button" onClick={() => copyToClipboard(credentials.loginId, "loginId")} style={{ background: "transparent", border: "none", cursor: "pointer", color: copied === "loginId" ? "#4ade80" : "rgba(226,232,240,0.4)", flexShrink: 0 }}>
                {copied === "loginId" ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14B8A6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>🗝️ Password</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(20,184,166,0.3)", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ flex: 1, fontSize: "18px", fontWeight: 800, color: "#4ade80", letterSpacing: "2px" }}>{credentials.password}</p>
              <button type="button" onClick={() => copyToClipboard(credentials.password, "pwd")} style={{ background: "transparent", border: "none", cursor: "pointer", color: copied === "pwd" ? "#4ade80" : "rgba(226,232,240,0.4)", flexShrink: 0 }}>
                {copied === "pwd" ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", color: "#f87171", lineHeight: 1.6 }}>⚠️ This password is generated once and <strong>cannot be viewed again</strong>. Please note it or share it with the renter now. The renter can change it from their profile.</p>
          </div>

          <button className="btn-primary" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
            <CheckCircle size={16} />
            Done — Credentials Noted
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserCheck size={20} color="#a78bfa" />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Add New Renter</h2>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>Fill in all required details</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Section: Personal Info */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
              Personal Information
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="e.g. Ramesh Kumar" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="ramesh@email.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Phone *</label>
                  <input className="form-input" placeholder="9876543210" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">WhatsApp</label>
                  <input className="form-input" placeholder="9876543210" value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Alternate Phone</label>
                <input className="form-input" placeholder="Emergency contact" value={form.alternatePhone}
                  onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* Section: Room & Rent */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
              Room & Rent Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Dynamic room filter by selecting Tower first */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Select Tower *</label>
                  <select
                    className="form-input"
                    value={selectedTowerId}
                    onChange={(e) => {
                      setSelectedTowerId(e.target.value);
                      setForm((f) => ({ ...f, roomId: "" })); // reset room selection
                    }}
                    required
                  >
                    <option value="">-- Select Tower --</option>
                    {towersWithVacantRooms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Select Room *</label>
                  <select
                    className="form-input"
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    required
                    disabled={!selectedTowerId}
                  >
                    <option value="">-- Select Room --</option>
                    {vacantRooms
                      .filter((r) => r.tower.id === selectedTowerId)
                      .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} ({r.category} · {formatCurrency(r.baseRent)}/mo)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {selectedTowerId && vacantRooms.filter((r) => r.tower.id === selectedTowerId).length === 0 && (
                <p style={{ fontSize: "11px", color: "#f59e0b", marginTop: "2px" }}>
                  No vacant rooms available in this tower.
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Monthly Rent (₹) *</label>
                  <input type="number" className="form-input" placeholder="8000" value={form.rentAmount}
                    onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Security Deposit (₹)</label>
                  <input type="number" className="form-input" placeholder="16000" value={form.securityDeposit}
                    onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Joining Date *</label>
                <input type="date" className="form-input" value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} required />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* Section: Documents */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
              Documents & Identity
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label className="form-label">Aadhaar Number</label>
                <input className="form-input" placeholder="1234 5678 9012" maxLength={14} value={form.aadhaarNumber}
                  onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <ImageUpload
                  value={form.photoUrl}
                  onChange={(url) => setForm({ ...form, photoUrl: url })}
                  label="Profile Photo"
                  placeholder="Take selfie or upload"
                />
                <ImageUpload
                  value={form.aadhaarImageUrl}
                  onChange={(url) => setForm({ ...form, aadhaarImageUrl: url })}
                  label="Aadhaar Card Image"
                  placeholder="Take photo or upload Aadhaar"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              <UserCheck size={16} />
              Add Renter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Renter Modal ────────────────────────────────────────────────────────

function EditRenterModal({
  renter,
  onClose,
  onSave,
}: {
  renter: Renter;
  onClose: () => void;
  onSave: () => void;
}) {
  const [vacantRooms, setVacantRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: renter.name || "",
    email: renter.email || "",
    phone: renter.phone || "",
    whatsapp: renter.whatsapp || "",
    alternatePhone: renter.alternatePhone || "",
    roomId: renter.room?.id || "",
    rentAmount: String(renter.rentAmount || ""),
    securityDeposit: String(renter.securityDeposit || "0"),
    joiningDate: renter.joiningDate ? renter.joiningDate.split("T")[0] : new Date().toISOString().split("T")[0],
    aadhaarNumber: renter.aadhaarNumber || "",
    photoUrl: renter.photoUrl || "",
    aadhaarImageUrl: renter.aadhaarImageUrl || "",
  });

  useEffect(() => {
    fetch("/api/rooms?vacant=true")
      .then((r) => r.json())
      .then((d) => {
        let list: Room[] = Array.isArray(d) ? d : [];
        if (renter.room && !list.some((r) => r.id === renter.room?.id)) {
          list = [renter.room, ...list];
        }
        setVacantRooms(list);
      })
      .catch(() => toast.error("Failed to load rooms"));
  }, [renter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${renter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rentAmount: Number(form.rentAmount),
          securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update renter details");
      } else {
        toast.success("Renter details updated successfully! 🎉");
        onSave();
        onClose();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Edit size={20} color="#14b8a6" />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0" }}>Edit Renter Details</h2>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>Update information for <strong style={{ color: "#14b8a6" }}>{renter.name}</strong></p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(226,232,240,0.4)", cursor: "pointer", padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Personal Info */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>
              Personal Information
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Primary Phone *</label>
                  <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">WhatsApp Phone</label>
                  <input className="form-input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Alternate Phone</label>
                  <input className="form-input" value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* Room & Billing */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>
              Room & Billing Info
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {vacantRooms.length > 0 && (
                <div>
                  <label className="form-label">Assigned Room</label>
                  <select className="form-select" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                    {vacantRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} ({r.tower?.name}) — Rent: ₹{r.baseRent}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Monthly Rent (₹) *</label>
                  <input type="number" className="form-input" value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Security Deposit (₹)</label>
                  <input type="number" className="form-input" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Joining Date *</label>
                  <input type="date" className="form-input" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} required />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* Documents & Photos */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>
              Identity & Photos
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label className="form-label">Aadhaar Number</label>
                <input className="form-input" placeholder="1234 5678 9012" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <ImageUpload
                  value={form.photoUrl}
                  onChange={(url) => setForm({ ...form, photoUrl: url })}
                  label="Profile Photo"
                  placeholder="Upload photo"
                />
                <ImageUpload
                  value={form.aadhaarImageUrl}
                  onChange={(url) => setForm({ ...form, aadhaarImageUrl: url })}
                  label="Aadhaar Card Image"
                  placeholder="Upload Aadhaar"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Renter Detail Modal ──────────────────────────────────────────────────────

function RenterDetailModal({
  tenant: renter,
  onClose,
  onDeleted,
  onUploadPayment,
  onViewHistory,
  onEdit,
}: {
  tenant: Renter;
  onClose: () => void;
  onDeleted: () => void;
  onUploadPayment: () => void;
  onViewHistory: () => void;
  onEdit: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [resetCreds, setResetCreds] = useState<{ loginId: string; password: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [detail, setDetail] = useState<Renter>(renter);
  const [loadingDetail, setLoadingDetail] = useState(true);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  async function handleResetPassword() {
    if (!window.confirm(`Reset login credentials for ${renter.name}? A new password will be generated.`)) return;
    setResettingPwd(true);
    try {
      const res = await fetch(`/api/tenants/${renter.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset credentials");
      } else {
        setResetCreds({ loginId: data.loginId, password: data.newPassword });
        toast.success("Credentials reset successfully!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResettingPwd(false);
    }
  }

  useEffect(() => {
    fetch(`/api/tenants/${renter.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) setDetail(d);
        setLoadingDetail(false);
      })
      .catch(() => setLoadingDetail(false));
  }, [renter.id]);

  async function handleDelete() {
    const password = prompt(`Remove ${renter.name} from active renters?\n\nDon't worry — they will be moved to the "Archived Renters" section and can be recovered anytime.\n\nPlease enter your admin password to confirm:`);
    if (password === null) return;
    if (!password.trim()) {
      toast.error("Password is required to remove a renter");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/tenants/${renter.id}`, { 
        method: "DELETE",
        headers: { "x-admin-password": password }
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to delete renter");
      } else {
        toast.success("Renter archived! You can restore them from 'Archived Renters' section.");
        onDeleted();
        onClose();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  const wa = detail.whatsapp || detail.phone;
  const rentRecords = (detail.rentRecords || []).slice(0, 3);
  const isTowerA = detail.room?.tower?.name?.toLowerCase().includes("a");
  const avatarCol = isTowerA ? "#8b5cf6" : "#06b6d4";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", maxHeight: "92vh", overflowY: "auto", padding: 0 }}
      >
        {/* Hero banner */}
        <div style={{
          background: isTowerA
            ? "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0.1) 100%)"
            : "linear-gradient(135deg, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.1) 100%)",
          borderBottom: `1px solid ${isTowerA ? "rgba(139,92,246,0.2)" : "rgba(6,182,212,0.2)"}`,
          padding: "28px 24px 20px",
          position: "relative",
        }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", color: "rgba(226,232,240,0.6)", padding: "6px", display: "flex" }}
          >
            <X size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Avatar */}
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: detail.photoUrl ? "transparent" : avatarCol,
              border: `3px solid ${avatarCol}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0, boxShadow: `0 8px 32px ${avatarCol}40`,
            }}>
              {detail.photoUrl ? (
                <img src={detail.photoUrl} alt={detail.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "24px", fontWeight: 800, color: "white" }}>{getInitials(detail.name)}</span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: "4px" }}>{detail.name}</h2>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {detail.room && (
                  <span style={{ fontSize: "12px", background: isTowerA ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)", border: `1px solid ${isTowerA ? "rgba(139,92,246,0.3)" : "rgba(6,182,212,0.3)"}`, borderRadius: "6px", padding: "2px 8px", color: isTowerA ? "#a78bfa" : "#22d3ee" }}>
                    Room {detail.room.number}
                  </span>
                )}
                {detail.room?.tower && (
                  <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "2px 8px", color: "#e2e8f0" }}>
                    {detail.room.tower.name}
                  </span>
                )}
                <span style={{ fontSize: "12px", background: detail.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${detail.isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: "6px", padding: "2px 8px", color: detail.isActive ? "#34d399" : "#f87171" }}>
                  {detail.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {loadingDetail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: "48px", borderRadius: "10px" }} />)}
            </div>
          ) : (
            <>
              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {[
                  { icon: Phone, label: "Phone", value: detail.phone },
                  { icon: MessageCircle, label: "WhatsApp", value: detail.whatsapp || detail.phone },
                  { icon: Mail, label: "Email", value: detail.email || "—" },
                  { icon: Phone, label: "Alternate", value: detail.alternatePhone || "—" },
                  { icon: IndianRupee, label: "Monthly Rent", value: formatCurrency(detail.rentAmount) },
                  { icon: Shield, label: "Security", value: detail.securityDeposit ? formatCurrency(detail.securityDeposit) : "—" },
                  { icon: Calendar, label: "Joined", value: detail.joiningDate ? formatDate(detail.joiningDate) : "—" },
                  { icon: Hash, label: "Aadhaar", value: detail.aadhaarNumber || "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <Icon size={12} color={isTowerA ? "#a78bfa" : "#22d3ee"} />
                      <span style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", wordBreak: "break-all" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Aadhaar Card Document */}
              {detail.aadhaarImageUrl && (
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
                    Aadhaar Card Document
                  </p>
                  <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)", padding: "8px" }}>
                    <img
                      src={detail.aadhaarImageUrl}
                      alt="Aadhaar Card Document"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}

              {/* Rent history */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
                  Recent Rent History
                </p>
                {rentRecords.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "rgba(226,232,240,0.3)", fontSize: "13px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "10px" }}>
                    No rent records found
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {rentRecords.map((rec) => (
                      <div key={rec.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px 14px" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600 }}>{MONTH_NAMES[rec.month]} {rec.year}</p>
                          <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>
                            Paid: {formatCurrency(rec.amountPaid)} / {formatCurrency(rec.totalAmount)}
                          </p>
                        </div>
                        <span className={`badge ${getRentStatusColor(rec.status)}`} style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", border: "1px solid" }}>
                          {rec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onUploadPayment();
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "10px",
                    background: "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%)",
                    border: "1px solid rgba(20,184,166,0.3)",
                    color: "#14B8A6", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <CreditCard size={15} />
                  Upload Payment
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onViewHistory();
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "10px",
                    background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                    color: "#a78bfa", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <History size={15} />
                  1-Year History
                </button>
              </div>

              {/* WhatsApp quick action */}
              <div style={{ marginBottom: "20px" }}>
                <a
                  href={(() => {
                    const clean = wa.replace(/\D/g, "");
                    const formatted = clean.length === 10 ? `91${clean}` : clean;
                    return `https://wa.me/${formatted}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    width: "100%", padding: "11px", borderRadius: "10px",
                    background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)",
                    color: "#4ade80", fontSize: "14px", fontWeight: 600, textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </a>
              </div>

              {/* Edit Details */}
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  width: "100%", padding: "11px", borderRadius: "10px", marginBottom: "10px",
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}
              >
                <Edit size={15} />
                Edit Renter Information
              </button>

              {/* Reset Credentials */}
              {resetCreds ? (
                <div style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.25)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#14B8A6", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>🔐 New Login Credentials</p>
                  <div style={{ marginBottom: "10px" }}>
                    <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", marginBottom: "4px" }}>Login ID</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px 10px" }}>
                      <p style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#e2e8f0", wordBreak: "break-all" }}>{resetCreds.loginId}</p>
                      <button type="button" onClick={() => copyToClipboard(resetCreds.loginId, "rid")} style={{ background: "transparent", border: "none", cursor: "pointer", color: copied === "rid" ? "#4ade80" : "rgba(226,232,240,0.4)" }}>
                        {copied === "rid" ? <CheckCircle size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", marginBottom: "4px" }}>Password (shown once)</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px 10px" }}>
                      <p style={{ flex: 1, fontSize: "15px", fontWeight: 800, color: "#4ade80", letterSpacing: "2px" }}>{resetCreds.password}</p>
                      <button type="button" onClick={() => copyToClipboard(resetCreds.password, "rpwd")} style={{ background: "transparent", border: "none", cursor: "pointer", color: copied === "rpwd" ? "#4ade80" : "rgba(226,232,240,0.4)" }}>
                        {copied === "rpwd" ? <CheckCircle size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "11px", color: "#f87171", marginTop: "10px" }}>⚠️ Note this password — it cannot be viewed again.</p>
                </div>
              ) : (
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPwd}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    width: "100%", padding: "11px", borderRadius: "10px", marginBottom: "10px",
                    background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.25)",
                    color: "#14B8A6", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    opacity: resettingPwd ? 0.6 : 1,
                  }}
                >
                  {resettingPwd ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  {resettingPwd ? "Resetting..." : "Reset Login Credentials"}
                </button>
              )}

              {/* Archive (Soft Delete) */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  width: "100%", padding: "11px", borderRadius: "10px",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  color: "#fbbf24", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                {deleting ? "Archiving Renter..." : "Archive Renter"}
              </button>
              <p style={{ textAlign: "center", fontSize: "10px", color: "rgba(226,232,240,0.3)", marginTop: "4px" }}>
                Archived renters can be recovered anytime
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Renter Card ──────────────────────────────────────────────────────────────

function RenterCard({
  tenant: renter,
  onClick,
  onAddBill,
  onViewPhoto,
  onUploadPayment,
  onViewHistory,
  onEdit,
}: {
  tenant: Renter;
  onClick: () => void;
  onAddBill: () => void;
  onViewPhoto: (url: string) => void;
  onUploadPayment: () => void;
  onViewHistory: () => void;
  onEdit: () => void;
}) {
  const [sending, setSending] = useState(false);

  const handleSendInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Assuming we have the latest rent record inside `renter.rentRecords[0]` or similar
    // The main page uses renter.latestRent to pass the status, let's use rentRecords[0] if available
    const latestId = renter.rentRecords?.[0]?.id;
    if (!latestId) {
      toast.error("No rent record found to invoice!");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "single", rentRecordId: latestId })
      });
      if (!res.ok) throw new Error();
      toast.success("Invoice sent via WhatsApp!");
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setSending(false);
    }
  };

  const wa = renter.whatsapp || renter.phone;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentRec = renter.rentRecords?.find(
    (r) => r.month === currentMonth && r.year === currentYear
  ) || renter.latestRent;

  let rentStatus: string = "PENDING";
  if (currentRec && currentRec.month === currentMonth && currentRec.year === currentYear) {
    if (currentRec.amountPaid >= currentRec.totalAmount && currentRec.totalAmount > 0) {
      rentStatus = "PAID";
    } else if (currentRec.amountPaid > 0 && currentRec.amountPaid < currentRec.totalAmount) {
      rentStatus = "PARTIAL";
    } else {
      rentStatus = (currentRec.status === "OVERDUE" || (now.getDate() > 5 && currentRec.amountPaid < currentRec.totalAmount)) ? "OVERDUE" : "PENDING";
    }
  } else {
    rentStatus = now.getDate() > 5 ? "OVERDUE" : "PENDING";
  }

  const statusColor = getRentStatusColor(rentStatus);
  const isTowerA = renter.room?.tower?.name?.toLowerCase().includes("a");
  
  // Dynamic color palette per tower for clean multi-color room styling
  const roomColor = isTowerA ? "#a78bfa" : "#22d3ee"; // Purple for A, Cyan for B
  const avatarCol = isTowerA ? "#8b5cf6" : "#06b6d4";
  const latestRecord = currentRec || renter.rentRecords?.[0];
  console.log("RenterCard latestRecord debug for " + renter.name + ":", {
    rentRecordsCount: renter.rentRecords?.length,
    latestRecord,
    latestRent: renter.latestRent
  });

  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: 0,
        overflow: "hidden",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease, border-color 0.25s ease",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "18px",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-6px) scale(1.01)";
        el.style.boxShadow = `0 24px 60px ${avatarCol}25, 0 8px 32px rgba(0,0,0,0.4)`;
        el.style.borderColor = `${avatarCol}50`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0) scale(1)";
        el.style.boxShadow = "";
        el.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      {/* Top dynamic gradient accent bar depending on Tower */}
      <div style={{
        height: "3px",
        background: isTowerA 
          ? "linear-gradient(90deg, #8b5cf6, #c084fc)" 
          : "linear-gradient(90deg, #06b6d4, #22d3ee)",
      }} />

      {/* Card body */}
      <div style={{ padding: "20px" }}>
        {/* Avatar + Name + Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: renter.photoUrl ? "transparent" : avatarCol,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", border: "2px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)", flexShrink: 0,
          }}>
            {renter.photoUrl ? (
              <img src={renter.photoUrl} alt={renter.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "16px", fontWeight: 800, color: "white" }}>{getInitials(renter.name)}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {renter.name}
            </h3>
            {renter.room && (
              <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.45)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ color: roomColor, fontWeight: 600 }}>Room {renter.room.number}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{renter.room.tower.name}</span>
              </p>
            )}
            <span
              className={`badge ${statusColor}`}
              style={{ display: "inline-block", fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", border: "1px solid", marginTop: "4px" }}
            >
              {rentStatus}
            </span>
          </div>
        </div>

        {/* Room & Tower with Clean Multi-color badge styling */}
        {renter.room && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <Home size={11} color={roomColor} />
            <span style={{ fontSize: "12px", color: roomColor, fontWeight: 600 }}>Room {renter.room.number}</span>
            <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.3)" }}>·</span>
            <Building2 size={11} color={roomColor} />
            <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>{renter.room.tower.name}</span>
          </div>
        )}

        {/* Phone */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }} onClick={(e) => e.stopPropagation()}>
          <Phone size={11} color="rgba(226,232,240,0.35)" />
          <a
            href={`tel:${renter.phone}`}
            style={{ fontSize: "12px", color: "#60a5fa", textDecoration: "none" }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
          >
            {renter.phone}
          </a>
        </div>

        {/* Rent amount + Latest Bill */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          {/* Rent Amount */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <IndianRupee size={12} color="rgba(226,232,240,0.4)" />
              <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Rent</p>
            </div>
            <p style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-display)", color: "#e2e8f0" }}>
              {formatCurrency(renter.rentAmount)}
            </p>
          </div>

          {/* Electricity Bill */}
          {latestRecord && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Zap size={12} color="#fbbf24" />
                <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Latest Bill</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>
                  {formatCurrency(latestRecord.electricityBill ?? 0)}
                </p>
                {latestRecord.meterPhotoUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewPhoto(latestRecord.meterPhotoUrl!); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#14b8a6",
                      padding: "2px",
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                    title="View Meter Reading Photo"
                  >
                    <Camera size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions row */}
        {/* Actions grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
          {/* Row 1: Primary Renter Actions */}
          <button
            onClick={(e) => { e.stopPropagation(); onUploadPayment(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(13,148,136,0.08) 100%)",
              border: "1px solid rgba(20,184,166,0.35)",
              color: "#14B8A6", fontSize: "12px", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(20,184,166,0.08)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "rgba(20,184,166,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(13,148,136,0.08) 100%)"; }}
            title="Upload Payment Screenshot for Renter"
          >
            <CreditCard size={13} />
            Upload Payment
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(124,58,237,0.08) 100%)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "#a78bfa", fontSize: "12px", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(139,92,246,0.08)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "rgba(139,92,246,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(124,58,237,0.08) 100%)"; }}
            title="View 1-Year Payment & Rent History"
          >
            <History size={13} />
            1-Yr History
          </button>

          {/* Row 2: Billing Actions */}
          <button
            onClick={(e) => { e.stopPropagation(); onAddBill(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
              color: "#60a5fa", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(59,130,246,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(59,130,246,0.1)"}
          >
            <Plus size={13} />
            Add Bill
          </button>

          <button
            onClick={handleSendInvoice}
            disabled={sending}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)",
              color: "#4ade80", fontSize: "12px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.7 : 1, transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = "rgba(37,211,102,0.2)"; }}
            onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = "rgba(37,211,102,0.1)"; }}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Send Bill
          </button>

          {/* Row 3: Admin Controls */}
          <button
            onClick={onClick}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: isTowerA ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)",
              border: `1px solid ${isTowerA ? "rgba(139,92,246,0.25)" : "rgba(6,182,212,0.25)"}`,
              color: isTowerA ? "#c084fc" : "#38bdf8", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = isTowerA ? "rgba(139,92,246,0.2)" : "rgba(6,182,212,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = isTowerA ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)"}
          >
            <Eye size={13} />
            Details
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px 10px", borderRadius: "10px",
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#fbbf24", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
            title="Edit Renter Information"
          >
            <Edit size={13} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RentersPage() {
  const router = useRouter();
  const [renters, setRenters] = useState<Renter[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTower, setFilterTower] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState<Renter | null>(null);
  const [editingRenter, setEditingRenter] = useState<Renter | null>(null);
  const [uploadPaymentRenter, setUploadPaymentRenter] = useState<Renter | null>(null);
  const [historyTenant, setHistoryTenant] = useState<{ id: string; name: string; roomNumber?: string; towerName?: string } | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedRenters, setArchivedRenters] = useState<any[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, towersRes] = await Promise.all([
        fetch("/api/tenants", { cache: "no-store" }),
        fetch("/api/towers", { cache: "no-store" }),
      ]);
      const [tenantsData, towersData] = await Promise.all([tenantsRes.json(), towersRes.json()]);
      setRenters(Array.isArray(tenantsData) ? tenantsData : []);
      setTowers(Array.isArray(towersData) ? towersData : []);
    } catch {
      toast.error("Failed to load renters");
    } finally {
      setLoading(false);
    }
  };

  const fetchArchived = async () => {
    setLoadingArchived(true);
    try {
      const res = await fetch("/api/tenants/archived", { cache: "no-store" });
      const data = await res.json();
      setArchivedRenters(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load archived renters");
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleRestore = async (tenantId: string, tenantName: string) => {
    if (!window.confirm(`Restore ${tenantName} back to active renters?\n\nThey will be assigned to their previous room if it's available.`)) return;
    setRestoringId(tenantId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to restore renter");
      } else {
        toast.success(`${tenantName} restored successfully!`);
        fetchArchived();
        fetchData();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (tenantId: string, tenantName: string) => {
    const password = prompt(`⚠️ PERMANENTLY delete ${tenantName}?\n\nThis cannot be undone! All their data (rent records, payments, documents) will be erased forever.\n\nEnter admin password to confirm:`);
    if (!password) return;
    setPermanentDeletingId(tenantId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/permanent-delete`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to permanently delete");
      } else {
        toast.success(`${tenantName} permanently deleted.`);
        fetchArchived();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPermanentDeletingId(null);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return renters.filter((t) => {
      if (filterTower !== "all" && t.room?.tower?.id !== filterTower) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        (t.whatsapp || "").includes(q) ||
        (t.room?.number || "").toLowerCase().includes(q)
      );
    });
  }, [renters, search, filterTower]);

  // Group filtered renters by Tower, sorted numerically by room number
  const groupedByTower = useMemo(() => {
    const groups: { [towerName: string]: Renter[] } = {};
    filtered.forEach((t) => {
      const towerName = t.room?.tower?.name || "Unassigned Tower";
      if (!groups[towerName]) groups[towerName] = [];
      groups[towerName].push(t);
    });
    // Sort each tower's renters numerically by room number
    Object.keys(groups).forEach((tower) => {
      groups[tower].sort((a, b) => {
        const aNum = parseInt(a.room?.number || "0", 10);
        const bNum = parseInt(b.room?.number || "0", 10);
        return aNum - bNum;
      });
    });
    return groups;
  }, [filtered]);

  // Stats
  const activeCount = renters.filter((t) => t.isActive).length;
  const pendingRent = renters.filter((t) => t.latestRent?.status === "PENDING" || t.latestRent?.status === "OVERDUE").length;
  const paidRent = renters.filter((t) => t.latestRent?.status === "PAID").length;

  return (
    <AppLayout role="ADMIN" title="Renter Management" subtitle="Manage all renters across towers">
      {/* ── Header ── */}
      <div className="section-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2 className="section-title">All Renters</h2>
          <p className="section-subtitle">{renters.length} residents · {activeCount} active</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} />
          Add Renter
        </button>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Renters", value: renters.length, color: "#8b5cf6" },
          { label: "Active", value: activeCount, color: "#10b981" },
          { label: "Rent Paid", value: paidRent, color: "#3b82f6" },
          { label: "Pending/Overdue", value: pendingRent, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ textAlign: "center", padding: "16px" }}>
            <p style={{ fontSize: "26px", fontWeight: 800, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.45)", marginTop: "4px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={15} color="rgba(226,232,240,0.35)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            className="form-input"
            placeholder="Search by name, phone, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "36px" }}
          />
        </div>

        {/* Tower toggle tab buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "4px" }}>
          {/* All Towers */}
          <button
            onClick={() => setFilterTower("all")}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "9px", border: "none",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s ease",
              background: filterTower === "all"
                ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(6,182,212,0.25) 100%)"
                : "transparent",
              color: filterTower === "all" ? "#e2e8f0" : "rgba(226,232,240,0.45)",
              boxShadow: filterTower === "all" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            <Building2 size={13} />
            All Towers
          </button>

          {/* Dynamic Tower A / Tower B tabs */}
          {towers.map((tower) => {
            const isTowerA = tower.name.toLowerCase().includes("a");
            const accentColor = isTowerA ? "#8b5cf6" : "#06b6d4";
            const accentBg = isTowerA ? "rgba(139,92,246,0.25)" : "rgba(6,182,212,0.25)";
            const isActive = filterTower === tower.id;
            return (
              <button
                key={tower.id}
                onClick={() => setFilterTower(isActive ? "all" : tower.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "9px", border: "none",
                  fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: isActive ? accentBg : "transparent",
                  color: isActive ? accentColor : "rgba(226,232,240,0.45)",
                  boxShadow: isActive ? `0 2px 8px ${accentColor}30` : "none",
                }}
              >
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: isActive ? accentColor : "rgba(226,232,240,0.3)",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }} />
                {tower.name}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.4)", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: "280px", borderRadius: "18px" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(226,232,240,0.3)" }}>
          <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.25 }} />
          <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            {search || filterTower !== "all" ? "No renters match your filters" : "No renters yet"}
          </p>
          <p style={{ fontSize: "13px" }}>
            {search || filterTower !== "all" ? "Try adjusting your search or filter" : "Click 'Add Renter' to get started"}
          </p>
          {(search || filterTower !== "all") && (
            <button
              className="btn-ghost"
              style={{ marginTop: "16px" }}
              onClick={() => { setSearch(""); setFilterTower("all"); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* Separate both towers beautifully with clean grouping and dynamic multicolors */
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {Object.entries(groupedByTower).map(([towerName, list]) => {
            const isTowerA = towerName.toLowerCase().includes("a");
            
            // Dynamic purple color for Tower A and cyan for Tower B
            const accentColor = isTowerA ? "#8b5cf6" : "#06b6d4"; 

            return (
              <div 
                key={towerName} 
                className="glass-card animate-fade-in-up" 
                style={{ 
                  padding: "24px", 
                  background: isTowerA 
                    ? "linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(0,0,0,0.1) 100%)" 
                    : "linear-gradient(135deg, rgba(6,182,212,0.03) 0%, rgba(0,0,0,0.1) 100%)",
                  border: `1px solid ${isTowerA ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)"}`,
                  borderRadius: "24px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", borderBottom: `1px solid ${isTowerA ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)"}`, paddingBottom: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", background: `${accentColor}15`,
                    border: `1px solid ${accentColor}30`, borderRadius: "10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Building2 size={18} color={accentColor} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#e2e8f0", fontFamily: "var(--font-display)" }}>
                      {towerName}
                    </h3>
                    <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>
                      {list.length} renter{list.length !== 1 ? "s" : ""} active in this block
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {list.map((renterVal, i) => (
                    <div
                      key={renterVal.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <RenterCard
                        tenant={renterVal}
                        onClick={() => setSelectedRenter(renterVal)}
                        onAddBill={() => router.push(`/admin/rent?addBillFor=${renterVal.id}`)}
                        onViewPhoto={(url) => setActivePhotoUrl(url)}
                        onUploadPayment={() => setUploadPaymentRenter(renterVal)}
                        onViewHistory={() =>
                          setHistoryTenant({
                            id: renterVal.id,
                            name: renterVal.name,
                            roomNumber: renterVal.room?.number,
                            towerName: renterVal.room?.tower?.name,
                          })
                        }
                        onEdit={() => setEditingRenter(renterVal)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Archived Renters Section ── */}
      <div style={{ marginTop: "40px" }}>
        <button
          onClick={() => {
            setShowArchived(!showArchived);
            if (!showArchived) fetchArchived();
          }}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "16px 20px", borderRadius: "16px",
            background: showArchived 
              ? "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)" 
              : "rgba(255,255,255,0.02)",
            border: showArchived 
              ? "1px solid rgba(245,158,11,0.2)" 
              : "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer", transition: "all 0.3s ease",
            color: showArchived ? "#fbbf24" : "rgba(226,232,240,0.5)",
          }}
        >
          <Archive size={18} />
          <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            Archived Renters
          </span>
          <span style={{
            fontSize: "11px", background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.3)", borderRadius: "999px",
            padding: "2px 10px", color: "#fbbf24", fontWeight: 700,
          }}>
            {archivedRenters.length}
          </span>
          <ChevronRight
            size={16}
            style={{
              transition: "transform 0.3s",
              transform: showArchived ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {showArchived && (
          <div style={{
            marginTop: "16px", padding: "20px", borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(245,158,11,0.03) 0%, rgba(0,0,0,0.1) 100%)",
            border: "1px solid rgba(245,158,11,0.1)",
          }}>
            {loadingArchived ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2].map((i) => (
                  <div key={i} className="shimmer" style={{ height: "80px", borderRadius: "12px" }} />
                ))}
              </div>
            ) : archivedRenters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(226,232,240,0.3)" }}>
                <Archive size={36} style={{ margin: "0 auto 12px", opacity: 0.25 }} />
                <p style={{ fontSize: "14px", fontWeight: 600 }}>No archived renters</p>
                <p style={{ fontSize: "12px", marginTop: "4px" }}>When you remove a renter, they'll appear here for recovery</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {archivedRenters.map((t: any) => (
                  <div
                    key={t.id}
                    className="animate-fade-in-up"
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "14px", padding: "16px",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "50%",
                      background: t.photoUrl ? "transparent" : "rgba(245,158,11,0.2)",
                      border: "2px solid rgba(245,158,11,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", flexShrink: 0,
                    }}>
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "#fbbf24" }}>{getInitials(t.name)}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", marginBottom: "2px" }}>{t.name}</p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>
                          <Phone size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                          {t.phone}
                        </span>
                        {t.room && (
                          <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>
                            Room {t.room.number} · {t.room.tower?.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                        <Clock size={10} color="rgba(245,158,11,0.6)" />
                        <span style={{ fontSize: "10px", color: "rgba(245,158,11,0.6)" }}>
                          Archived {t.deletedAt ? new Date(t.deletedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </span>
                        {t.deletionReason && (
                          <span style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)" }}>
                            · {t.deletionReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleRestore(t.id, t.name)}
                        disabled={restoringId === t.id}
                        title="Restore this renter"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "8px 14px", borderRadius: "10px",
                          background: "rgba(16,185,129,0.1)",
                          border: "1px solid rgba(16,185,129,0.25)",
                          color: "#34d399", fontSize: "12px", fontWeight: 600,
                          cursor: restoringId === t.id ? "not-allowed" : "pointer",
                          opacity: restoringId === t.id ? 0.6 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {restoringId === t.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(t.id, t.name)}
                        disabled={permanentDeletingId === t.id}
                        title="Permanently delete (no recovery)"
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "8px 10px", borderRadius: "10px",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          color: "#f87171", fontSize: "12px", fontWeight: 600,
                          cursor: permanentDeletingId === t.id ? "not-allowed" : "pointer",
                          opacity: permanentDeletingId === t.id ? 0.6 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {permanentDeletingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <AddRenterModal
          onClose={() => setShowAdd(false)}
          onSave={fetchData}
        />
      )}

      {selectedRenter && (
        <RenterDetailModal
          tenant={selectedRenter}
          onClose={() => setSelectedRenter(null)}
          onDeleted={fetchData}
          onUploadPayment={() => {
            setUploadPaymentRenter(selectedRenter);
          }}
          onViewHistory={() => {
            setHistoryTenant({
              id: selectedRenter.id,
              name: selectedRenter.name,
              roomNumber: selectedRenter.room?.number,
              towerName: selectedRenter.room?.tower?.name,
            });
          }}
          onEdit={() => setEditingRenter(selectedRenter)}
        />
      )}

      {editingRenter && (
        <EditRenterModal
          renter={editingRenter}
          onClose={() => setEditingRenter(null)}
          onSave={fetchData}
        />
      )}

      {uploadPaymentRenter && (
        <ManualPaymentModal
          tenant={uploadPaymentRenter}
          onClose={() => setUploadPaymentRenter(null)}
          onSuccess={() => {
            fetchData();
            if (selectedRenter?.id === uploadPaymentRenter.id) {
              setSelectedRenter(null);
            }
          }}
        />
      )}

      {historyTenant && (
        <RenterHistoryModal
          tenantId={historyTenant.id}
          tenantName={historyTenant.name}
          roomNumber={historyTenant.roomNumber}
          towerName={historyTenant.towerName}
          onClose={() => setHistoryTenant(null)}
          onOpenUploadModal={() => {
            const match = renters.find((r) => r.id === historyTenant.id);
            if (match) setUploadPaymentRenter(match);
          }}
        />
      )}

      {activePhotoUrl && (
        <div 
          className="modal-overlay" 
          onClick={() => setActivePhotoUrl(null)}
          style={{
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              width: "auto",
              padding: "20px",
              background: "rgba(10, 12, 12, 0.95)",
              border: "1px solid rgba(20, 184, 166, 0.2)",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative"
            }}
          >
            <button 
              onClick={() => setActivePhotoUrl(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.8)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", paddingRight: "40px" }}>Electricity Meter Photo</h3>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", borderRadius: "8px" }}>
              <img 
                src={activePhotoUrl} 
                alt="Meter Reading Photo" 
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} 
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
