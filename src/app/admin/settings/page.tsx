"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { User, Phone, Mail, Shield, Save, Key, Loader2, CreditCard, Sliders, Database, RefreshCw, QrCode, AlertCircle, WifiOff, Copy, Trash2, CheckCircle2 } from "lucide-react";
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
  const [activeBotTab, setActiveBotTab] = useState<"qr" | "pair">("qr");

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    toast.success("Pairing code copied to clipboard!");
  };

  const fetchWhatsappStatus = async () => {
    setFetchingWhatsapp(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      // Always safe-parse - status route now returns valid JSON even when bot is offline
      const data = await res.json().catch(() => ({}));
      setWhatsappStatus(data);
    } catch (e) {
      // Network error - bot server is unreachable
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
        toast.success("Bot reset! Fresh QR will appear in 15-30 seconds.");
        // Start polling for new QR
        let attempts = 0;
        const poll = setInterval(async () => { attempts++; await fetchWhatsappStatus(); if (attempts >= 20) clearInterval(poll); }, 3000);
      } else {
        toast.error(data.error || "Failed to reset bot");
      }
    } catch {
      toast.error("Network error - could not reach bot server");
    } finally {
      setResettingBot(false);
    }
  };

  const handleGetCode = async () => {
    if (!pairingPhone.trim()) { toast.error("Enter your WhatsApp phone number first"); return; }
    setRequestingCode(true);
    setPairingCode("");
    toast.info("⏳ Contacting WhatsApp... may take up to 40 seconds", { duration: 45000, id: "pair-toast" });
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
        toast.success("✅ Code ready! Open WhatsApp → Settings → Linked Devices → Link with Phone Number", { duration: 12000 });
      } else {
        toast.error(data.error || "Failed to get pairing code", { duration: 8000 });
      }
    } catch {
      toast.dismiss("pair-toast");
      toast.error("Network error - could not reach bot server");
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
      toast.success("Billing preferences saved successfully! ⚙️");
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
                <input type="password" className="form-input" placeholder="••••••••" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" placeholder="••••••••" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
              </div>

              <div>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" placeholder="••••••••" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
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
                  <label className="form-label">Default Maintenance (₹)</label>
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
                  <label className="form-label">Electricity Unit Rate (₹)</label>
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
                  <label className="form-label">Daily Late Fee (₹)</label>
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
          <div className="glass-card" style={{ padding: "32px", gridColumn: "span 2", position: "relative", overflow: "hidden" }}>
            
            {/* Top glowing ambient effect */}
            <div style={{
              position: "absolute",
              top: "-50px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "300px",
              height: "100px",
              background: whatsappStatus?.isReady 
                ? "radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0
            }} />

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "28px", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  background: whatsappStatus?.isReady ? "rgba(52,211,153,0.1)" : "rgba(20,184,166,0.1)", 
                  border: whatsappStatus?.isReady ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(20,184,166,0.25)", 
                  borderRadius: "14px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.3)"
                }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill={whatsappStatus?.isReady ? "#34d399" : "#14B8A6"} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.022 14.12 1.001 11.905 1c-5.441 0-9.866 4.372-9.87 9.802 0 1.814.504 3.59 1.46 5.184l-.944 3.45 3.58-.934zM16.71 13.9c-.3-.15-1.782-.88-2.03-.97-.25-.09-.43-.13-.62.15-.19.28-.73.91-.89 1.09-.16.18-.33.2-.63.05-.3-.15-1.265-.47-2.41-1.485-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.62-1.5-.85-2.05-.23-.55-.47-.48-.62-.48-.15 0-.33-.02-.51-.02-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.62 1.11 2.8c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.45 1.56.57.66.21 1.26.18 1.73.11.53-.08 1.782-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.08-.13-.28-.21-.58-.36z"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>WhatsApp Bot Integration</h3>
                  <p style={{ fontSize: "12.5px", color: "rgba(226,232,240,0.5)" }}>Automate notifications, billing invoices, and payment receipts</p>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px", 
                  padding: "5px 12px", 
                  borderRadius: "8px", 
                  fontSize: "12px", 
                  fontWeight: 700, 
                  border: "1px solid",
                  transition: "all 0.3s ease",
                  ...(whatsappStatus?.isReady
                    ? { color: "#34D399", background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.2)" }
                    : { color: "#F59E0B", background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" })
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: whatsappStatus?.isReady ? "#10B981" : "#F59E0B",
                    boxShadow: whatsappStatus?.isReady ? "0 0 10px #10B981" : "0 0 10px #F59E0B",
                    display: "inline-block",
                    animation: whatsappStatus?.isReady ? "none" : "pulse 2s infinite"
                  }} />
                  {whatsappStatus?.isReady ? "Active" : "Disconnected"}
                </div>
                
                <button 
                  onClick={fetchWhatsappStatus} 
                  disabled={fetchingWhatsapp} 
                  className="btn-ghost" 
                  style={{ 
                    padding: "8px 14px", 
                    fontSize: "12.5px", 
                    background: "rgba(20,184,166,0.06)", 
                    border: "1px solid rgba(20,184,166,0.15)",
                    borderRadius: "8px",
                    color: "var(--color-accent-purple)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600
                  }}
                >
                  {fetchingWhatsapp ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Refresh
                </button>
              </div>
            </div>

            {/* Offline Alert Banner */}
            {(!whatsappStatus || !whatsappStatus.initialized) && (
              <div style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(220,38,38,0.03) 100%)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "28px",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
                position: "relative",
                zIndex: 1
              }}>
                <div style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  padding: "8px",
                  borderRadius: "8px",
                  color: "#ef4444",
                  display: "flex"
                }}>
                  <AlertCircle size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 700, fontSize: "14px", color: "#f87171", marginBottom: "4px" }}>Local Bot Server is Offline</h4>
                  <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.65)", lineHeight: "1.5" }}>
                    The backend service that runs the WhatsApp Web instance is currently not running on your host computer. 
                    To connect your device, please open a command window on your PC, navigate to the folder, and run:
                  </p>
                  <code style={{ 
                    display: "block", 
                    background: "rgba(0,0,0,0.35)", 
                    padding: "8px 12px", 
                    borderRadius: "6px", 
                    fontFamily: "monospace", 
                    fontSize: "12.5px", 
                    color: "#a78bfa", 
                    marginTop: "8px",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    pm2 start ecosystem.config.js
                  </code>
                  <p style={{ fontSize: "11.5px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
                    Alternatively, double-click the <code>start-bot.bat</code> file inside the project directory.
                  </p>
                </div>
              </div>
            )}

            {whatsappStatus?.isReady ? (
              /* ── CONNECTED STATE ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", zIndex: 1 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "20px", 
                  padding: "20px 24px", 
                  background: "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(16,185,129,0.02) 100%)", 
                  border: "1px solid rgba(52,211,153,0.18)", 
                  borderRadius: "14px",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)"
                }}>
                  <div style={{ 
                    width: "52px", 
                    height: "52px", 
                    background: "rgba(52,211,153,0.15)", 
                    border: "1px solid rgba(52,211,153,0.3)",
                    borderRadius: "50%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "24px",
                    boxShadow: "0 0 15px rgba(52,211,153,0.2)"
                  }}>
                    ✅
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "15px", color: "#34d399", fontFamily: "var(--font-display)" }}>Your WhatsApp account is successfully connected!</p>
                    <p style={{ fontSize: "13.5px", color: "rgba(226,232,240,0.75)", marginTop: "2px" }}>
                      📱 Logged in as <strong style={{ color: "#fff" }}>{whatsappStatus.pushname || "Administrator"}</strong> (+{whatsappStatus.phone || "—"})
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.45)", marginTop: "4px" }}>
                      Automated tenant notifications, rent invoices, and payment receipts will be dispatched from this number.
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={handleResetBot} 
                    disabled={resettingBot} 
                    className="btn-ghost" 
                    style={{ 
                      fontSize: "12.5px", 
                      padding: "8px 16px", 
                      background: "rgba(239,68,68,0.06)", 
                      border: "1px solid rgba(239,68,68,0.18)", 
                      color: "#ef4444",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {resettingBot ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Disconnect &amp; Reset Bot
                  </button>
                </div>
              </div>
            ) : (
              /* ── DISCONNECTED STATE WITH PREMIUM TABS ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative", zIndex: 1 }}>
                
                {/* Custom Tab Switcher */}
                <div style={{ 
                  display: "flex", 
                  background: "rgba(0,0,0,0.25)", 
                  padding: "4px", 
                  borderRadius: "10px", 
                  border: "1px solid rgba(255,255,255,0.05)",
                  width: "fit-content"
                }}>
                  <button 
                    onClick={() => setActiveBotTab("qr")}
                    style={{
                      padding: "8px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "7px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)",
                      ...(activeBotTab === "qr"
                        ? { background: "var(--gradient-primary)", color: "#000", boxShadow: "0 4px 12px rgba(20,184,166,0.3)" }
                        : { background: "transparent", color: "rgba(226,232,240,0.55)" })
                    }}
                  >
                    <QrCode size={14} />
                    Option 1: Scan QR Code
                  </button>
                  <button 
                    onClick={() => setActiveBotTab("pair")}
                    style={{
                      padding: "8px 18px",
                      fontSize: "13px",
                      fontWeight: 600,
                      borderRadius: "7px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)",
                      ...(activeBotTab === "pair"
                        ? { background: "var(--gradient-primary)", color: "#000", boxShadow: "0 4px 12px rgba(20,184,166,0.3)" }
                        : { background: "transparent", color: "rgba(226,232,240,0.55)" })
                    }}
                  >
                    <Key size={14} />
                    Option 2: Pairing Code
                  </button>
                </div>

                {/* Tab Contents */}
                <div style={{ minHeight: "240px" }}>
                  {activeBotTab === "qr" ? (
                    /* Tab 1: QR Code */
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                      <div style={{ maxWidth: "450px", textAlign: "center", marginBottom: "10px" }}>
                        <p style={{ fontSize: "13.5px", color: "rgba(226,232,240,0.7)" }}>
                          Link your device by scanning the QR code below. Open WhatsApp on your phone, go to <strong>Linked Devices</strong>, tap <strong>Link a Device</strong>, and point your camera here.
                        </p>
                      </div>

                      {whatsappStatus?.qrImage ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                          <div style={{ 
                            background: "#fff", 
                            padding: "16px", 
                            borderRadius: "16px", 
                            boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.25)",
                            position: "relative"
                          }}>
                            <img src={whatsappStatus.qrImage} alt="WhatsApp QR" style={{ width: 180, height: 180, display: "block" }} />
                          </div>
                          <span style={{ 
                            fontSize: "11.5px", 
                            color: "rgba(20,184,166,0.8)", 
                            background: "rgba(20,184,166,0.06)",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid rgba(20,184,166,0.15)",
                            fontWeight: 600
                          }}>
                            QR Code loaded. Awaiting scan...
                          </span>
                        </div>
                      ) : (
                        <div style={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          width: "212px",
                          height: "212px", 
                          background: "rgba(255,255,255,0.01)", 
                          border: "1.5px dashed rgba(20,184,166,0.25)", 
                          borderRadius: "16px", 
                          gap: "12px",
                          boxShadow: "inset 0 4px 20px rgba(0,0,0,0.2)"
                        }}>
                          {whatsappStatus?.initialized ? (
                            <>
                              <Loader2 size={32} className="animate-spin" style={{ color: "#f59e0b" }} />
                              <p style={{ fontSize: "12.5px", color: "rgba(226,232,240,0.5)", textAlign: "center", padding: "0 10px" }}>
                                Bot is starting up...<br/>Generating QR code
                              </p>
                            </>
                          ) : (
                            <>
                              <WifiOff size={32} style={{ color: "rgba(226,232,240,0.2)" }} />
                              <p style={{ fontSize: "12.5px", color: "rgba(226,232,240,0.4)", textAlign: "center", padding: "0 15px" }}>
                                Awaiting bot server connection
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Tab 2: Pairing Code */
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                      <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        <h4 style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Link via Phone Number Pairing</h4>
                        <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.6)", lineHeight: "1.5" }}>
                          If scanning the QR code is difficult, you can link your WhatsApp account by generating an 8-character verification code:
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label className="form-label">WhatsApp Mobile Number</label>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <input
                              type="tel"
                              className="form-input"
                              placeholder="e.g. 6392651108"
                              value={pairingPhone}
                              onChange={(e) => setPairingPhone(e.target.value)}
                              style={{ 
                                fontSize: "14px", 
                                padding: "10px 14px",
                                border: "1px solid rgba(20,184,166,0.2)",
                                transition: "all 0.3s ease"
                              }}
                            />
                            <button
                              onClick={handleGetCode}
                              disabled={requestingCode}
                              className="btn-primary"
                              style={{ 
                                flexShrink: 0, 
                                minWidth: "120px", 
                                fontSize: "13.5px", 
                                fontWeight: 700,
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                gap: "6px",
                                cursor: "pointer"
                              }}
                            >
                              {requestingCode ? <><Loader2 size={13} className="animate-spin" /> Fetching...</> : "Get Code"}
                            </button>
                          </div>
                        </div>

                        <div style={{ 
                          padding: "12px 14px", 
                          background: "rgba(20,184,166,0.03)", 
                          border: "1px solid rgba(20,184,166,0.12)", 
                          borderRadius: "10px", 
                          fontSize: "12px", 
                          color: "rgba(226,232,240,0.45)", 
                          lineHeight: "1.6" 
                        }}>
                          💡 <strong>How to link:</strong> Open WhatsApp on your phone → Settings → Linked Devices → Link with Phone Number → Enter the code.
                        </div>
                      </div>

                      <div style={{ 
                        flex: "1 1 250px", 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center", 
                        justifyContent: "center",
                        minHeight: "180px",
                        background: "rgba(0,0,0,0.15)",
                        border: "1px dashed rgba(255,255,255,0.06)",
                        borderRadius: "14px"
                      }}>
                        {pairingCode ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "20px" }}>
                            <p style={{ fontSize: "11px", color: "rgba(20,184,166,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Pairing Code Ready</p>
                            <div style={{ 
                              padding: "16px 28px", 
                              background: "rgba(20,184,166,0.08)", 
                              border: "2px solid #14B8A6", 
                              borderRadius: "12px", 
                              boxShadow: "0 0 25px rgba(20,184,166,0.25)"
                            }}>
                              <p style={{ 
                                fontSize: "32px", 
                                fontWeight: 900, 
                                letterSpacing: "6px", 
                                color: "#14B8A6", 
                                fontFamily: "monospace", 
                                margin: 0,
                                textShadow: "0 0 10px rgba(20,184,166,0.3)"
                              }}>{pairingCode}</p>
                            </div>
                            <button 
                              onClick={handleCopyCode}
                              style={{ 
                                background: "transparent", 
                                border: "none", 
                                color: "rgba(226,232,240,0.5)", 
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                marginTop: "4px"
                              }}
                              className="hover:text-white"
                            >
                              <Copy size={12} />
                              Copy Code
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "rgba(226,232,240,0.3)", padding: "20px", textAlign: "center" }}>
                            <Key size={28} />
                            <p style={{ fontSize: "12.5px" }}>Awaiting pairing request</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  borderTop: "1px solid rgba(255,255,255,0.05)", 
                  paddingTop: "18px",
                  marginTop: "10px"
                }}>
                  <p style={{ fontSize: "11.5px", color: "rgba(226,232,240,0.35)" }}>
                    Need help? If the QR code doesn't load or scan fails, click Disconnect &amp; Reset.
                  </p>
                  <button 
                    onClick={handleResetBot} 
                    disabled={resettingBot} 
                    className="btn-ghost" 
                    style={{ 
                      fontSize: "12px", 
                      padding: "8px 16px", 
                      background: "rgba(239,68,68,0.05)", 
                      border: "1px solid rgba(239,68,68,0.15)", 
                      color: "#ef4444",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {resettingBot ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Disconnect &amp; Reset Bot
                  </button>
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
                    <span>🛡️ Automated Protection</span>
                  </h4>
                  <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.7)", lineHeight: "1.6" }}>
                    <p>⏰ <strong>Daily Schedule:</strong> 2:00 AM & 2:00 PM IST (Local scheduler)</p>
                    <p>☁️ <strong>Cloud Cron Backup:</strong> Active (Daily at 3:00 AM UTC)</p>
                    <p>📧 <strong>Email Sync:</strong> Enabled (Backup sent to admin inbox)</p>
                    <p>📁 <strong>Retention:</strong> Last 30 backups kept automatically</p>
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
                    <span>📂 Soft-Deleted Records</span>
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
