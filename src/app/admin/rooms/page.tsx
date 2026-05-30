"use client";

import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Edit, Trash2, X, Loader2, Building2, ChevronUp, ChevronDown, User, FileText, Zap, IndianRupee, Send, Camera } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, getMonthName, compressImage } from "@/lib/utils";
import { useRouter } from "next/navigation";

/* ───────────── Types ───────────── */

interface RentRecord {
  id: string;
  month: number;
  year: number;
  rentAmount: number;
  electricityBill: number;
  totalAmount: number;
  amountPaid: number;
  status: "PAID" | "PENDING" | "PARTIAL" | "OVERDUE" | "ADVANCE_PAID";
  meterPhotoUrl?: string | null;
}

interface Room {
  id: string;
  number: string;
  category: string;
  baseRent: number;
  isOccupied: boolean;
  meterNumber?: string;
  tower: { id: string; name: string };
  tenant?: {
    id: string;
    name: string;
    phone: string;
    rentAmount: number;
    photoUrl?: string;
    rentRecords?: RentRecord[];
  };
}

interface Tower {
  id: string;
  name: string;
}

/* ───────────── Helpers ───────────── */

function numericSort(a: Room, b: Room): number {
  return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
}

function getRentStatus(room: Room): "PAID" | "OVERDUE" | "PENDING" | "NONE" {
  if (!room.isOccupied || !room.tenant) return "NONE";
  const rec = room.tenant.rentRecords?.[0];
  if (!rec) return "PENDING";
  if (rec.status === "PAID" || rec.status === "ADVANCE_PAID") return "PAID";
  if (rec.status === "OVERDUE") return "OVERDUE";
  return "PENDING";
}

/* ───────────── Room Edit Modal ───────────── */

