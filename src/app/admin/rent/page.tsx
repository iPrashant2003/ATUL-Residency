"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  IndianRupee, Plus, X, Loader2, CheckCircle, Clock,
  AlertTriangle, MessageCircle, Search, Filter,
  ChevronDown, Calendar, Zap, FileText, Send, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, getMonthName, getRentStatusColor, compressImage } from "@/lib/utils";

interface RentRecord {
  id: string;
  month: number;
  year: number;
  rentAmount: number;
  electricityBill: number;
  meterPhotoUrl?: string | null;
  maintenanceCharge: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  payments?: any[];
  tenant: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    photoUrl?: string;
    room: { number: string; tower: { name: string } };
  };
}

interface Tenant {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  rentAmount: number;
  room: { number: string; tower: { name: string } };
}

function EntryModal({
  tenants,
  onClose,
  onSave,
  initialTenantId,
}: {
  tenants: Tenant[];
  onClose: () => void;
  onSave: () => void;
  initialTenantId?: string;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    tenantId: initialTenantId || (tenants[0]?.id || ""),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    rentAmount: "",
    electricityBill: "",
    meterReading: "",
    maintenanceCharge: "",
    lateFee: "",
    discount: "",
    notes: "",
  });
  const [meterPhoto, setMeterPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-fill rent when tenant changes
  useEffect(() => {
    const tenant = tenants.find((t) => t.id === form.tenantId);
    if (tenant) setForm((f) => ({ ...f, rentAmount: String(tenant.rentAmount) }));
  }, [form.tenantId, tenants]);

  // Load billing default preferences on mount
  useEffect(() => {
    const savedMaintenance = localStorage.getItem("default_maintenance_charge") || "500";
    const savedLateFee = localStorage.getItem("default_late_fee") || "0";
    setForm((f) => ({
      ...f,
      maintenanceCharge: savedMaintenance,
      lateFee: savedLateFee,
    }));
  }, []);

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
            <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Add Rent Entry</h2>
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>Record monthly rent & electricity</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="form-label">Renter / Room *</label>
            <select className="form-input" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              {/* Group by Tower */}
              {Array.from(new Set(tenants.map(t => t.room.tower.name))).sort().map(towerName => (
                <optgroup key={towerName} label={towerName}>
                  {tenants.filter(t => t.room.tower.name === towerName).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — Room {t.room.number}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

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

function StatusUpdateModal({
  record,
  onClose,
  onSave,
  invoiceBaseUrl,
}: {
  record: RentRecord;
  onClose: () => void;
  onSave: () => void;
  invoiceBaseUrl: string;
}) {
  const [form, setForm] = useState({
    status: record.status,
    amountPaid: record.amountPaid,
    notes: record.notes || "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/rent/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated!");
      onSave();
      onClose();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  function sendWhatsApp() {
    const tenant = record.tenant;
    const invoiceUrl = `${invoiceBaseUrl}/api/rent/${record.id}/invoice`;

    let breakdown = `💰 Rent: *${formatCurrency(record.rentAmount)}*\n`;
    if (record.electricityBill > 0) breakdown += `⚡ Electricity: *${formatCurrency(record.electricityBill)}*\n`;
    if (record.maintenanceCharge > 0) breakdown += `🔧 Maintenance: *${formatCurrency(record.maintenanceCharge)}*\n`;
    if (record.lateFee > 0) breakdown += `⏳ Late Fee: *${formatCurrency(record.lateFee)}*\n`;
    if (record.discount > 0) breakdown += `🎁 Discount: *- ${formatCurrency(record.discount)}*\n`;

    const isPaid = record.status === "PAID" || record.status === "ADVANCE_PAID";

    const msg = encodeURIComponent(
      isPaid
        ? `🏢 *ATUL RESIDENCY* 🏢\n\n` +
          `Dear *${tenant.name}*,\n\n` +
          `Here is your *Payment Receipt* for *${getMonthName(record.month)} ${record.year}*:\n` +
          breakdown +
          `━━━━━━━━━\n` +
          `💰 Amount Paid: *${formatCurrency(record.totalAmount)}*\n` +
          `✅ Status: *PAID / Verified*\n\n` +
          `📄 *View & Download PDF Receipt*:\n${invoiceUrl}\n\n` +
          `💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n` +
          `Thank you! 🙏`
        : `🏢 *ATUL RESIDENCY* 🏢\n\n` +
          `Dear *${tenant.name}*,\n\n` +
          `Your rent invoice for *${getMonthName(record.month)} ${record.year}* is:\n` +
          breakdown +
          `━━━━━━━━━\n` +
          `💵 Total Due: *${formatCurrency(record.totalAmount - record.amountPaid)}*\n\n` +
          `⚠️ *Please Pay on time!* ⚠️\n\n` +
          `📄 *View & Download PDF Invoice*:\n${invoiceUrl}\n\n` +
          `💳 *Please pay via UPI*: atultiwari123321@oksbi\n\n` +
          `💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n` +
          `Thank you! 🙏`
    );
    const cleanNumber = tenant.whatsapp.replace(/\D/g, "");
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    window.open(`https://wa.me/${formattedNumber}?text=${msg}`, "_blank");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Update Status</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}><X size={20} /></button>
        </div>

        {/* Record info */}
        <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontWeight: 600 }}>{record.tenant.name}</span>
            <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>Room {record.tenant.room.number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>{getMonthName(record.month)} {record.year}</span>
            <span style={{ fontWeight: 700, color: "#a78bfa" }}>{formatCurrency(record.totalAmount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="form-label">Payment Status</label>
            <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["PENDING", "PAID", "PARTIAL", "OVERDUE", "ADVANCE_PAID"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Amount Paid (₹)</label>
            <input type="number" className="form-input" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: parseFloat(e.target.value) })} max={record.totalAmount} />
          </div>
          <div>
            <label className="form-label">Admin Notes</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={sendWhatsApp} className="btn-ghost" style={{ flex: 1, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", color: "#25d366" }}>
              <MessageCircle size={16} />
              WhatsApp
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RentTrackerPage() {
  const [records, setRecords] = useState<RentRecord[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryModal, setEntryModal] = useState<{ open: boolean; tenantId?: string }>({ open: false });
  const [statusModal, setStatusModal] = useState<{ open: boolean; record?: RentRecord }>({ open: false });
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTower, setFilterTower] = useState("all");
  const [search, setSearch] = useState("");
  const [adminConfig, setAdminConfig] = useState<{ baseUrl: string } | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [recRes, tenRes] = await Promise.all([
        fetch(`/api/rent?month=${filterMonth}&year=${filterYear}`),
        fetch("/api/tenants"),
      ]);
      const [recData, tenData] = await Promise.all([recRes.json(), tenRes.json()]);
      setRecords(Array.isArray(recData) ? recData : []);
      setTenants(Array.isArray(tenData) ? tenData : []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.baseUrl) setAdminConfig(data);
      })
      .catch(() => {});
  }, []);

  const invoiceBaseUrl = adminConfig?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

  // Read URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const addBillFor = searchParams.get("addBillFor");
      if (addBillFor && tenants.length > 0) {
        setEntryModal({ open: true, tenantId: addBillFor });
      }
    }
  }, [tenants.length]); // only trigger once tenants are loaded

  const filtered = records.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterTower !== "all" && r.tenant.room.tower.name !== filterTower) return false;
    if (search && !r.tenant.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.tenant.room.number.includes(search)) return false;
    return true;
  });

  const totalExpected = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const totalReceived = filtered.reduce((s, r) => s + r.amountPaid, 0);
  const paid = filtered.filter((r) => r.status === "PAID").length;
  const overdue = filtered.filter((r) => r.status === "OVERDUE").length;
  const pending = filtered.filter((r) => r.status === "PENDING").length;

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));

  async function sendBulkReminders() {
    const overdueRecords = records.filter((r) => r.status === "OVERDUE" || r.status === "PENDING");
    if (overdueRecords.length === 0) { toast.info("No pending/overdue records"); return; }
    
    const toastId = toast.loading(`Sending reminders to ${overdueRecords.length} renters...`);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bulk", month: filterMonth, year: filterYear })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Sent ${data.count} reminders successfully!`, { id: toastId });
        fetchData();
      } else {
        toast.error(data.error || "Failed to send", { id: toastId });
      }
    } catch {
      toast.error("Failed to send reminders", { id: toastId });
    }
  }

  async function sendSingleReminder(id: string) {
    const toastId = toast.loading("Sending gentle reminder...");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "single", rentRecordId: id })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Reminder sent via WhatsApp!", { id: toastId });
        fetchData();
      } else {
        toast.error(data.error || "Failed to send", { id: toastId });
      }
    } catch {
      toast.error("Error connecting to server", { id: toastId });
    }
  }

  return (
    <AppLayout role="ADMIN" title="Rent Tracker" subtitle={`${getMonthName(filterMonth)} ${filterYear} — Rent Collection`}>
      {/* Filters + Add button */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <select className="form-input" style={{ width: "auto" }} value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))}>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto" }} value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}>
          {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <select className="form-input" style={{ width: "auto" }} value={filterTower} onChange={(e) => setFilterTower(e.target.value)}>
          <option value="all">All Towers</option>
          {Array.from(new Set(tenants.map(t => t.room.tower.name))).sort().map(tower => (
            <option key={tower} value={tower}>{tower}</option>
          ))}
        </select>
        <div className="search-bar" style={{ flex: 1, minWidth: "200px" }}>
          <Search size={14} color="rgba(226,232,240,0.4)" />
          <input placeholder="Search renter or room..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={sendBulkReminders} className="btn-ghost">
          <Send size={16} />
          Remind All
        </button>
        <button className="btn-primary" onClick={() => setEntryModal({ open: true })}>
          <Plus size={18} />
          Add Entry
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Expected", value: formatCurrency(totalExpected), color: "#8b5cf6", icon: IndianRupee },
          { label: "Collected", value: formatCurrency(totalReceived), color: "#10b981", icon: CheckCircle },
          { label: "Pending", value: formatCurrency(totalExpected - totalReceived), color: "#f59e0b", icon: Clock },
          { label: "Paid", value: `${paid} renters`, color: "#10b981", icon: CheckCircle },
          { label: "Overdue", value: `${overdue} renters`, color: "#ef4444", icon: AlertTriangle },
          { label: "Pending", value: `${pending} renters`, color: "#f59e0b", icon: Clock },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
            </div>
            <p style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Rent records table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="shimmer" style={{ height: "72px", borderRadius: "12px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-card"
          style={{ padding: "60px", textAlign: "center" }}
        >
          <Calendar size={40} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>No rent records for {getMonthName(filterMonth)} {filterYear}</h3>
          <p style={{ color: "rgba(226,232,240,0.4)", marginBottom: "20px", fontSize: "13px" }}>
            {tenants.length > 0 ? "Add rent entries for your renters" : "Add renters first"}
          </p>
          {tenants.length > 0 && (
            <button className="btn-primary" onClick={() => setEntryModal({ open: true })}>
              <Plus size={16} /> Add Rent Entry
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Renter</th>
                  <th>Room</th>
                  <th>Rent</th>
                  <th>Electricity</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const balance = record.totalAmount - record.amountPaid;
                  return (
                    <tr key={record.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", background: "var(--gradient-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", color: "white", flexShrink: 0, overflow: "hidden" }}>
                            {record.tenant.photoUrl ? (
                              <img src={record.tenant.photoUrl} alt={record.tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              record.tenant.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "13px" }}>{record.tenant.name}</p>
                            <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>{record.tenant.room.tower.name}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>Room {record.tenant.room.number}</td>
                      <td>{formatCurrency(record.rentAmount)}</td>
                       <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {formatCurrency(record.electricityBill)}
                          {record.meterPhotoUrl && (
                            <button
                              onClick={() => setActivePhotoUrl(record.meterPhotoUrl || null)}
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
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(record.totalAmount)}</td>
                      <td style={{ color: "#10b981", fontWeight: 600 }}>{formatCurrency(record.amountPaid)}</td>
                      <td>
                        <span className={`badge ${getRentStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                        {record.payments && (record.payments as any[]).some((p: any) => p.status === "PENDING") && (
                          <a
                            href="/admin/payments"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "10px",
                              color: "#f59e0b",
                              background: "rgba(245,158,11,0.15)",
                              border: "1px solid rgba(245,158,11,0.35)",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              marginTop: "4px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                            title="Payment screenshot uploaded! Click to review in Admin Payments Desk"
                          >
                            ⏳ Review Proof
                          </a>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => setStatusModal({ open: true, record })}
                            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", color: "#a78bfa", fontSize: "11px", fontWeight: 600 }}
                          >
                            Update
                          </button>
                          {(record.status === "OVERDUE" || record.status === "PENDING") && (
                            <button
                              onClick={() => sendSingleReminder(record.id)}
                              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "#f59e0b", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle size={12} /> Remind
                            </button>
                          )}
                          <a
                            href={typeof window !== 'undefined' ? (() => {
                              const clean = (record.tenant.whatsapp || "").replace(/\D/g, "");
                              const formatted = clean.length === 10 ? `91${clean}` : clean;
                              
                              let breakdown = `🏠 *Rent*: ₹${record.rentAmount}\n`;
                              if (record.electricityBill > 0) breakdown += `⚡ *Electricity Bill*: ₹${record.electricityBill}\n`;
                              if (record.maintenanceCharge > 0) breakdown += `🔧 *Maintenance*: ₹${record.maintenanceCharge}\n`;
                              if (record.lateFee > 0) breakdown += `⏳ *Late Fee*: ₹${record.lateFee}\n`;
                              if (record.discount > 0) breakdown += `🎁 *Discount*: -₹${record.discount}\n`;

                              return `https://wa.me/${formatted}?text=${encodeURIComponent(`🏢 *ATUL RESIDENCY* 🏢\n\n👤 Dear *${record.tenant.name}*,\n\nHere is your detailed rent invoice for *${getMonthName(record.month)} ${record.year}*.\n\n${breakdown}-------------------------------\n💰 *Total Due*: ₹${balance.toLocaleString('en-IN')}\n-------------------------------\n\n⚠️ *Please Pay on time!* ⚠️\n\n📄 *View & Download PDF Invoice*:\n${invoiceBaseUrl}/api/rent/${record.id}/invoice\n\n💳 *Please pay via UPI*: atultiwari123321@oksbi\n\n💡 *Tip*: If the link is not clickable, please reply with "Ok" or save this contact.\n\n🙏 Thank you!`)}`;
                            })() : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", color: "#25d366", fontSize: "11px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                            title="Send WhatsApp Invoice"
                          >
                            <FileText size={12} /> Invoice
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {entryModal.open && (
        <EntryModal
          tenants={tenants}
          initialTenantId={entryModal.tenantId}
          onClose={() => setEntryModal({ open: false })}
          onSave={fetchData}
        />
      )}

      {statusModal.open && statusModal.record && (
        <StatusUpdateModal
          record={statusModal.record}
          onClose={() => setStatusModal({ open: false })}
          onSave={fetchData}
          invoiceBaseUrl={invoiceBaseUrl}
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
