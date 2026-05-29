"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { User, Phone, Mail, Shield, Save, Key, Loader2, Building, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

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
  const [newTower, setNewTower] = useState({
    name: "",
    description: "",
  });
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [fetchingWhatsapp, setFetchingWhatsapp] = useState(false);
  const [resettingBot, setResettingBot] = useState<string | null>(null);
  const [pairingPhones, setPairingPhones] = useState({ bot1: "", bot2: "" });
  const [pairingCodes, setPairingCodes] = useState({ bot1: "", bot2: "" });
  const [requestingCode, setRequestingCode] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfileForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
      });

      // Load UPI configs from backend API
      try {
        const upiRes = await fetch("/api/upi");
        if (upiRes.ok) {
          const upiData = await upiRes.json();
          if (upiData.upiId && upiData.upiName) {
            setUpiForm({ upiId: upiData.upiId, upiName: upiData.upiName });
          }
        }
      } catch {
        const savedUpiId = localStorage.getItem("landlord_upi_id");
        const savedUpiName = localStorage.getItem("landlord_upi_name");
        if (savedUpiId && savedUpiName) {
          setUpiForm({ upiId: savedUpiId, upiName: savedUpiName });
        }
      }
    } catch {
      toast.error("Failed to load settings details");
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsappStatus = async () => {
    setFetchingWhatsapp(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus({
          bot1: data.bot1 || { isReady: false },
          bot2: data.bot2 || { isReady: false },
        });
      }
    } catch (e) {
      console.error("Failed to fetch WhatsApp status", e);
    } finally {
      setFetchingWhatsapp(false);
    }
  };

  const handleResetWhatsapp = async (bot: "bot1" | "bot2") => {
    if (!confirm(`Are you sure you want to disconnect and reset ${bot === 'bot1' ? 'Bot 1' : 'Bot 2'}? This will delete the session and require scanning the QR code again.`)) {
      return;
    }
    setResettingBot(bot);
    try {
      const res = await fetch("/api/whatsapp/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${bot === 'bot1' ? 'Bot 1' : 'Bot 2'} session reset successfully! 🎉`);
        setPairingCodes(prev => ({ ...prev, [bot]: "" }));
        fetchWhatsappStatus();
      } else {
        toast.error(data.error || "Failed to reset session");
      }
    } catch {
      toast.error("Failed to reset session");
    } finally {
      setResettingBot(null);
    }
  };

  const handleRequestPairingCode = async (bot: "bot1" | "bot2") => {
    const phone = bot === "bot1" ? pairingPhones.bot1 : pairingPhones.bot2;
    if (!phone) {
      toast.error("Please enter a phone number to link.");
      return;
    }
    setRequestingCode(bot);
    try {
      const res = await fetch("/api/whatsapp/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setPairingCodes(prev => ({
          ...prev,
          [bot]: data.code
        }));
        toast.success("Pairing code generated! 🎉");
      } else {
        toast.error(data.error || "Failed to request pairing code");
      }
    } catch {
      toast.error("Failed to request pairing code");
    } finally {
      setRequestingCode(null);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhatsappStatus();
  }, []);

  useEffect(() => {
    if (profileForm.phone) {
      setPairingPhones(prev => ({
        ...prev,
        bot1: profileForm.phone
      }));
    }
  }, [profileForm.phone]);

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
        toast.success("Admin profile updated successfully! 🎉");
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
        toast.success("Password updated successfully! 🔑");
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
      toast.success("UPI Configuration saved on server! 💳");
    } catch {
      toast.error("Failed to save UPI config on server");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddTower(e: React.FormEvent) {
    e.preventDefault();
    if (!newTower.name) {
      toast.error("Tower Name is required");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("/api/towers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTower),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add tower");
      } else {
        toast.success("Tower added successfully! 🏢");
        setNewTower({ name: "", description: "" });
      }
    } catch {
      toast.error("Failed to add tower");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AppLayout role="ADMIN" title="Settings" subtitle="Configure application preferences and credentials">
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flexWrap: "wrap" }}>
          
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

          {/* Box 4: Fast Tower Creation */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{
                width: "40px", height: "40px", background: "rgba(229,9,20,0.1)",
                border: "1px solid rgba(229,9,20,0.25)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Building size={20} color="#ff3333" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Add Tower</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Add a new Tower block to the residency (e.g. Tower C/D)</p>
              </div>
            </div>

            <form onSubmit={handleAddTower} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Tower Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Tower A" value={newTower.name} onChange={(e) => setNewTower({ ...newTower, name: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="Description of block..." value={newTower.description} onChange={(e) => setNewTower({ ...newTower, description: e.target.value })} />
              </div>

              <button type="submit" className="btn-primary" disabled={updating} style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Tower
              </button>
            </form>
          </div>

          {/* Box 5: WhatsApp Bot Status */}
          <div className="glass-card" style={{ padding: "28px", gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px", height: "40px", background: "rgba(37,211,102,0.1)",
                  border: "1px solid rgba(37,211,102,0.25)", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.022 14.12 1.001 11.905 1c-5.441 0-9.866 4.372-9.87 9.802 0 1.814.504 3.59 1.46 5.184l-.944 3.45 3.58-.934zM16.71 13.9c-.3-.15-1.782-.88-2.03-.97-.25-.09-.43-.13-.62.15-.19.28-.73.91-.89 1.09-.16.18-.33.2-.63.05-.3-.15-1.265-.47-2.41-1.485-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.62-1.5-.85-2.05-.23-.55-.47-.48-.62-.48-.15 0-.33-.02-.51-.02-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.62 1.11 2.8c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.45 1.56.57.66.21 1.26.18 1.73.11.53-.08 1.782-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.08-.13-.28-.21-.58-.36z"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>WhatsApp Bots Integration</h3>
                  <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Manage your dual-bot WhatsApp connections for automated reminders and invoices</p>
                </div>
              </div>

              <button 
                onClick={fetchWhatsappStatus} 
                className="btn-ghost" 
                disabled={fetchingWhatsapp}
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                {fetchingWhatsapp ? <Loader2 size={14} className="animate-spin" /> : "Refresh Status"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Bot 1 */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ fontWeight: 700, fontSize: "14px" }}>Bot 1 (Primary Admin)</h4>
                    <span className={`badge ${whatsappStatus?.bot1?.isReady ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`} style={{ border: "1px solid", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                      {whatsappStatus?.bot1?.isReady ? "Connected" : "Waiting for scan"}
                    </span>
                  </div>

                  {whatsappStatus?.bot1?.isReady ? (
                    <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.7)", lineHeight: "1.6" }}>
                      <p>👤 <strong>Logged in as:</strong> {whatsappStatus.bot1.pushname || "Admin 1"}</p>
                      <p>📞 <strong>Phone:</strong> +{whatsappStatus.bot1.phone}</p>
                      <p style={{ marginTop: "10px", color: "#10b981", fontSize: "12px" }}>✓ Primary bot is active and ready to send reminders.</p>
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.6)", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div>
                        <p style={{ color: "#f59e0b", fontWeight: 600, marginBottom: "4px" }}>⚠️ Offline / Disconnected</p>
                        <p style={{ color: "rgba(226, 232, 240, 0.4)", fontSize: "12px" }}>Please scan the QR code below or use a phone number pairing code to connect.</p>
                      </div>

                      {/* Direct QR display */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontWeight: 600, color: "#a78bfa" }}>Link via QR Code:</p>
                        {whatsappStatus?.bot1?.qrImage ? (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "16px",
                            background: "#ffffff",
                            borderRadius: "14px",
                            width: "fit-content",
                            alignSelf: "center",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                          }}>
                            <img 
                              src={whatsappStatus.bot1.qrImage} 
                              alt="Bot 1 QR Code" 
                              style={{ width: "180px", height: "180px" }}
                            />
                            <p style={{ fontSize: "11px", color: "#1e293b", marginTop: "8px", fontWeight: 700 }}>Scan with WhatsApp on your phone</p>
                          </div>
                        ) : (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "20px",
                            background: "rgba(255,255,255,0.01)",
                            border: "1px dashed rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            minHeight: "150px"
                          }}>
                            <Loader2 size={24} className="animate-spin text-amber-500" style={{ animationDuration: '2s' }} />
                            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "10px", textAlign: "center" }}>Waiting for WhatsApp QR from server...</p>
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.1)", paddingTop: "14px" }}>
                        <p style={{ fontWeight: 600, color: "#a78bfa", marginBottom: "8px" }}>Or link with Phone Number Pairing Code:</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                            placeholder="e.g. 7388389944" 
                            value={pairingPhones.bot1} 
                            onChange={(e) => setPairingPhones({ ...pairingPhones, bot1: e.target.value })}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRequestPairingCode("bot1")}
                            disabled={requestingCode === "bot1"}
                            className="btn-primary" 
                            style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}
                          >
                            {requestingCode === "bot1" ? <Loader2 size={12} className="animate-spin" /> : "Get Code"}
                          </button>
                        </div>
                        {pairingCodes.bot1 && (
                          <div style={{ marginTop: "12px", padding: "10px", background: "rgba(37, 211, 102, 0.08)", border: "1px solid rgba(37, 211, 102, 0.25)", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "11px", color: "rgba(226, 232, 240, 0.6)", marginBottom: "4px" }}>Enter this code on WhatsApp on your phone:</p>
                            <p style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "2px", color: "#25d366", fontFamily: "monospace" }}>{pairingCodes.bot1}</p>
                            <p style={{ fontSize: "10px", color: "rgba(226, 232, 240, 0.4)", marginTop: "4px" }}>Settings → Linked Devices → Link with Phone Number</p>
                          </div>
                        )}
                      </div>

                      <div style={{ background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "10px", padding: "10px 12px" }}>
                        <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", lineHeight: "1.4" }}>
                          💡 <strong>Scanner Trouble?</strong> If QR scanning fails or shows "Failed to scan", click the "Disconnect & Reset" button below to reset the bot state, then try again or use the Pairing Code.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleResetWhatsapp("bot1")}
                    disabled={resettingBot === "bot1"}
                    className="btn-ghost"
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444",
                    }}
                  >
                    {resettingBot === "bot1" ? <Loader2 size={12} className="animate-spin" /> : "Disconnect & Reset"}
                  </button>
                </div>
              </div>

              {/* Bot 2 */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ fontWeight: 700, fontSize: "14px" }}>Bot 2 (Secondary Admin)</h4>
                    <span className={`badge ${whatsappStatus?.bot2?.isReady ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`} style={{ border: "1px solid", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                      {whatsappStatus?.bot2?.isReady ? "Connected" : "Waiting for scan"}
                    </span>
                  </div>

                  {whatsappStatus?.bot2?.isReady ? (
                    <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.7)", lineHeight: "1.6" }}>
                      <p>👤 <strong>Logged in as:</strong> {whatsappStatus.bot2.pushname || "Admin 2"}</p>
                      <p>📞 <strong>Phone:</strong> +{whatsappStatus.bot2.phone}</p>
                      <p style={{ marginTop: "10px", color: "#10b981", fontSize: "12px" }}>✓ Secondary bot is active and ready to send reminders.</p>
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "rgba(226, 232, 240, 0.6)", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div>
                        <p style={{ color: "#f59e0b", fontWeight: 600, marginBottom: "4px" }}>⚠️ Offline / Disconnected</p>
                        <p style={{ color: "rgba(226, 232, 240, 0.4)", fontSize: "12px" }}>Please scan the QR code below or use a phone number pairing code to connect.</p>
                      </div>

                      {/* Direct QR display */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontWeight: 600, color: "#a78bfa" }}>Link via QR Code:</p>
                        {whatsappStatus?.bot2?.qrImage ? (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "16px",
                            background: "#ffffff",
                            borderRadius: "14px",
                            width: "fit-content",
                            alignSelf: "center",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                          }}>
                            <img 
                              src={whatsappStatus.bot2.qrImage} 
                              alt="Bot 2 QR Code" 
                              style={{ width: "180px", height: "180px" }}
                            />
                            <p style={{ fontSize: "11px", color: "#1e293b", marginTop: "8px", fontWeight: 700 }}>Scan with WhatsApp on your phone</p>
                          </div>
                        ) : (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "20px",
                            background: "rgba(255,255,255,0.01)",
                            border: "1px dashed rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            minHeight: "150px"
                          }}>
                            <Loader2 size={24} className="animate-spin text-amber-500" style={{ animationDuration: '2s' }} />
                            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "10px", textAlign: "center" }}>Waiting for WhatsApp QR from server...</p>
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.1)", paddingTop: "14px" }}>
                        <p style={{ fontWeight: 600, color: "#a78bfa", marginBottom: "8px" }}>Or link with Phone Number Pairing Code:</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                            placeholder="e.g. 6388888888" 
                            value={pairingPhones.bot2} 
                            onChange={(e) => setPairingPhones({ ...pairingPhones, bot2: e.target.value })}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRequestPairingCode("bot2")}
                            disabled={requestingCode === "bot2"}
                            className="btn-primary" 
                            style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}
                          >
                            {requestingCode === "bot2" ? <Loader2 size={12} className="animate-spin" /> : "Get Code"}
                          </button>
                        </div>
                        {pairingCodes.bot2 && (
                          <div style={{ marginTop: "12px", padding: "10px", background: "rgba(37, 211, 102, 0.08)", border: "1px solid rgba(37, 211, 102, 0.25)", borderRadius: "8px", textAlign: "center" }}>
                            <p style={{ fontSize: "11px", color: "rgba(226, 232, 240, 0.6)", marginBottom: "4px" }}>Enter this code on WhatsApp on your phone:</p>
                            <p style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "2px", color: "#25d366", fontFamily: "monospace" }}>{pairingCodes.bot2}</p>
                            <p style={{ fontSize: "10px", color: "rgba(226, 232, 240, 0.4)", marginTop: "4px" }}>Settings → Linked Devices → Link with Phone Number</p>
                          </div>
                        )}
                      </div>

                      <div style={{ background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "10px", padding: "10px 12px" }}>
                        <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", lineHeight: "1.4" }}>
                          💡 <strong>Scanner Trouble?</strong> If QR scanning fails or shows "Failed to scan", click the "Disconnect & Reset" button below to reset the bot state, then try again or use the Pairing Code.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleResetWhatsapp("bot2")}
                    disabled={resettingBot === "bot2"}
                    className="btn-ghost"
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444",
                    }}
                  >
                    {resettingBot === "bot2" ? <Loader2 size={12} className="animate-spin" /> : "Disconnect & Reset"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
