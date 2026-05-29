"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { User, Phone, Mail, Shield, MessageCircle, Calendar, Home, Key, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ui/ImageUpload";

export default function TenantProfilePage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    alternatePhone: "",
    aadhaarNumber: "",
    photoUrl: "",
    aadhaarImageUrl: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/tenant/profile");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        whatsapp: data.tenant?.whatsapp || "",
        alternatePhone: data.tenant?.alternatePhone || "",
        aadhaarNumber: data.tenant?.aadhaarNumber || "",
        photoUrl: data.tenant?.photoUrl || "",
        aadhaarImageUrl: data.tenant?.aadhaarImageUrl || "",
      });
    } catch {
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
      } else {
        toast.success("Profile updated successfully! 🎉");
        await update();
        fetchProfile();
      }
    } catch {
      toast.error("Something went wrong");
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
      const res = await fetch("/api/tenant/profile", {
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
        toast.success("Password changed successfully! 🔑");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        await update();
      }
    } catch {
      toast.error("Failed to update password");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AppLayout role="TENANT" title="My Profile" subtitle="Manage your account & identity details">
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
          <div className="shimmer" style={{ height: "450px", borderRadius: "12px" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flexWrap: "wrap" }}>
          {/* Card 1: Details view & Update */}
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
                <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)" }}>Profile Details</h3>
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>View and update your personal details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">WhatsApp Number</label>
                  <input className="form-input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label">Alternate Phone</label>
                  <input className="form-input" value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Aadhaar Number</label>
                  <input className="form-input" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <ImageUpload
                  value={form.photoUrl}
                  onChange={(url) => setForm({ ...form, photoUrl: url })}
                  label="Profile Photo"
                  placeholder="Take a selfie or upload"
                />
                <ImageUpload
                  value={form.aadhaarImageUrl}
                  onChange={(url) => setForm({ ...form, aadhaarImageUrl: url })}
                  label="Aadhaar Card Image"
                  placeholder="Take photo or upload Aadhaar"
                />
              </div>

              {/* Readonly lease info */}
              <div style={{ marginTop: "16px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Rental Information
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Home size={14} color="#ff3333" />
                    <span>Room: <strong>{profile?.tenant?.room?.number || "N/A"}</strong> ({profile?.tenant?.room?.tower?.name || ""})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Calendar size={14} color="#ff3333" />
                    <span>Joined: <strong>{profile?.tenant?.joiningDate ? formatDate(profile.tenant.joiningDate) : "N/A"}</strong></span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={updating} style={{ marginTop: "8px", alignSelf: "flex-end" }}>
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </form>
          </div>

          {/* Card 2: Security & Password */}
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
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)" }}>Update your account security details</p>
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
        </div>
      )}
    </AppLayout>
  );
}
