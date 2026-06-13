"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { User, Phone, Mail, Shield, Save, Key, Loader2, CreditCard, Sliders, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AdminSettingsPage() {
  const { update } = useSession();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [upiForm, setUpiForm] = useState({
    upiId: "atultiwari123321@oksbi",
    upiName: "Atul Tiwari",
  });
  const [preferences, setPreferences] = useState({
    defaultMaintenance: "500",
    defaultElectricityRate: "8",
    defaultLateFee: "50",
    defaultDueDateDay: "10",
  });
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [fetchingWhatsapp, setFetchingWhatsapp] = useState(false);
  const [resettingBot, setResettingBot] = useState(false);
  const [pairingPhone, setPairingPhone] = useState("6392651108");
  const [pairingCode, setPairingCode] = useState("");
  const [requestingCode, setRequestingCode] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const fetchWhatsappStatus = async () => {
    setFetchingWhatsapp(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      // Always safe-parse â€” status route now returns valid JSON even when bot is offline
      const data = await res.json().catch(() => ({}));
      setWhatsappStatus(data);
    } catch (e) {
      // Network error â€” bot server is unreachable
      setWhatsappStatus({ isReady: false, initialized: false, qrImage: null, pairingCode: null });
    } finally {
      setFetchingWhatsapp(false);
    }
  };

  const handleResetBot = async () => {
    if (!confirm("This will disconnect the bot, wipe the session, and restart with a fresh QR code. Continue?")) return;
    setResettingBot(true);
    setPairingCode("");
    try {
      const res = await fetch("/api/whatsapp/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Bot reset! Fresh QR will appear in 15â€“30 seconds.");
        // Start polling for new QR
        let attempts = 0;
        const poll = setInterval(async () => { attempts++; await fetchWhatsappStatus(); if (attempts >= 20) clearInterval(poll); }, 3000);
      } else {
        toast.error(data.error || "Failed to reset bot");
      }
    } catch {
      toast.error("Network error â€” could not reach bot server");
    } finally {
      setResettingBot(false);
    }
  };

  const handleGetCode = async () => {
    if (!pairingPhone.trim()) { toast.error("Enter your WhatsApp phone number first"); return; }
    setRequestingCode(true);
    setPairingCode("");
    toast.info("â³ Contacting WhatsApp... may take up to 40 seconds", { duration: 45000, id: "pair-toast" });
    try {
      const res = await fetch("/api/whatsapp/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pairingPhone.trim() }),
      });
      const data = await res.json().catch(() => ({ error: "Bot server returned an invalid response" }));
      toast.dismiss("pair-toast");
      if (res.ok && data.code) {
        setPairingCode(data.code);
        toast.success("âœ… Code ready! Open WhatsApp â†’ Settings â†’ Linked Devices â†’ Link with Phone Number", { duration: 12000 });
      } else {
        toast.error(data.error || "Failed to get pairing code", { duration: 8000 });
      }
    } catch {
      toast.dismiss("pair-toast");
      toast.error("Network error â€” could not reach bot server");
    } finally {
      setRequestingCode(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfileForm({ name: data.name || "", email: data.email || "", phone: data.phone || "" });
      try {
        const upiRes = await fetch("/api/upi");
        if (upiRes.ok) {
          const upiData = await upiRes.json();
          if (upiData.upiId && upiData.upiName) setUpiForm({ upiId: upiData.upiId, upiName: upiData.upiName });
        }
      } catch {
        const savedUpiId = localStorage.getItem("landlord_upi_id");
        const savedUpiName = localStorage.getItem("landlord_upi_name");
        if (savedUpiId && savedUpiName) setUpiForm({ upiId: savedUpiId, upiName: savedUpiName });
      }
      const savedMaintenance = localStorage.getItem("default_maintenance_charge") || "500";
      const savedElectricity = localStorage.getItem("default_electricity_rate") || "8";
      const savedLateFee = localStorage.getItem("default_late_fee") || "50";
      const savedDueDate = localStorage.getItem("default_due_date_day") || "10";
      setPreferences({ defaultMaintenance: savedMaintenance, defaultElectricityRate: savedElectricity, defaultLateFee: savedLateFee, defaultDueDateDay: savedDueDate });
    } catch {
      toast.error("Failed to load settings details");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Database backup completed! ${data.totalRows} rows compiled and emailed. ðŸ’¾`);
      } else {
        toast.error(data.error || "Failed to trigger backup");
      }
    } catch {
      toast.error("Failed to trigger database backup");
    } finally {
      setBackingUp(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhatsappStatus();
    const interval = setInterval(fetchWhatsappStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
      } else {
        toast.success("Admin profile updated successfully! ðŸŽ‰");
        await update();
        fetchSettings();
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
      } else {
        toast.success("Password updated successfully! ðŸ”‘");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        await update();
      }
    } catch {
      toast.error("Failed to update password");
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveUpi(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upiForm),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem("landlord_upi_id", upiForm.upiId);
      localStorage.setItem("landlord_upi_name", upiForm.upiName);
      toast.success("UPI Configuration saved on server! ðŸ’³");
    } catch {
      toast.error("Failed to save UPI config on server");
    } finally {
      setUpdating(false);
    }
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      localStorage.setItem("default_maintenance_charge", preferences.defaultMaintenance);
      localStorage.setItem("default_electricity_rate", preferences.defaultElectricityRate);
      localStorage.setItem("default_late_fee", preferences.defaultLateFee);
      localStorage.setItem("default_due_date_day", preferences.defaultDueDateDay);
      toast.success("Billing preferences saved successfully! âš™ï¸");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AppLayout role="ADMIN" title="Settings" subtitle="Configure application preferences and credentials">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Box 1: Admin Details */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(229,9,20,0.1)",
                border: "1px solid rgba(229,9,20,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={20} color="#ff3333" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Owner Profile</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Manage your profile & WhatsApp contact information</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">WhatsApp Contact Number</label>
                <input className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} required />
              </div>

              <button type="submit" className="btn-primary" disabled={updating} style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Details
              </button>
            </form>
          </div>

          {/* Box 2: Password Management */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(229,9,20,0.1)",
                border: "1px solid rgba(229,9,20,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Key size={20} color="#ff3333" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Change Password</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Update your security configurations</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
              </div>

              <button type="submit" className="btn-primary" disabled={updating} style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                Update Password
              </button>
            </form>
          </div>

          {/* Box 3: Payment Configuration (UPI config) */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(229,9,20,0.1)",
                border: "1px solid rgba(229,9,20,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CreditCard size={20} color="#ff3333" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>UPI Configuration</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Set the UPI ID where renters send rent payments</p>
              </div>
            </div>

            <form onSubmit={handleSaveUpi} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">UPI ID *</label>
                <input className="form-input" placeholder="e.g. atultiwari@oksbi" value={upiForm.upiId} onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">UPI Display Name *</label>
                <input className="form-input" placeholder="e.g. Atul Tiwari" value={upiForm.upiName} onChange={(e) => setUpiForm({ ...upiForm, upiName: e.target.value })} required />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                <Save size={16} />
                Save UPI Config
              </button>
            </form>
          </div>

          {/* Box 4: Property & Billing Preferences */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(20,184,166,0.1)",
                border: "1px solid rgba(20,184,166,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sliders size={20} color="#14B8A6" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Billing Preferences</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Set default values for rent entries to save time</p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Default Maintenance (â‚¹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 500" 
                    value={preferences.defaultMaintenance} 
                    onChange={(e) => setPreferences({ ...preferences, defaultMaintenance: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Electricity Unit Rate (â‚¹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 8" 
                    value={preferences.defaultElectricityRate} 
                    onChange={(e) => setPreferences({ ...preferences, defaultElectricityRate: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Daily Late Fee (â‚¹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 50" 
                    value={preferences.defaultLateFee} 
                    onChange={(e) => setPreferences({ ...preferences, defaultLateFee: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Default Due Day (1-28)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 10" 
                    min="1" 
                    max="28" 
                    value={preferences.defaultDueDateDay} 
                    onChange={(e) => setPreferences({ ...preferences, defaultDueDateDay: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={updating} style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Preferences
              </button>
            </form>
          </div>

          {/* Box 5: WhatsApp Bot */}
          <div className="glass-card" style={{ padding: "28px", gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.022 14.12 1.001 11.905 1c-5.441 0-9.866 4.372-9.87 9.802 0 1.814.504 3.59 1.46 5.184l-.944 3.45 3.58-.934zM16.71 13.9c-.3-.15-1.782-.88-2.03-.97-.25-.09-.43-.13-.62.15-.19.28-.73.91-.89 1.09-.16.18-.33.2-.63.05-.3-.15-1.265-.47-2.41-1.485-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.62-1.5-.85-2.05-.23-.55-.47-.48-.62-.48-.15 0-.33-.02-.51-.02-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.62 1.11 2.8c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.45 1.56.57.66.21 1.26.18 1.73.11.53-.08 1.782-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.08-.13-.28-.21-.58-.36z"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>WhatsApp Bot</h3>
                  <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Connect your WhatsApp to send automated rent reminders and invoices</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, border: "1px solid",
                  ...(whatsappStatus?.isReady
                    ? { color: "#34d399", background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.25)" }
                    : { color: "#fbbf24", background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.25)" })
                }}>
                  {whatsappStatus?.isReady ? "â— Connected" : "â—‹ Disconnected"}
                </span>
                <button onClick={fetchWhatsappStatus} disabled={fetchingWhatsapp} className="btn-ghost" style={{ padding: "6px 10px", fontSize: "12px" }}>
                  {fetchingWhatsapp ? <Loader2 size={13} className="animate-spin" /> : "â†» Refresh"}
                </button>
              </div>
            </div>

            {whatsappStatus?.isReady ? (
              /* â”€â”€ CONNECTED STATE â”€â”€ */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "10px" }}>
                  <div style={{ width: "44px", height: "44px", background: "rgba(52,211,153,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>âœ…</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "14px", color: "#34d399" }}>Bot is connected and active!</p>
                    <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.7)" }}>ðŸ“± Logged in as <strong>{whatsappStatus.pushname || "Admin"}</strong> (+{whatsappStatus.phone || "â€”"})</p>
                    <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>Automated rent reminders are active. Messages are sent from this number.</p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleResetBot} disabled={resettingBot} className="btn-ghost" style={{ fontSize: "12px", padding: "7px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    {resettingBot ? <><Loader2 size={12} className="animate-spin" /> Resetting...</> : "âš ï¸ Disconnect &amp; Reset"}
                  </button>
                </div>
              </div>
            ) : (
              /* â”€â”€ DISCONNECTED STATE â”€â”€ */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                {/* Left: QR Code */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#a78bfa" }}>Option 1 â€” Scan QR Code</p>
                  {whatsappStatus?.qrImage ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <div style={{ background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        <img src={whatsappStatus.qrImage} alt="WhatsApp QR" style={{ width: 180, height: 180, display: "block" }} />
                      </div>
                      <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.45)", textAlign: "center" }}>Open WhatsApp â†’ Linked Devices â†’ Link a Device â†’ Scan this QR</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "200px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "12px", gap: "12px" }}>
                      {whatsappStatus?.initialized ? (
                        <>
                          <Loader2 size={28} className="animate-spin" style={{ color: "#f59e0b" }} />
                          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", textAlign: "center" }}>Bot is starting...<br/>QR code will appear shortly</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.4)", textAlign: "center" }}>Bot server is offline</p>
                          <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.3)", textAlign: "center" }}>Start the bot on your PC using PM2 or run the start script</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Pairing Code */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#a78bfa" }}>Option 2 â€” Phone Number Code</p>
                  <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>If the QR scan fails, enter your WhatsApp number and click Get Code. WhatsApp will send a 8-digit code to enter in the app.</p>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 6392651108"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      style={{ fontSize: "13px", padding: "8px 12px" }}
                    />
                    <button
                      onClick={handleGetCode}
                      disabled={requestingCode}
                      className="btn-primary"
                      style={{ flexShrink: 0, minWidth: "100px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {requestingCode ? <><Loader2 size={13} className="animate-spin" /> Waiting...</> : "Get Code"}
                    </button>
                  </div>

                  {pairingCode && (
                    <div style={{ padding: "14px", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.3)", borderRadius: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.55)", marginBottom: "6px" }}>Enter this code in WhatsApp:</p>
                      <p style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "4px", color: "#25d366", fontFamily: "monospace" }}>{pairingCode}</p>
                      <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", marginTop: "4px" }}>Settings â†’ Linked Devices â†’ Link with Phone Number</p>
                    </div>
                  )}

                  <div style={{ padding: "10px 12px", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "8px", fontSize: "11px", color: "rgba(226,232,240,0.45)", lineHeight: "1.6" }}>
                    ðŸ’¡ <strong>QR not scanning?</strong> Click <strong>"Disconnect &amp; Reset"</strong> below â†’ wait 20s â†’ try again.<br/>
                    ðŸ”‘ <strong>Code not arriving?</strong> Make sure the QR is visible first, then click Get Code.
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                    <button onClick={handleResetBot} disabled={resettingBot} className="btn-ghost" style={{ fontSize: "12px", padding: "7px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: "100%" }}>
                      {resettingBot ? <><Loader2 size={12} className="animate-spin" /> Resetting...</> : "âš ï¸ Disconnect &amp; Reset Bot"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Box 6: Database Backup & Security */}
          <div className="glass-card" style={{ padding: "28px", gridColumn: "span 2", marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(20,184,166,0.1)",
                border: "1px solid rgba(20,184,166,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Database size={20} color="#14B8A6" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Database Backup & Security</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Secure your tenancy records, rent history, and logs from data loss</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Side: Backup trigger and Info */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "180px"
              }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>ðŸ›¡ï¸ Automated Protection</span>
                  </h4>
                  <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.7)", lineHeight: "1.6" }}>
                    <p>â° <strong>Daily Schedule:</strong> 2:00 AM & 2:00 PM IST (Local scheduler)</p>
                    <p>â˜ï¸ <strong>Cloud Cron Backup:</strong> Active (Daily at 3:00 AM UTC)</p>
                    <p>ðŸ“§ <strong>Email Sync:</strong> Enabled (Backup sent to admin inbox)</p>
                    <p>ðŸ“‚ <strong>Retention:</strong> Last 30 backups kept automatically</p>
                  </div>
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleTriggerBackup}
                    disabled={backingUp}
                    className="btn-primary"
                    style={{ padding: "8px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    {backingUp ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Trigger Manual Backup
                  </button>
                </div>
              </div>

              {/* Right Side: Data recovery & soft-deleted list */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "180px"
              }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>ðŸ—„ï¸ Soft-Deleted Records</span>
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "rgba(226, 232, 240, 0.6)", lineHeight: "1.5" }}>
                    Renters you delete are automatically preserved in the archive for security and audit reasons. They can be restored to active rooms at any time.
                  </p>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <Link href="/admin/tenants" className="btn-ghost" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    background: "rgba(139, 92, 246, 0.08)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    color: "#a78bfa",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: 600
                  }}>
                    Go to Renters & Archive
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
