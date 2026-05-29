"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Wrench, Zap, Droplets, Hammer, Shield, HelpCircle, CheckCircle, Loader2, AlertTriangle, Phone } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ui/ImageUpload";

const categories = [
  { id: "PLUMBING", label: "Plumbing", icon: Droplets, color: "#3b82f6", emoji: "🔧" },
  { id: "ELECTRICIAN", label: "Electrician", icon: Zap, color: "#f59e0b", emoji: "⚡" },
  { id: "CARPENTER", label: "Carpenter", icon: Hammer, color: "#8b5cf6", emoji: "🪚" },
  { id: "CLEANING", label: "Cleaning", icon: Wrench, color: "#10b981", emoji: "🧹" },
  { id: "SECURITY", label: "Security", icon: Shield, color: "#ef4444", emoji: "🔒" },
  { id: "OTHER", label: "Other", icon: HelpCircle, color: "#6b7280", emoji: "🔨" },
];

export default function TenantMaintenancePage() {
  const { data: session } = useSession();
  const [profileLoading, setProfileLoading] = useState(true);
  const [dbTenantId, setDbTenantId] = useState<string | null>(null);

  const userId = (session?.user as any)?.id;
  const sessionTenantId = (session?.user as any)?.tenantId;

  useEffect(() => {
    // If we have tenantId in the session, use it!
    if (sessionTenantId) {
      setDbTenantId(sessionTenantId);
      setProfileLoading(false);
      return;
    }

    // If session doesn't have it (or it's stale), fetch from database profile API
    if (userId) {
      fetch("/api/tenant/profile")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (data?.tenant?.id) {
            setDbTenantId(data.tenant.id);
          }
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    } else {
      setProfileLoading(false);
    }
  }, [userId, sessionTenantId]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    photoUrl: "",
    priority: "NORMAL",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dbTenantId) {
      toast.error("No active room assignment found. Cannot submit request.");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a service category");
      return;
    }
    if (!form.title || !form.description) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: dbTenantId, category: selectedCategory, ...form }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      toast.success("Request submitted! We'll respond soon. 🔧");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  if (profileLoading) {
    return (
      <AppLayout role="TENANT" title="Maintenance Request" subtitle="Request household services">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "700px", margin: "0 auto" }}>
          <div className="shimmer" style={{ height: "180px", borderRadius: "14px" }} />
          <div className="shimmer" style={{ height: "450px", borderRadius: "14px" }} />
        </div>
      </AppLayout>
    );
  }

  if (!dbTenantId) {
    return (
      <AppLayout role="TENANT" title="Maintenance Request" subtitle="Request household services">
        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
          <div className="glass-card" style={{
            padding: "36px",
            border: "1px solid rgba(245,158,11,0.25)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)",
            textAlign: "center",
          }}>
            <div style={{
              width: "64px", height: "64px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0", marginBottom: "12px" }}>
              Room Assignment Pending
            </h2>
            <p style={{ color: "rgba(226,232,240,0.55)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              Your account has been registered, but you have not been assigned to a room yet. Please contact the administrator to assign your room. Once assigned, you will be able to file maintenance requests.
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "10px", padding: "12px", fontSize: "14px", color: "rgba(226,232,240,0.7)"
            }}>
              <Phone size={16} color="#14B8A6" />
              <span>Contact Landlord: <strong>+91 6392651108</strong> (Atul Tiwari)</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (submitted) {
    return (
      <AppLayout role="TENANT" title="Maintenance" subtitle="Request services">
        <div style={{ maxWidth: "500px", margin: "60px auto", textAlign: "center" }}>
          <div className="glass-card" style={{ padding: "48px" }}>
            <div style={{ width: "80px", height: "80px", background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "10px" }}>Request Submitted!</h2>
            <p style={{ color: "rgba(226,232,240,0.5)", marginBottom: "24px", fontSize: "14px" }}>
              Your maintenance request has been sent to the admin. You'll receive an update via WhatsApp shortly.
            </p>
            <button className="btn-primary" onClick={() => { setSubmitted(false); setSelectedCategory(""); setForm({ title: "", description: "", photoUrl: "", priority: "NORMAL" }); }} style={{ width: "100%", justifyContent: "center" }}>
              Submit Another Request
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="TENANT" title="Maintenance Request" subtitle="Request household services">
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {/* Category selection */}
        <div style={{ marginBottom: "28px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px", color: "rgba(226,232,240,0.7)" }}>
            Select Service Type
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "20px 12px",
                  background: selectedCategory === cat.id ? `${cat.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedCategory === cat.id ? cat.color + "50" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "center",
                  transform: selectedCategory === cat.id ? "scale(1.03)" : "scale(1)",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{cat.emoji}</div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: selectedCategory === cat.id ? cat.color : "rgba(226,232,240,0.7)" }}>
                  {cat.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="form-label">Issue Title *</label>
              <input
                className="form-input"
                placeholder={
                  selectedCategory === "PLUMBING" ? "e.g. Bathroom tap leaking" :
                  selectedCategory === "ELECTRICIAN" ? "e.g. Power socket not working" :
                  selectedCategory === "CARPENTER" ? "e.g. Door hinge broken" :
                  "Brief title of the issue"
                }
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">Detailed Description *</label>
              <textarea
                className="form-input"
                placeholder="Please describe the issue in detail — when did it start, what exactly is the problem, etc."
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: "vertical" }}
                required
              />
            </div>

            <div>
              <label className="form-label">Priority Level</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "LOW", label: "Low", color: "#6b7280" },
                  { value: "NORMAL", label: "Normal", color: "#3b82f6" },
                  { value: "HIGH", label: "High", color: "#f59e0b" },
                  { value: "CRITICAL", label: "Critical 🚨", color: "#ef4444" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p.value })}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "8px",
                      border: `1px solid ${form.priority === p.value ? p.color + "50" : "var(--glass-border)"}`,
                      background: form.priority === p.value ? `${p.color}15` : "transparent",
                      color: form.priority === p.value ? p.color : "rgba(226,232,240,0.4)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "12px",
                      transition: "all 0.2s",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <ImageUpload
              value={form.photoUrl}
              onChange={(url) => setForm({ ...form, photoUrl: url })}
              label="Photo Attachment (Optional)"
              placeholder="Take a photo of the issue or upload"
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "14px", marginTop: "10px" }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