function RoomModal({
  room, towers, onClose, onSave,
}: {
  room?: Room | null; towers: Tower[]; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    number: room?.number || "",
    category: room?.category || "Standard",
    baseRent: room?.baseRent || "",
    meterNumber: room?.meterNumber || "",
    towerId: room?.tower?.id || (towers[0]?.id || ""),
    description: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = room ? `/api/rooms/${room.id}` : "/api/rooms";
      const method = room ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
      } else {
        toast.success(room ? "Room updated!" : "Room created!");
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {room ? "Edit Room" : "Add New Room"}
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="form-label">Room Number *</label>
            <input className="form-input" placeholder="e.g. 101" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Tower *</label>
            <select className="form-input" value={form.towerId} onChange={(e) => setForm({ ...form, towerId: e.target.value })}>
              {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["1 BHK", "2 BHK", "3 BHK"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Base Rent (₹) *</label>
              <input type="number" className="form-input" placeholder="8000" value={form.baseRent} onChange={(e) => setForm({ ...form, baseRent: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="form-label">Electricity Meter Number</label>
            <input className="form-input" placeholder="e.g. MET-001" value={form.meterNumber} onChange={(e) => setForm({ ...form, meterNumber: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {room ? "Update Room" : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────── Quick Entry Modal ───────────── */

function QuickEntryModal({
  tenant,
  roomNumber,
  towerName,
  onClose,
  onSave,
}: {
  tenant: { id: string; name: string; rentAmount: number };
  roomNumber: string;
  towerName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    tenantId: tenant.id,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    rentAmount: String(tenant.rentAmount),
    electricityBill: "",
    meterReading: "",
    maintenanceCharge: "",
    lateFee: "",
    discount: "",
    notes: "",
  });
  const [meterPhoto, setMeterPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const total =
    parseFloat(form.rentAmount || "0") +
    parseFloat(form.electricityBill || "0") +
    parseFloat(form.maintenanceCharge || "0") +
    parseFloat(form.lateFee || "0") -
    parseFloat(form.discount || "0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let meterPhotoUrl = null;
      if (meterPhoto) {
        let fileToUpload: File | Blob = meterPhoto;
        try {
          fileToUpload = await compressImage(meterPhoto);
        } catch (compressErr) {
          console.error("Compression failed, using original:", compressErr);
        }
        const formData = new FormData();
        formData.append("file", fileToUpload);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          meterPhotoUrl = (await uploadRes.json()).url;
        } else {
          toast.error("Failed to upload meter photo");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, meterPhotoUrl }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
      } else {
        toast.success("Rent entry saved! 🎉");
        onSave();
        onClose();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Add Rent/Bill</h2>
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>
              {tenant.name} — Room {roomNumber} ({towerName})
            </p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label">Month *</label>
              <select className="form-input" value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Year *</label>
              <input type="number" className="form-input" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} min={2020} max={2030} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label">Rent Amount (₹) *</label>
              <input type="number" className="form-input" placeholder="8000" value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Electricity Bill (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={form.electricityBill} onChange={(e) => setForm({ ...form, electricityBill: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label">Meter Reading</label>
              <input type="text" className="form-input" placeholder="e.g. 1540" value={form.meterReading} onChange={(e) => setForm({ ...form, meterReading: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Meter Photo</label>
              <input type="file" className="form-input" accept="image/*" onChange={(e) => setMeterPhoto(e.target.files?.[0] || null)} style={{ padding: "8px" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label className="form-label">Maintenance (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={form.maintenanceCharge} onChange={(e) => setForm({ ...form, maintenanceCharge: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Late Fee (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={form.lateFee} onChange={(e) => setForm({ ...form, lateFee: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Discount (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" placeholder="Any special notes..." rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </div>

          {/* Total preview */}
          <div
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.6)" }}>Total Amount</span>
            <span style={{ fontSize: "22px", fontWeight: 800, fontFamily: "var(--font-display)", color: "#a78bfa" }}>
              {formatCurrency(total)}
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────── Main Page ───────────── */

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [towers, setTowers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTower, setActiveTower] = useState<string>("");
  const [modal, setModal] = useState<{ open: boolean; room?: Room | null }>({ open: false });
  const [entryModal, setEntryModal] = useState<{ open: boolean; room?: Room | null }>({ open: false });
  const [updatingRent, setUpdatingRent] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const handleSendInvoice = async (e: React.MouseEvent, recordId: string, roomId: string) => {
    e.stopPropagation();
    setSendingInvoice(roomId);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "single", rentRecordId: recordId })
      });
      if (!res.ok) throw new Error();
      toast.success("Invoice sent via WhatsApp!");
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setSendingInvoice(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, towersRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/towers"),
      ]);
      const [roomsData, towersData] = await Promise.all([roomsRes.json(), towersRes.json()]);
      const rArr = Array.isArray(roomsData) ? roomsData : [];
      const tArr = Array.isArray(towersData) ? towersData : [];
      setRooms(rArr);
      setTowers(tArr);
      if (!activeTower && tArr.length > 0) setActiveTower(tArr[0].id);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTower]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Adjust renter's rent by ₹100 ── */
  async function adjustRent(room: Room, delta: number) {
    if (!room.tenant) return;
    const newRent = Math.max(0, room.tenant.rentAmount + delta);
    setUpdatingRent(room.id);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id && r.tenant
          ? { ...r, tenant: { ...r.tenant, rentAmount: newRent } }
          : r
      )
    );
    try {
      const res = await fetch(`/api/tenants/${room.tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentAmount: newRent }),
      });
      if (!res.ok) {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id && r.tenant
              ? { ...r, tenant: { ...r.tenant, rentAmount: room.tenant!.rentAmount } }
              : r
          )
        );
        toast.error("Failed to update rent");
      }
    } catch {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id && r.tenant
            ? { ...r, tenant: { ...r.tenant, rentAmount: room.tenant!.rentAmount } }
            : r
        )
      );
      toast.error("Failed to update rent");
    } finally {
      setUpdatingRent(null);
    }
  }

  /* ── Delete room ── */
  async function deleteRoom(id: string, number: string) {
    const password = prompt(`Are you sure you want to delete Room ${number}?\n\nPlease enter your admin password to confirm:`);
    if (password === null) return;
    if (!password.trim()) { toast.error("Password is required to delete a room"); return; }
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE", headers: { "x-admin-password": password } });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed to delete room"); }
      else { toast.success("Room deleted"); fetchData(); }
    } catch { toast.error("Failed to delete room"); }
  }

  /* ── Derived data ── */
  const activeRooms = rooms.filter((r) => r.tower.id === activeTower).sort(numericSort);
  const activeTowerObj = towers.find((t) => t.id === activeTower);
  const occupied = activeRooms.filter((r) => r.isOccupied).length;
  const vacant = activeRooms.filter((r) => !r.isOccupied).length;

  return (
    <AppLayout role="ADMIN" title="Room Management" subtitle="Manage all rooms across towers">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">All Rooms</h2>
          <p className="section-subtitle">{rooms.length} rooms · {occupied} occupied · {vacant} vacant</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, room: null })}>
          <Plus size={18} /> Add Room
        </button>
      </div>

      {/* ─── Tower Tabs ─── */}
      <div style={{
        display: "flex", gap: "0", marginBottom: "24px",
        background: "rgba(15,23,42,0.6)", borderRadius: "14px",
        border: "1px solid rgba(139,92,246,0.15)", padding: "4px", width: "fit-content",
      }}>
        {towers.map((tower) => {
          const isActive = tower.id === activeTower;
          const count = rooms.filter((r) => r.tower.id === tower.id).length;
          return (
            <button key={tower.id} onClick={() => setActiveTower(tower.id)} style={{
              padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-display)",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              display: "flex", alignItems: "center", gap: "8px",
              background: isActive ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))" : "transparent",
              color: isActive ? "#e2e8f0" : "rgba(226,232,240,0.4)",
              boxShadow: isActive ? "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
            }}>
              <Building2 size={16} style={{ opacity: isActive ? 1 : 0.5 }} />
              {tower.name}
              <span style={{
                background: isActive ? "rgba(139,92,246,0.3)" : "rgba(100,116,139,0.15)",
                padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                color: isActive ? "#c4b5fd" : "rgba(226,232,240,0.35)",
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Summary ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Rooms", value: activeRooms.length, color: "#8b5cf6" },
          { label: "Occupied", value: occupied, color: "#10b981" },
          { label: "Vacant", value: vacant, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ textAlign: "center", padding: "16px" }}>
            <p style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", marginTop: "4px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {Array(8).fill(0).map((_, i) => <div key={i} className="shimmer" style={{ height: "180px", borderRadius: "16px" }} />)}
        </div>
      ) : (
        <>
          {/* Tower heading */}
          {activeTowerObj && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Building2 size={18} color="#8b5cf6" />
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>{activeTowerObj.name}</h3>
              <span style={{ fontSize: "12px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "999px", padding: "2px 10px", color: "#a78bfa" }}>
                {occupied}/{activeRooms.length} occupied
              </span>
            </div>
          )}

          {/* ─── Room Grid ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {activeRooms.map((room) => {
              const status = getRentStatus(room);
              const isAdjusting = updatingRent === room.id;
              const hasRenter = room.isOccupied && room.tenant;
              const latestRecord = hasRenter ? room.tenant?.rentRecords?.[0] : null;

              /* Status colors */
              const statusColor =
                status === "PAID" ? "#34d399" :
                status === "OVERDUE" ? "#f87171" :
                status === "PENDING" ? "#fbbf24" : "#94a3b8";
              const statusBg =
                status === "PAID" ? "rgba(16,185,129,0.12)" :
                status === "OVERDUE" ? "rgba(239,68,68,0.12)" :
                status === "PENDING" ? "rgba(245,158,11,0.12)" : "rgba(100,116,139,0.08)";
              const statusBorder =
                status === "PAID" ? "rgba(16,185,129,0.35)" :
                status === "OVERDUE" ? "rgba(239,68,68,0.35)" :
                status === "PENDING" ? "rgba(245,158,11,0.35)" : "rgba(100,116,139,0.2)";
              const statusLabel =
                status === "PAID" ? "PAID" :
                status === "OVERDUE" ? "OVERDUE" :
                status === "PENDING" ? "PENDING" : "VACANT";

              const isTowerA = room.tower.name.includes("A");
              const avatarCol = isTowerA ? "#8b5cf6" : "#06b6d4";

              return (
                <div
                  key={room.id}
                  className="tenant-card"
                  onClick={() => {
                    if (hasRenter) {
                      router.push(`/admin/tenants?search=${encodeURIComponent(room.number)}`);
                    }
                  }}
                  style={{
                    padding: "0",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "220px",
                    cursor: hasRenter ? "pointer" : "default",
                  }}
                >
                  <div style={{
                    height: "3px",
                    background: isTowerA 
                      ? "linear-gradient(90deg, #8b5cf6, #c084fc)" 
                      : "linear-gradient(90deg, #06b6d4, #22d3ee)",
                  }} />
                  {/* ── Row 1: Room number + Status badge ── */}
                  <div style={{
                    padding: "16px 20px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(226,232,240,0.05)",
                  }}>
                    <span style={{
                      fontSize: "26px",
                      fontWeight: 900,
                      fontFamily: "var(--font-display)",
                      color: "#e2e8f0",
                      letterSpacing: "-0.5px",
                    }}>
                      {room.number}
                    </span>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.6px",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      background: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                    }}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* ── Row 2: Renter name or Available ── */}
                  <div style={{ padding: "12px 20px 12px", flexGrow: 1 }}>
                    {hasRenter ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: "rgba(139,92,246,0.15)",
                          border: "1px solid rgba(139,92,246,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}>
                          {room.tenant!.photoUrl ? (
                            <img src={room.tenant!.photoUrl} alt={room.tenant!.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <User size={16} color="#a78bfa" />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: "15px", fontWeight: 700, color: "#2dd4bf",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            lineHeight: "1.2",
                          }}>{room.tenant!.name}</p>
                          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", lineHeight: "1.2", marginTop: "2px" }} onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${room.tenant!.phone}`}
                              style={{ color: "#60a5fa", textDecoration: "none" }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                            >
                              {room.tenant!.phone}
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: "rgba(100,116,139,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <User size={16} color="rgba(226,232,240,0.2)" />
                        </div>
                        <p style={{ fontSize: "14px", color: "rgba(226,232,240,0.3)", fontStyle: "italic" }}>
                          No renter · Available
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Row 3: Rent amount + adjust buttons ── */}
                  <div style={{
                    margin: "0 16px",
                    padding: "12px",
                    background: "rgba(15,23,42,0.4)",
                    borderRadius: "12px",
                    border: "1px solid rgba(139,92,246,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                         <IndianRupee size={12} color="rgba(226,232,240,0.4)" />
                         <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Base Rent</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <p style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-display)", color: "#e2e8f0" }}>
                          {formatCurrency(hasRenter ? room.tenant!.rentAmount : room.baseRent)}
                        </p>
                        {hasRenter && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustRent(room, 100); }}
                              disabled={isAdjusting}
                              style={{
                                width: "24px", height: "24px", borderRadius: "6px",
                                border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "#34d399",
                                cursor: isAdjusting ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: isAdjusting ? 0.4 : 1, transition: "all 0.2s",
                              }}
                              title="+₹100"
                            ><ChevronUp size={14} strokeWidth={3} /></button>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustRent(room, -100); }}
                              disabled={isAdjusting || room.tenant!.rentAmount <= 0}
                              style={{
                                width: "24px", height: "24px", borderRadius: "6px",
                                border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171",
                                cursor: (isAdjusting || room.tenant!.rentAmount <= 0) ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: (isAdjusting || room.tenant!.rentAmount <= 0) ? 0.4 : 1, transition: "all 0.2s",
                              }}
                              title="-₹100"
                            ><ChevronDown size={14} strokeWidth={3} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {hasRenter && latestRecord && (
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                             <Zap size={12} color="#fbbf24" />
                             <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Latest Bill</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                             <p style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>
                               {formatCurrency(latestRecord.electricityBill)}
                             </p>
                             {latestRecord.meterPhotoUrl && (
                               <button
                                 onClick={(e) => { e.stopPropagation(); setActivePhotoUrl(latestRecord.meterPhotoUrl || null); }}
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

                  {/* ── Row 4: Actions ── */}
                  <div style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    marginTop: "auto",
                  }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {hasRenter && latestRecord && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendInvoice(e, latestRecord.id, room.id); }}
                          disabled={sendingInvoice === room.id}
                          style={{
                            height: "32px", padding: "0 12px", borderRadius: "8px",
                            background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)",
                            cursor: sendingInvoice === room.id ? "not-allowed" : "pointer", color: "#4ade80",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            fontSize: "12px", fontWeight: 700,
                            transition: "all 0.2s", opacity: sendingInvoice === room.id ? 0.6 : 1
                          }}
                          title="Send Bill Reminder via WhatsApp"
                        >
                          {sendingInvoice === room.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />} Bill
                        </button>
                      )}
                      {hasRenter && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEntryModal({ open: true, room }); }}
                            style={{
                              height: "32px", padding: "0 12px", borderRadius: "8px",
                              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                              cursor: "pointer", color: "#60a5fa",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                              fontSize: "12px", fontWeight: 700,
                              transition: "all 0.2s",
                            }}
                            title="Add Rent/Bill Entry"
                          >
                            <Plus size={14} strokeWidth={2.5} /> Bill
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/tenants?search=${encodeURIComponent(room.number)}`);
                            }}
                            style={{
                              height: "32px", padding: "0 12px", borderRadius: "8px",
                              background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.1))",
                              border: "1px solid rgba(16,185,129,0.3)",
                              cursor: "pointer", color: "#34d399",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                              fontSize: "12px", fontWeight: 700,
                              transition: "all 0.2s",
                            }}
                            title="View Renter Details"
                          >
                            <User size={14} strokeWidth={2.5} /> Renter
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal({ open: true, room }); }}
                        style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                          cursor: "pointer", color: "#a78bfa",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        title="Edit Room"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRoom(room.id, room.number); }}
                        disabled={room.isOccupied}
                        style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
                          cursor: room.isOccupied ? "not-allowed" : "pointer",
                          color: "rgba(239,68,68,0.5)", opacity: room.isOccupied ? 0.3 : 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        title={room.isOccupied ? "Cannot delete occupied room" : "Delete"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {activeRooms.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px 20px", color: "rgba(226,232,240,0.3)" }}>
                <Building2 size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: "14px", fontWeight: 600 }}>No rooms in {activeTowerObj?.name || "this tower"}</p>
                <p style={{ fontSize: "12px", marginTop: "4px" }}>Click &quot;Add Room&quot; to create one</p>
              </div>
            )}
          </div>
        </>
      )}

      {modal.open && (
        <RoomModal room={modal.room} towers={towers} onClose={() => setModal({ open: false })} onSave={fetchData} />
      )}

      {entryModal.open && entryModal.room?.tenant && (
        <QuickEntryModal
          tenant={entryModal.room.tenant}
          roomNumber={entryModal.room.number}
          towerName={entryModal.room.tower.name}
          onClose={() => setEntryModal({ open: false })}
          onSave={fetchData}
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
